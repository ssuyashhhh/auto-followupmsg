import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import CampaignStatus


class CampaignCreate(BaseModel):
    name: str
    description: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: CampaignStatus | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: CampaignStatus
    total_contacts: int
    messages_generated: int
    messages_sent: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignResponse]
    total: int
