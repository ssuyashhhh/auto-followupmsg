import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.upload import Upload
from app.models.user import User
from app.schemas.message import UploadListResponse, UploadResponse
from app.services.upload_service import UploadServiceError, process_upload
from app.utils.auth import get_current_user

router = APIRouter()


@router.post(
    "/campaign/{campaign_id}",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    campaign_id: uuid.UUID,
    file: UploadFile = File(..., description="CSV, TXT, or Excel file containing contacts"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a contact file to a campaign.

    Accepts CSV, TXT (tab-separated), and Excel (.xlsx/.xls) files.
    Maximum file size: configured via MAX_FILE_SIZE_MB (default 10MB).

    The file is validated, stored in Supabase Storage, and an async
    parsing task is dispatched to extract contacts.

    Returns the upload record with status 'pending'. Poll GET /{upload_id}
    to track parsing progress.
    """
    # Read file content into memory
    content = await file.read()

    try:
        result = await process_upload(
            filename=file.filename or "unknown",
            content=content,
            content_type=file.content_type,
            campaign_id=campaign_id,
            user_id=current_user.id,
            db=db,
        )
    except UploadServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return result.upload


@router.get("/campaign/{campaign_id}", response_model=UploadListResponse)
async def list_uploads(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all uploads for a campaign, ordered by most recent first."""
    result = await db.execute(
        select(Upload)
        .where(Upload.campaign_id == campaign_id, Upload.user_id == current_user.id)
        .order_by(Upload.created_at.desc())
    )
    uploads = list(result.scalars().all())
    return UploadListResponse(uploads=uploads, total=len(uploads))  # pyright: ignore[reportArgumentType]


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get upload status and details.

    Use this endpoint to poll for parsing progress:
    - pending: Waiting in queue
    - processing: File is being parsed
    - completed: All contacts extracted successfully
    - failed: Error during parsing (check error_message)
    """
    result = await db.execute(
        select(Upload).where(
            Upload.id == upload_id, Upload.user_id == current_user.id
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


@router.get("/{upload_id}/stats")
async def get_upload_stats(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed parsing stats for an upload."""
    result = await db.execute(
        select(Upload).where(
            Upload.id == upload_id, Upload.user_id == current_user.id
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    return {
        "upload_id": upload.id,
        "status": upload.status.value,
        "original_filename": upload.original_filename,
        "file_type": upload.file_type,
        "file_size_bytes": upload.file_size_bytes,
        "file_size_mb": round(upload.file_size_bytes / (1024 * 1024), 2),
        "row_count": upload.row_count,
        "parsed_count": upload.parsed_count,
        "failed_count": upload.failed_count,
        "success_rate": (
            round(upload.parsed_count / upload.row_count * 100, 1)
            if upload.row_count and upload.row_count > 0
            else None
        ),
        "error_message": upload.error_message,
    }
