"""AI message generation Celery tasks."""

import logging
import uuid

import asyncio
from sqlalchemy import select

from app.database import get_sync_db
from app.models.contact import Contact
from app.models.enums import ContactStatus, MessageType
from app.services.ai_generator import (
    GenerationError,
    generate_cold_message,
    generate_followup_message,
)
from app.services.message_service import (
    build_prompts_for_contact,
    save_generated_message,
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
    custom_instructions: str | None = None,
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

    generated_count: int = 0
    failed_count: int = 0

    tasks = []
    contact_data = []

    with get_sync_db() as db:
        from app.models.user import User

        user = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()

        contact_uuids = [uuid.UUID(cid_str) for cid_str in contact_ids]
        contacts = db.execute(
            select(Contact).where(
                Contact.id.in_(contact_uuids),
                Contact.user_id == uid,
            )
        ).scalars().all()
        contact_map = {str(c.id): c for c in contacts}

        for cid_str in contact_ids:
            contact = contact_map.get(cid_str)

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

            # Build prompts (no template lookup — uses user instructions directly)
            prompts = build_prompts_for_contact(
                db=db,
                contact=contact,
                user_id=uid,
                message_type=msg_type,
                previous_message=previous_message,
                user=user,
                custom_instructions=custom_instructions,
            )

            if prompts:
                system_prompt, user_prompt, template_name = prompts
                contact_data.append((contact.id, template_name, contact))
                if msg_type == MessageType.COLD_OUTREACH:
                    tasks.append((generate_cold_message, (system_prompt, user_prompt, model)))
                else:
                    tasks.append((generate_followup_message, (system_prompt, user_prompt, model)))
            else:
                failed_count += 1
                logger.warning("Failed to build prompts for contact=%s", cid_str)

    if tasks:
        logger.info("Awaiting %d parallel AI generation tasks...", len(tasks))
        async def _run_all():
            sem = asyncio.Semaphore(20)  # max 20 concurrent AI requests
            async def _run(func, args):
                async with sem:
                    return await func(*args)
            return await asyncio.gather(*[_run(f, a) for f, a in tasks], return_exceptions=True)
        results = asyncio.run(_run_all())
    else:
        results = []

    with get_sync_db() as db:
        for (contact_id, template_name, contact), result in zip(contact_data, results):
            if isinstance(result, BaseException):
                logger.error("AI generation failed for contact=%s with Exception: %s", contact_id, result)
                failed_count += 1
            elif isinstance(result, GenerationError) or hasattr(result, "error"):
                err_msg = getattr(result, "error", "Unknown")
                retry_flag = getattr(result, "retryable", False)
                logger.error("AI generation failed for contact=%s: %s (retryable=%s)", 
                             contact_id, err_msg, retry_flag)
                failed_count += 1
            else:
                save_generated_message(
                    db=db,
                    contact_id=contact_id,
                    user_id=uid,
                    campaign_id=cid,
                    message_type=msg_type,
                    result=result,
                    template_name=template_name,
                )
                contact_in_db = db.execute(select(Contact).where(Contact.id == contact_id)).scalar_one()
                contact_in_db.status = ContactStatus.MESSAGE_GENERATED
                generated_count += 1
                logger.info("Generated message for contact=%s", contact_id)
        
        db.commit()

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
    custom_instructions: str | None = None,
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

        prompts = build_prompts_for_contact(
            db=db,
            contact=contact,
            user_id=uid,
            message_type=msg_type,
            template_id=tmpl_id,
            previous_message=previous_message,
            custom_instructions=custom_instructions,
        )

        if not prompts:
            logger.error("Regeneration failed for contact=%s", contact_id)
            return {"error": "Failed to build prompts"}

        system_prompt, user_prompt, template_name = prompts

    result = None
    try:
        if msg_type == MessageType.COLD_OUTREACH:
            result = asyncio.run(generate_cold_message(system_prompt, user_prompt, model))
        else:
            result = asyncio.run(generate_followup_message(system_prompt, user_prompt, model))
    except Exception as e:
        logger.error("Regeneration async AI call failed: %s", e)
        try:
            self.retry()
        except self.MaxRetriesExceededError:
            return {"error": "Generation failed after retries"}

    if isinstance(result, GenerationError) or hasattr(result, "error"):
        err_msg = getattr(result, "error", "Unknown")
        retry_flag = getattr(result, "retryable", False)
        logger.error("Regeneration failed for contact=%s: %s", contact_id, err_msg)
        if retry_flag:
            try:
                self.retry()
            except self.MaxRetriesExceededError:
                return {"error": "Generation failed after retries"}
        return {"error": "Generation error"}

    if result is None:
        logger.error("Regeneration failed for contact=%s: Unknown message type or no result", contact_id)
        return {"error": "Generation error"}

    with get_sync_db() as db:
        message = save_generated_message(
            db=db,
            contact_id=contact.id,
            user_id=uid,
            campaign_id=cid,
            message_type=msg_type,
            result=result,
            template_name=template_name,
        )
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
                generate_messages_for_campaign.delay(  # pyright: ignore[reportFunctionMemberAccess]
                    user_id=str(campaign.user_id),
                    campaign_id=str(campaign.id),
                    contact_ids=contact_ids,
                    message_type=followup_type.value,
                )
                total_dispatched += len(contact_ids)

    logger.info("Follow-up check complete: dispatched %d messages", total_dispatched)
    return {"dispatched": total_dispatched}
