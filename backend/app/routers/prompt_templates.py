import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.enums import MessageType
from app.models.user import User
from app.schemas.prompt_template import (
    PromptPreviewRequest,
    PromptPreviewResponse,
    PromptTemplateCreate,
    PromptTemplateListResponse,
    PromptTemplateResponse,
    PromptTemplateUpdate,
)
from app.services import prompt_service
from app.services.prompt_service import extract_variables, render_template, validate_template
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(template) -> PromptTemplateResponse:
    """Convert ORM model to response with extracted variables."""
    variables = sorted(
        extract_variables(template.system_prompt) | extract_variables(template.user_prompt)
    )
    return PromptTemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        message_type=template.message_type,
        system_prompt=template.system_prompt,
        user_prompt=template.user_prompt,
        is_default=template.is_default,
        is_system=template.is_system,
        variables=variables,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("/", response_model=PromptTemplateListResponse)
async def list_templates(
    message_type: MessageType | None = Query(None, description="Filter by message type"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all prompt templates (user's + system defaults)."""
    templates = await prompt_service.list_templates(db, current_user.id, message_type)
    return PromptTemplateListResponse(
        templates=[_to_response(t) for t in templates],
        total=len(templates),
    )


@router.get("/{template_id}", response_model=PromptTemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific prompt template."""
    template = await prompt_service.get_template_by_id(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _to_response(template)


@router.post("/", response_model=PromptTemplateResponse, status_code=201)
async def create_template(
    data: PromptTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a custom prompt template."""
    template = await prompt_service.create_template(
        db=db,
        user_id=current_user.id,
        name=data.name,
        message_type=data.message_type,
        system_prompt=data.system_prompt,
        user_prompt=data.user_prompt,
        is_default=data.is_default,
    )
    return _to_response(template)


@router.patch("/{template_id}", response_model=PromptTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: PromptTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a custom prompt template. System templates cannot be modified."""
    try:
        template = await prompt_service.update_template(
            db=db,
            template_id=template_id,
            user_id=current_user.id,
            update_data=data.model_dump(exclude_unset=True),
        )
        return _to_response(template)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom prompt template. System templates cannot be deleted."""
    deleted = await prompt_service.delete_template(db, template_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found or is a system template")


@router.post("/preview", response_model=PromptPreviewResponse)
async def preview_template(
    data: PromptPreviewRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Preview how a template renders with sample variables.

    Useful for testing templates before saving.
    """
    rendered_system = render_template(data.system_prompt, data.variables)
    rendered_user = render_template(data.user_prompt, data.variables)
    warnings = validate_template(data.system_prompt, data.user_prompt)

    return PromptPreviewResponse(
        rendered_system_prompt=rendered_system,
        rendered_user_prompt=rendered_user,
        warnings=warnings,
    )
