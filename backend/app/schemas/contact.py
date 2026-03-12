import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import ContactStatus


class ContactResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    upload_id: uuid.UUID | None
    full_name: str
    email: str | None
    linkedin_url: str | None
    company: str | None
    role: str | None
    notes: str | None
    status: ContactStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    contacts: list[ContactResponse]
    total: int
    has_more: bool = False


class ContactUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    linkedin_url: str | None = None
    company: str | None = None
    role: str | None = None
    notes: str | None = None


class BulkStatusUpdateRequest(BaseModel):
    contact_ids: list[uuid.UUID]
    status: ContactStatus


class BulkDeleteRequest(BaseModel):
    contact_ids: list[uuid.UUID]


class BulkOperationResponse(BaseModel):
    affected_count: int
    message: str


class ContactStatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
