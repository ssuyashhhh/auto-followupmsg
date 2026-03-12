import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.enums import MessageType


class PromptTemplateCreate(BaseModel):
    name: str
    message_type: MessageType
    system_prompt: str
    user_prompt: str
    is_default: bool = False

    @field_validator("system_prompt", "user_prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Prompt cannot be empty")
        return v.strip()


class PromptTemplateUpdate(BaseModel):
    name: str | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    is_default: bool | None = None


class PromptTemplateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    name: str
    message_type: MessageType
    system_prompt: str
    user_prompt: str
    is_default: bool
    is_system: bool
    variables: list[str]  # Extracted {{variable}} names
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptTemplateListResponse(BaseModel):
    templates: list[PromptTemplateResponse]
    total: int


class PromptPreviewRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    variables: dict[str, str | None] = {
        "name": "John Smith",
        "company": "Acme Corp",
        "role": "VP of Engineering",
        "linkedin_url": "https://linkedin.com/in/johnsmith",
        "email": "john@acme.com",
    }


class PromptPreviewResponse(BaseModel):
    rendered_system_prompt: str
    rendered_user_prompt: str
    warnings: list[str]
