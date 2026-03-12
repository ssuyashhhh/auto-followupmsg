"""File parsing Celery tasks."""

import logging
import uuid

import httpx
from sqlalchemy import select, update

from app.config import settings
from app.database import get_sync_db
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.enums import UploadStatus
from app.models.upload import Upload
from app.services.file_parser import ParsedContact, parse_file
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _download_file_sync(storage_path: str) -> bytes:
    """Synchronous file download for use in Celery tasks."""
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{storage_path}"
    with httpx.Client(timeout=120.0) as client:
        response = client.get(
            url,
            headers={"Authorization": f"Bearer {settings.supabase_key}"},
        )
        response.raise_for_status()
    return response.content


def _create_contacts_batch(
    db,
    contacts: list[ParsedContact],
    user_id: uuid.UUID,
    campaign_id: uuid.UUID,
    upload_id: uuid.UUID,
    batch_size: int = 100,
) -> int:
    """Insert contacts in batches. Returns count of successfully inserted contacts."""
    inserted = 0

    for i in range(0, len(contacts), batch_size):
        batch = contacts[i : i + batch_size]
        contact_objects = []

        for parsed in batch:
            contact = Contact(
                user_id=user_id,
                campaign_id=campaign_id,
                upload_id=upload_id,
                full_name=parsed.full_name,
                email=parsed.email,
                linkedin_url=parsed.linkedin_url,
                company=parsed.company,
                role=parsed.role,
                notes=parsed.notes,
                raw_data=parsed.raw_data,
            )
            contact_objects.append(contact)

        db.add_all(contact_objects)

        try:
            db.flush()
            inserted += len(contact_objects)
        except Exception as e:
            db.rollback()
            # Fall back to one-by-one insertion to skip duplicates
            logger.warning("Batch insert failed, falling back to individual inserts: %s", e)
            for contact in contact_objects:
                try:
                    db.add(contact)
                    db.flush()
                    inserted += 1
                except Exception:
                    db.rollback()
                    logger.debug("Skipped duplicate contact: %s", contact.full_name)

    return inserted


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def parse_uploaded_file(self, upload_id: str):
    """
    Parse an uploaded file and create contact records.

    Pipeline:
    1. Load Upload record, mark as 'processing'
    2. Download file from Supabase Storage
    3. Parse file (CSV/TXT/Excel) → extract contacts
    4. Batch-insert Contact records
    5. Update Upload record with counts
    6. Update Campaign contact counter
    """
    logger.info("Starting parse task for upload %s", upload_id)

    with get_sync_db() as db:
        # 1. Load upload record
        upload = db.execute(
            select(Upload).where(Upload.id == uuid.UUID(upload_id))
        ).scalar_one_or_none()

        if not upload:
            logger.error("Upload %s not found", upload_id)
            return {"error": "Upload not found"}

        # Mark as processing
        upload.status = UploadStatus.PROCESSING
        db.flush()

        try:
            # 2. Download file
            logger.info("Downloading file: %s", upload.storage_path)
            content = _download_file_sync(upload.storage_path)

            # 3. Parse file
            logger.info("Parsing %s file (%d bytes)", upload.file_type, len(content))
            result = parse_file(content, upload.file_type)

            # Update row count
            upload.row_count = result.total_rows

            if result.parsed_count == 0:
                upload.status = UploadStatus.FAILED
                upload.error_message = "; ".join(result.errors[:5]) or "No contacts could be parsed"
                upload.failed_count = result.failed_count
                db.flush()
                logger.warning("Parse failed for upload %s: %s", upload_id, upload.error_message)
                return {
                    "upload_id": upload_id,
                    "status": "failed",
                    "errors": result.errors[:5],
                }

            # 4. Create contacts in batches
            logger.info("Inserting %d contacts for upload %s", result.parsed_count, upload_id)
            inserted_count = _create_contacts_batch(
                db=db,
                contacts=result.contacts,
                user_id=upload.user_id,
                campaign_id=upload.campaign_id,
                upload_id=upload.id,
            )

            # 5. Update upload record
            upload.parsed_count = inserted_count
            upload.failed_count = result.total_rows - inserted_count
            upload.status = UploadStatus.COMPLETED
            if result.errors:
                upload.error_message = f"{len(result.errors)} rows had issues: {'; '.join(result.errors[:3])}"

            # 6. Update campaign contact counter
            db.execute(
                update(Campaign)
                .where(Campaign.id == upload.campaign_id)
                .values(total_contacts=Campaign.total_contacts + inserted_count)
            )

            db.flush()

            logger.info(
                "Parse complete for upload %s: %d/%d contacts inserted",
                upload_id, inserted_count, result.total_rows,
            )

            return {
                "upload_id": upload_id,
                "status": "completed",
                "total_rows": result.total_rows,
                "inserted": inserted_count,
                "failed": result.total_rows - inserted_count,
                "column_mapping": result.column_mapping,
            }

        except httpx.HTTPError as e:
            logger.error("Storage download failed for upload %s: %s", upload_id, e)
            upload.status = UploadStatus.FAILED
            upload.error_message = f"Failed to download file from storage: {str(e)}"
            db.flush()
            # Retry on transient storage errors
            raise self.retry(exc=e)

        except Exception as e:
            logger.exception("Unexpected error parsing upload %s", upload_id)
            upload.status = UploadStatus.FAILED
            upload.error_message = f"Parse error: {str(e)}"
            db.flush()
            return {"upload_id": upload_id, "status": "failed", "error": str(e)}
