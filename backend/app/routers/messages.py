import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contact import Contact
from app.models.enums import ContactStatus, MessageType
from app.models.user import User
from app.schemas.message import (
    GenerationStatsResponse,
    GenerationTaskResponse,
    MessageGenerateBulkRequest,
    MessageListResponse,
    MessageRegenerateRequest,
    MessageResponse,
)
from app.services import message_service
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/campaign/{campaign_id}", response_model=MessageListResponse)
async def list_messages(
    campaign_id: uuid.UUID,
    message_type: MessageType | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List messages for a campaign with optional type filter."""
    messages, total = await message_service.list_campaign_messages(
        db, campaign_id, current_user.id, message_type, active_only, skip, limit
    )
    return MessageListResponse(messages=messages, total=total)


@router.get("/campaign/{campaign_id}/stats", response_model=GenerationStatsResponse)
async def get_generation_stats(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get message generation statistics for a campaign."""
    stats = await message_service.get_campaign_generation_stats(
        db, campaign_id, current_user.id
    )
    return GenerationStatsResponse(**stats)


@router.get("/contact/{contact_id}", response_model=MessageListResponse)
async def list_contact_messages(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages (all versions) for a specific contact."""
    messages = await message_service.list_contact_messages(
        db, contact_id, current_user.id
    )
    return MessageListResponse(messages=messages, total=len(messages))


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific message."""
    message = await message_service.get_message(db, message_id, current_user.id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.post("/generate", response_model=GenerationTaskResponse, status_code=202)
async def generate_messages_bulk(
    data: MessageGenerateBulkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger bulk AI message generation for contacts in a campaign.

    Dispatches a Celery task that processes each contact asynchronously.
    Returns a task ID for tracking progress.

    - For cold_outreach: generates for all contacts with status 'new'
    - For follow-ups: generates for contacts with a previous message in the chain
    """
    from sqlalchemy import select

    # Determine which contacts to generate for
    query = select(Contact.id).where(
        Contact.campaign_id == data.campaign_id,
        Contact.user_id == current_user.id,
    )

    if data.message_type == MessageType.COLD_OUTREACH:
        # Only contacts that haven't been messaged yet
        query = query.where(Contact.status == ContactStatus.NEW)
    else:
        # Follow-ups: contacts that already got the previous message
        query = query.where(
            Contact.status.in_([
                ContactStatus.MESSAGE_GENERATED,
                ContactStatus.MESSAGE_SENT,
            ])
        )

    result = await db.execute(query)
    contact_ids = [str(row[0]) for row in result.all()]

    if not contact_ids:
        raise HTTPException(
            status_code=422,
            detail="No eligible contacts found for this message type. Please upload contacts to the campaign first.",
        )

    # Dispatch Celery task
    from app.tasks.ai_tasks import generate_messages_for_campaign

    task = generate_messages_for_campaign.delay(
        user_id=str(current_user.id),
        campaign_id=str(data.campaign_id),
        contact_ids=contact_ids,
        message_type=data.message_type.value,
        model=data.model,
        template_id=str(data.prompt_template_id) if data.prompt_template_id else None,
    )

    return GenerationTaskResponse(
        task_id=task.id,
        contact_count=len(contact_ids),
        message_type=data.message_type.value,
        message=f"Generating {data.message_type.value} messages for {len(contact_ids)} contacts",
    )


@router.post("/regenerate", response_model=GenerationTaskResponse, status_code=202)
async def regenerate_message(
    data: MessageRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Regenerate a message for a single contact.

    Creates a new version of the message, deactivating the previous one.
    Optionally specify a different model or template.
    """
    # Verify contact belongs to user
    from sqlalchemy import select

    result = await db.execute(
        select(Contact).where(
            Contact.id == data.contact_id,
            Contact.user_id == current_user.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    from app.tasks.ai_tasks import regenerate_single_message

    task = regenerate_single_message.delay(
        user_id=str(current_user.id),
        contact_id=str(data.contact_id),
        campaign_id=str(data.campaign_id),
        message_type=data.message_type.value,
        model=data.model,
        prompt_template_id=str(data.prompt_template_id) if data.prompt_template_id else None,
    )

    return GenerationTaskResponse(
        task_id=task.id,
        contact_count=1,
        message_type=data.message_type.value,
        message=f"Regenerating {data.message_type.value} message for contact",
    )


@router.get("/campaign/{campaign_id}/followup-stats")
async def get_followup_stats(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get follow-up scheduling stats — which contacts are due for each follow-up type."""
    from app.services.followup_service import get_followup_schedule_stats

    return await get_followup_schedule_stats(db, campaign_id, current_user.id)
