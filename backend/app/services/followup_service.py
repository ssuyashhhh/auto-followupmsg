"""
Follow-up scheduling service.

Manages follow-up schedules for campaigns:
- Create follow-up schedules (delay after previous message)
- Query contacts due for follow-ups
- Process due follow-ups by dispatching AI generation
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.enums import CampaignStatus, ContactStatus, MessageStatus, MessageType
from app.models.message import Message

logger = logging.getLogger(__name__)

# Default delays between message types (in hours)
DEFAULT_FOLLOWUP_DELAYS = {
    MessageType.FOLLOW_UP_1: 72,    # 3 days after cold outreach
    MessageType.FOLLOW_UP_2: 120,   # 5 days after follow-up 1
    MessageType.FOLLOW_UP_3: 168,   # 7 days after follow-up 2
}

# Map each follow-up to the message type that must exist before it
PREREQUISITE_TYPE = {
    MessageType.FOLLOW_UP_1: MessageType.COLD_OUTREACH,
    MessageType.FOLLOW_UP_2: MessageType.FOLLOW_UP_1,
    MessageType.FOLLOW_UP_3: MessageType.FOLLOW_UP_2,
}


def get_contacts_due_for_followup(
    db: Session,
    campaign_id: uuid.UUID,
    followup_type: MessageType,
    delay_hours: int | None = None,
) -> list[Contact]:
    """
    Find contacts in a campaign that are due for a specific follow-up.

    A contact is due when:
    1. They have the prerequisite message (sent or generated)
    2. That message was generated at least `delay_hours` ago
    3. They don't already have the target follow-up type
    4. They haven't opted out or replied
    """
    if followup_type not in PREREQUISITE_TYPE:
        return []

    prereq_type = PREREQUISITE_TYPE[followup_type]
    delay = delay_hours or DEFAULT_FOLLOWUP_DELAYS.get(followup_type, 72)
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=delay)

    # Subquery: contacts who have the prerequisite message generated before cutoff
    has_prereq = (
        select(Message.contact_id)
        .where(
            Message.campaign_id == campaign_id,
            Message.message_type == prereq_type,
            Message.is_active.is_(True),
            Message.status.in_([MessageStatus.GENERATED, MessageStatus.APPROVED, MessageStatus.SENT]),
            Message.generated_at <= cutoff_time,
        )
    ).subquery()

    # Subquery: contacts who already have this follow-up type
    already_has = (
        select(Message.contact_id)
        .where(
            Message.campaign_id == campaign_id,
            Message.message_type == followup_type,
            Message.is_active.is_(True),
        )
    ).subquery()

    # Contacts due for follow-up
    result = db.execute(
        select(Contact)
        .where(
            Contact.campaign_id == campaign_id,
            Contact.id.in_(select(has_prereq.c.contact_id)),
            ~Contact.id.in_(select(already_has.c.contact_id)),
            Contact.status.notin_([
                ContactStatus.OPTED_OUT,
                ContactStatus.REPLIED,
            ]),
        )
    )
    return list(result.scalars().all())


def get_active_campaigns_sync(db: Session) -> list[Campaign]:
    """Get all active campaigns for follow-up processing."""
    result = db.execute(
        select(Campaign).where(Campaign.status == CampaignStatus.ACTIVE)
    )
    return list(result.scalars().all())


def schedule_followup_messages(
    db: Session,
    contact: Contact,
    campaign_id: uuid.UUID,
    followup_type: MessageType,
    scheduled_at: datetime | None = None,
) -> None:
    """Mark a contact as having a scheduled follow-up by updating status."""
    contact.status = ContactStatus.FOLLOW_UP_SCHEDULED
    db.flush()


# ============================================
# Async operations (FastAPI)
# ============================================

async def get_followup_schedule_stats(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """Get follow-up scheduling stats for a campaign."""
    stats: dict = {}

    for followup_type, prereq_type in PREREQUISITE_TYPE.items():
        delay = DEFAULT_FOLLOWUP_DELAYS[followup_type]
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=delay)

        # Count contacts with prerequisite ready
        prereq_count_result = await db.execute(
            select(Message.contact_id)
            .where(
                Message.campaign_id == campaign_id,
                Message.user_id == user_id,
                Message.message_type == prereq_type,
                Message.is_active.is_(True),
                Message.generated_at <= cutoff_time,
            )
        )
        ready_contacts = set(row[0] for row in prereq_count_result.all())

        # Count already generated
        already_result = await db.execute(
            select(Message.contact_id)
            .where(
                Message.campaign_id == campaign_id,
                Message.user_id == user_id,
                Message.message_type == followup_type,
                Message.is_active.is_(True),
            )
        )
        already_done = set(row[0] for row in already_result.all())

        due = ready_contacts - already_done

        stats[followup_type.value] = {
            "delay_hours": delay,
            "ready_count": len(ready_contacts),
            "already_generated": len(already_done),
            "due_count": len(due),
        }

    return stats
