import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import MessageStatus, MessageType


class MessageResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    campaign_id: uuid.UUID
    message_type: MessageType
    content: str
    word_count: int
    version: int
    is_active: bool
    status: MessageStatus
    ai_model: str
    prompt_template: str | None = None
    ai_metadata: dict | None = None
    generated_at: datetime
    scheduled_at: datetime | None
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int


class MessageRegenerateRequest(BaseModel):
    contact_id: uuid.UUID
    campaign_id: uuid.UUID
    message_type: MessageType = MessageType.COLD_OUTREACH
    prompt_template_id: uuid.UUID | None = None
    model: str | None = Field(None, description="AI model override (e.g. gpt-4o, claude-3-5-sonnet-20241022)")


class MessageGenerateBulkRequest(BaseModel):
    campaign_id: uuid.UUID
    message_type: MessageType = MessageType.COLD_OUTREACH
    model: str | None = Field(None, description="AI model override")
    prompt_template_id: uuid.UUID | None = Field(None, description="Custom template to use")


class GenerationTaskResponse(BaseModel):
    task_id: str
    contact_count: int
    message_type: str
    message: str


class GenerationStatsResponse(BaseModel):
    total: int
    by_type: dict[str, int]
    by_status: dict[str, int]


class UploadResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    original_filename: str
    file_type: str
    file_size_bytes: int
    row_count: int | None
    parsed_count: int
    failed_count: int
    status: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadListResponse(BaseModel):
    uploads: list[UploadResponse]
    total: int
