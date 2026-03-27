"""
Message service — CRUD and generation orchestration for AI-generated messages.

Handles:
- Creating/reading/listing messages (async for FastAPI)
- Building prompts and generating messages (sync for Celery)
- Version management (new version → deactivate previous)
- Campaign counter updates
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.enums import MessageStatus, MessageType
from app.models.message import Message
from app.services.ai_generator import (
    GenerationResult,
)

logger = logging.getLogger(__name__)


# ============================================
# Async operations (FastAPI)
# ============================================

async def get_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Message | None:
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_campaign_messages(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
    message_type: MessageType | None = None,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Message], int]:
    """List messages for a campaign with optional filtering."""
    base = select(Message).where(
        Message.campaign_id == campaign_id,
        Message.user_id == user_id,
    )
    if message_type:
        base = base.where(Message.message_type == message_type)
    if active_only:
        base = base.where(Message.is_active.is_(True))

    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(Message.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def list_contact_messages(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[Message]:
    """Get all message versions for a contact."""
    result = await db.execute(
        select(Message)
        .where(Message.contact_id == contact_id, Message.user_id == user_id)
        .order_by(Message.message_type, Message.version.desc())
    )
    return list(result.scalars().all())


async def get_campaign_generation_stats(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """Get message generation statistics for a campaign."""
    result = await db.execute(
        select(
            Message.message_type,
            Message.status,
            func.count(Message.id),
        )
        .where(
            Message.campaign_id == campaign_id,
            Message.user_id == user_id,
            Message.is_active.is_(True),
        )
        .group_by(Message.message_type, Message.status)
    )
    rows = result.all()

    stats: dict = {"total": 0, "by_type": {}, "by_status": {}}
    for msg_type, status, count in rows:
        stats["total"] += count
        stats["by_type"].setdefault(msg_type.value, 0)
        stats["by_type"][msg_type.value] += count
        stats["by_status"].setdefault(status.value, 0)
        stats["by_status"][status.value] += count

    return stats


# ============================================
# Sync operations (Celery tasks)
# ============================================

def _get_next_version(
    db: Session,
    contact_id: uuid.UUID,
    message_type: MessageType,
) -> int:
    """Get the next version number for a contact's message type."""
    result = db.execute(
        select(func.max(Message.version)).where(
            Message.contact_id == contact_id,
            Message.message_type == message_type,
        )
    )
    current_max = result.scalar_one_or_none()
    return (current_max or 0) + 1


def _deactivate_previous_versions(
    db: Session,
    contact_id: uuid.UUID,
    message_type: MessageType,
) -> None:
    """Mark all previous versions of this message type as inactive."""
    db.execute(
        update(Message)
        .where(
            Message.contact_id == contact_id,
            Message.message_type == message_type,
            Message.is_active.is_(True),
        )
        .values(is_active=False)
    )


def build_prompts_for_contact(
    db: Session,
    contact: Contact,
    user_id: uuid.UUID,
    message_type: MessageType,
    template_id: uuid.UUID | None = None,
    previous_message: str | None = None,
    template=None,
    user=None,
    custom_instructions: str | None = None,
) -> tuple[str, str, str] | None:
    """
    Build system and user prompts for a contact.

    No pre-built templates are used. The system prompt is built from
    contact context, and the user's custom_instructions become the
    only user prompt controlling generation behavior.

    Returns: (system_prompt, user_prompt, prompt_label)
    """
    if not user:
        from app.models.user import User

        user = db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()

    # --- Build system prompt with contact context ---
    msg_type_label = message_type.value.replace("_", " ").title()

    context_lines = [
        f"Contact Name: {contact.full_name}",
    ]
    if contact.company:
        context_lines.append(f"Company: {contact.company}")
    if contact.role:
        context_lines.append(f"Role: {contact.role}")
    if contact.email:
        context_lines.append(f"Email: {contact.email}")
    if contact.linkedin_url:
        context_lines.append(f"LinkedIn: {contact.linkedin_url}")
    if contact.notes:
        context_lines.append(f"Notes: {contact.notes}")
    if user and getattr(user, "full_name", None):
        context_lines.append(f"Sender Name: {user.full_name}")
    if user and getattr(user, "company", None):
        context_lines.append(f"Sender Company: {user.company}")
    if previous_message:
        context_lines.append(f"Previous Message:\n{previous_message}")

    contact_block = "\n".join(context_lines)

    system_prompt = (
        f"You are a professional AI assistant that writes personalized {msg_type_label} messages.\n"
        f"Use the following contact details to personalize the message.\n\n"
        f"{contact_block}\n\n"
        f"Write only the message body. Do not include a subject line unless asked. "
        f"Keep the tone professional and concise."
    )

    # --- User prompt is purely the user's instructions ---
    if custom_instructions and custom_instructions.strip():
        user_prompt = custom_instructions.strip()
    else:
        user_prompt = f"Write a professional {msg_type_label} message for this contact."

    prompt_label = "User Instructions"

    return system_prompt, user_prompt, prompt_label


def save_generated_message(
    db: Session,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
    campaign_id: uuid.UUID,
    message_type: MessageType,
    result: GenerationResult,
    template_name: str,
) -> Message:
    """Save the generated AI message to the database."""
    next_version = _get_next_version(db, contact_id, message_type)
    _deactivate_previous_versions(db, contact_id, message_type)

    message = Message(
        user_id=user_id,
        contact_id=contact_id,
        campaign_id=campaign_id,
        message_type=message_type,
        content=result.content,
        word_count=result.word_count,
        version=next_version,
        is_active=True,
        status=MessageStatus.GENERATED,
        ai_model=result.model,
        prompt_template=template_name,
        ai_metadata=result.metadata,
        generated_at=datetime.now(timezone.utc),
    )
    db.add(message)
    return message


def get_previous_message_content(
    db: Session,
    contact_id: uuid.UUID,
    message_type: MessageType,
) -> str | None:
    """Get the most recent active message content for follow-up context."""
    # For follow-ups, get the previous message in the chain
    type_order = [
        MessageType.COLD_OUTREACH,
        MessageType.FOLLOW_UP_1,
        MessageType.FOLLOW_UP_2,
        MessageType.FOLLOW_UP_3,
    ]

    try:
        current_idx = type_order.index(message_type)
    except ValueError:
        return None

    if current_idx == 0:
        return None

    previous_type = type_order[current_idx - 1]
    result = db.execute(
        select(Message.content).where(
            Message.contact_id == contact_id,
            Message.message_type == previous_type,
            Message.is_active.is_(True),
        ).order_by(Message.version.desc()).limit(1)
    )
    return result.scalar_one_or_none()


def update_campaign_message_count(
    db: Session,
    campaign_id: uuid.UUID,
    count: int,
) -> None:
    """Increment the messages_generated counter on a campaign."""
    db.execute(
        update(Campaign)
        .where(Campaign.id == campaign_id)
        .values(messages_generated=Campaign.messages_generated + count)
    )
