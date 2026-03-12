"""AI message generation Celery tasks."""

import logging
import uuid

from sqlalchemy import select

from app.database import get_sync_db
from app.models.contact import Contact
from app.models.enums import ContactStatus, MessageType
from app.services.ai_generator import GenerationError
from app.services.message_service import (
    generate_message_for_contact,
    get_previous_message_content,
    update_campaign_message_count,
)
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_messages_for_campaign(
    self,
    user_id: str,
    campaign_id: str,
    contact_ids: list[str],
    message_type: str,
    model: str | None = None,
    template_id: str | None = None,
):
    """
    Generate AI messages for a batch of contacts in a campaign.

    Processes contacts sequentially to respect API rate limits.
    On retryable AI errors, re-raises for Celery retry.
    Non-retryable errors are logged and skipped.
    """
    uid = uuid.UUID(user_id)
    cid = uuid.UUID(campaign_id)
    msg_type = MessageType(message_type)
    tmpl_id = uuid.UUID(template_id) if template_id else None

    logger.info(
        "Starting generation: campaign=%s type=%s contacts=%d model=%s",
        campaign_id, message_type, len(contact_ids), model,
    )

    generated_count = 0
    failed_count = 0

    with get_sync_db() as db:
        for idx, cid_str in enumerate(contact_ids):
            contact_uuid = uuid.UUID(cid_str)

            # Load contact
            contact = db.execute(
                select(Contact).where(
                    Contact.id == contact_uuid,
                    Contact.user_id == uid,
                )
            ).scalar_one_or_none()

            if not contact:
                logger.warning("Contact %s not found, skipping", cid_str)
                failed_count += 1
                continue

            # Get previous message for follow-ups
            previous_message = None
            if msg_type != MessageType.COLD_OUTREACH:
                previous_message = get_previous_message_content(
                    db, contact.id, msg_type
                )

            # Generate message
            message = generate_message_for_contact(
                db=db,
                contact=contact,
                user_id=uid,
                campaign_id=cid,
                message_type=msg_type,
                model=model,
                template_id=tmpl_id,
                previous_message=previous_message,
            )

            if message:
                # Update contact status
                contact.status = ContactStatus.MESSAGE_GENERATED
                generated_count += 1
                # Commit each message individually so partial progress is saved
                db.commit()
                logger.info(
                    "Generated message %d/%d for contact=%s",
                    idx + 1, len(contact_ids), cid_str,
                )
            else:
                failed_count += 1
                db.rollback()
                logger.warning(
                    "Failed to generate message for contact=%s", cid_str
                )

        # Update campaign counter
        if generated_count > 0:
            update_campaign_message_count(db, cid, generated_count)
            db.commit()

    logger.info(
        "Generation complete: campaign=%s generated=%d failed=%d",
        campaign_id, generated_count, failed_count,
    )

    return {
        "campaign_id": campaign_id,
        "message_type": message_type,
        "generated": generated_count,
        "failed": failed_count,
        "total": len(contact_ids),
    }


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def regenerate_single_message(
    self,
    user_id: str,
    contact_id: str,
    campaign_id: str,
    message_type: str,
    model: str | None = None,
    prompt_template_id: str | None = None,
):
    """
    Regenerate a message for a single contact.

    Creates a new version, deactivating the previous one.
    """
    uid = uuid.UUID(user_id)
    ctid = uuid.UUID(contact_id)
    cid = uuid.UUID(campaign_id)
    msg_type = MessageType(message_type)
    tmpl_id = uuid.UUID(prompt_template_id) if prompt_template_id else None

    logger.info(
        "Regenerating message: contact=%s type=%s model=%s",
        contact_id, message_type, model,
    )

    with get_sync_db() as db:
        contact = db.execute(
            select(Contact).where(
                Contact.id == ctid,
                Contact.user_id == uid,
            )
        ).scalar_one_or_none()

        if not contact:
            logger.error("Contact %s not found for regeneration", contact_id)
            return {"error": "Contact not found"}

        previous_message = None
        if msg_type != MessageType.COLD_OUTREACH:
            previous_message = get_previous_message_content(
                db, contact.id, msg_type
            )

        message = generate_message_for_contact(
            db=db,
            contact=contact,
            user_id=uid,
            campaign_id=cid,
            message_type=msg_type,
            model=model,
            template_id=tmpl_id,
            previous_message=previous_message,
        )

        if not message:
            logger.error("Regeneration failed for contact=%s", contact_id)
            try:
                self.retry()
            except self.MaxRetriesExceededError:
                return {"error": "Generation failed after retries"}

        db.commit()

    logger.info("Regenerated message for contact=%s version=%d", contact_id, message.version)
    return {
        "contact_id": contact_id,
        "message_id": str(message.id),
        "version": message.version,
    }


@celery_app.task
def process_scheduled_followups():
    """
    Periodic task (Celery Beat): scan all active campaigns for
    contacts due for follow-ups and dispatch generation tasks.

    Runs every 5 minutes via beat_schedule config.
    """
    from app.services.followup_service import (
        PREREQUISITE_TYPE,
        get_active_campaigns_sync,
        get_contacts_due_for_followup,
    )

    logger.info("Checking for scheduled follow-ups...")

    total_dispatched = 0

    with get_sync_db() as db:
        campaigns = get_active_campaigns_sync(db)
        logger.info("Found %d active campaigns", len(campaigns))

        for campaign in campaigns:
            for followup_type in PREREQUISITE_TYPE:
                contacts = get_contacts_due_for_followup(
                    db, campaign.id, followup_type
                )
                if not contacts:
                    continue

                contact_ids = [str(c.id) for c in contacts]
                logger.info(
                    "Dispatching %s for %d contacts in campaign=%s",
                    followup_type.value,
                    len(contact_ids),
                    campaign.id,
                )

                # Dispatch as a bulk generation task
                generate_messages_for_campaign.delay(
                    user_id=str(campaign.user_id),
                    campaign_id=str(campaign.id),
                    contact_ids=contact_ids,
                    message_type=followup_type.value,
                )
                total_dispatched += len(contact_ids)

    logger.info("Follow-up check complete: dispatched %d messages", total_dispatched)
    return {"dispatched": total_dispatched}
