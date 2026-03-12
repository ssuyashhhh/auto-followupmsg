import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Timeout: 30s connect, 120s read (large file uploads)
STORAGE_TIMEOUT = httpx.Timeout(connect=30.0, read=120.0, write=120.0, pool=30.0)


async def upload_file_to_storage(
    content: bytes,
    storage_path: str,
    content_type: str,
) -> str:
    """Upload file bytes to Supabase Storage and return the storage path.

    Args:
        content: Raw file bytes
        storage_path: Destination path in bucket (e.g., "user_id/campaign_id/file.csv")
        content_type: MIME type of the file

    Returns:
        The storage_path on success

    Raises:
        httpx.HTTPStatusError: If Supabase returns an error
    """
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{storage_path}"

    async with httpx.AsyncClient(timeout=STORAGE_TIMEOUT) as client:
        response = await client.post(
            url,
            content=content,
            headers={
                "Authorization": f"Bearer {settings.supabase_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
        response.raise_for_status()

    logger.info("Uploaded %d bytes to %s", len(content), storage_path)
    return storage_path


async def download_file_from_storage(storage_path: str) -> bytes:
    """Download file bytes from Supabase Storage.

    Args:
        storage_path: Path within the bucket

    Returns:
        Raw file bytes
    """
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{storage_path}"

    async with httpx.AsyncClient(timeout=STORAGE_TIMEOUT) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.supabase_key}"},
        )
        response.raise_for_status()

    logger.info("Downloaded %d bytes from %s", len(response.content), storage_path)
    return response.content


async def delete_file_from_storage(storage_path: str) -> None:
    """Delete a file from Supabase Storage."""
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}"

    async with httpx.AsyncClient(timeout=STORAGE_TIMEOUT) as client:
        response = await client.request(
            "DELETE",
            url,
            json={"prefixes": [storage_path]},
            headers={"Authorization": f"Bearer {settings.supabase_key}"},
        )
        response.raise_for_status()

    logger.info("Deleted %s from storage", storage_path)


def get_public_url(storage_path: str) -> str:
    """Generate a public URL for a stored file (if bucket is public)."""
    return f"{settings.supabase_url}/storage/v1/object/public/{settings.supabase_bucket}/{storage_path}"
