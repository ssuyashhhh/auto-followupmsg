"""Upload service — handles file validation, storage, and record creation."""

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.campaign import Campaign
from app.models.enums import UploadStatus
from app.models.upload import Upload
from app.utils.storage import upload_file_to_storage


ALLOWED_EXTENSIONS: set[str] = {"csv", "txt", "xlsx", "xls"}

# Map extensions to acceptable MIME types
MIME_TYPE_MAP: dict[str, set[str]] = {
    "csv": {
        "text/csv",
        "text/plain",
        "application/csv",
        "application/vnd.ms-excel",
    },
    "txt": {
        "text/plain",
        "text/tab-separated-values",
    },
    "xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
    },
    "xls": {
        "application/vnd.ms-excel",
        "application/octet-stream",
    },
}

MAX_FILE_SIZE_BYTES: int = settings.max_file_size_mb * 1024 * 1024


@dataclass
class FileValidationResult:
    """Result of file validation."""
    is_valid: bool
    extension: str
    file_size: int
    content: bytes
    error: str | None = None


@dataclass
class UploadResult:
    """Result of a complete upload operation."""
    upload: Upload
    task_id: str


class UploadServiceError(Exception):
    """Custom exception for upload service errors."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def validate_file_extension(filename: str) -> str:
    """Extract and validate file extension. Returns lowercase extension."""
    if not filename or "." not in filename:
        raise UploadServiceError("File must have a valid extension")

    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadServiceError(
            f"File type '.{ext}' not allowed. Allowed types: {', '.join(f'.{e}' for e in sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext


def validate_mime_type(extension: str, content_type: str | None) -> None:
    """Validate that the MIME type matches the file extension."""
    if not content_type:
        return  # Allow if MIME type is not provided (some clients don't send it)

    allowed_mimes = MIME_TYPE_MAP.get(extension, set())
    if content_type not in allowed_mimes:
        raise UploadServiceError(
            f"MIME type '{content_type}' does not match file extension '.{extension}'"
        )


def validate_file_content(content: bytes, extension: str) -> None:
    """Validate that the file content is not empty and within size limits."""
    if len(content) == 0:
        raise UploadServiceError("File is empty")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise UploadServiceError(
            f"File too large ({len(content) / 1024 / 1024:.1f}MB). Maximum: {settings.max_file_size_mb}MB",
            status_code=413,
        )

    # Quick sanity check: CSV/TXT files should be decodable as text
    if extension in ("csv", "txt"):
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
            except UnicodeDecodeError:
                raise UploadServiceError(
                    "File content is not valid text. Ensure the file is UTF-8 or Latin-1 encoded."
                )

    # Quick sanity check: Excel files should start with correct magic bytes
    if extension == "xlsx" and not content[:4] == b"PK\x03\x04":
        raise UploadServiceError(
            "File does not appear to be a valid Excel (.xlsx) file"
        )

    if extension == "xls" and not content[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        raise UploadServiceError(
            "File does not appear to be a valid Excel (.xls) file"
        )


async def validate_file(
    filename: str,
    content: bytes,
    content_type: str | None,
) -> FileValidationResult:
    """Run all file validations and return result."""
    try:
        ext = validate_file_extension(filename)
        validate_mime_type(ext, content_type)
        validate_file_content(content, ext)
        return FileValidationResult(
            is_valid=True,
            extension=ext,
            file_size=len(content),
            content=content,
        )
    except UploadServiceError as e:
        return FileValidationResult(
            is_valid=False,
            extension="",
            file_size=len(content),
            content=content,
            error=e.detail,
        )


async def verify_campaign_ownership(
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Campaign:
    """Verify user owns the campaign. Raises UploadServiceError if not found."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id, Campaign.user_id == user_id
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise UploadServiceError("Campaign not found", status_code=404)
    return campaign


async def store_file(
    content: bytes,
    user_id: uuid.UUID,
    campaign_id: uuid.UUID,
    extension: str,
    content_type: str,
) -> str:
    """Upload file to Supabase Storage and return the storage path."""
    # Path: {user_id}/{campaign_id}/{unique_file_id}.{ext}
    storage_path = f"{user_id}/{campaign_id}/{uuid.uuid4()}.{extension}"

    try:
        await upload_file_to_storage(content, storage_path, content_type)
    except Exception as e:
        raise UploadServiceError(
            f"Failed to upload file to storage: {str(e)}",
            status_code=502,
        )

    return storage_path


async def create_upload_record(
    db: AsyncSession,
    user_id: uuid.UUID,
    campaign_id: uuid.UUID,
    original_filename: str,
    storage_path: str,
    file_type: str,
    file_size_bytes: int,
) -> Upload:
    """Create an Upload database record."""
    upload = Upload(
        user_id=user_id,
        campaign_id=campaign_id,
        original_filename=original_filename,
        storage_path=storage_path,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        status=UploadStatus.PENDING,
    )
    db.add(upload)
    await db.flush()
    await db.refresh(upload)
    return upload


async def process_upload(
    filename: str,
    content: bytes,
    content_type: str | None,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> UploadResult:
    """
    Full upload pipeline:
    1. Validate campaign ownership
    2. Validate file (extension, MIME, content, size)
    3. Upload to Supabase Storage
    4. Create Upload record in DB
    5. Dispatch async parsing task
    """
    # 1. Campaign check
    await verify_campaign_ownership(campaign_id, user_id, db)

    # 2. Validate file
    validation = await validate_file(filename, content, content_type)
    if not validation.is_valid:
        raise UploadServiceError(validation.error or "File validation failed")

    # 3. Store file
    storage_path = await store_file(
        content=content,
        user_id=user_id,
        campaign_id=campaign_id,
        extension=validation.extension,
        content_type=content_type or "application/octet-stream",
    )

    # 4. Create DB record
    upload = await create_upload_record(
        db=db,
        user_id=user_id,
        campaign_id=campaign_id,
        original_filename=filename,
        storage_path=storage_path,
        file_type=validation.extension,
        file_size_bytes=validation.file_size,
    )

    # 5. Dispatch parsing
    from app.tasks.parse_tasks import parse_uploaded_file

    task = parse_uploaded_file.delay(str(upload.id))  # pyright: ignore[reportFunctionMemberAccess]

    return UploadResult(upload=upload, task_id=task.id)
