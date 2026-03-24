"""
Prompt template service — CRUD and rendering for AI prompt templates.

Templates use {{variable}} syntax for placeholders.
Supported variables: name, company, role, linkedin_url, email, notes, previous_message, previous_messages
"""

import re
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.enums import MessageType
from app.models.prompt_template import PromptTemplate


# ============================================
# Template Variable Rendering
# ============================================

# All supported template variables
SUPPORTED_VARIABLES = {
    "name",
    "company",
    "role",
    "linkedin_url",
    "email",
    "notes",
    "previous_message",
    "previous_messages",
    "sender_name",
    "sender_company",
    "custom_instructions",
}

# Pattern to match {{variable_name}}
VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\}\}")


def render_template(template: str, variables: dict[str, str | None]) -> str:
    """
    Render a prompt template by replacing {{variable}} placeholders.

    - Known variables with values → replaced with value
    - Known variables with None/empty → replaced with "Not provided"
    - Unknown variables → left as-is (safety)

    Args:
        template: Template string with {{variable}} placeholders
        variables: Dict of variable_name → value

    Returns:
        Rendered template string
    """
    def _replace(match: re.Match) -> str:
        var_name = match.group(1)
        if var_name in SUPPORTED_VARIABLES:
            value = variables.get(var_name)
            return value if value else "Not provided"
        # Unknown variable — leave as-is for safety
        return match.group(0)

    return VARIABLE_PATTERN.sub(_replace, template)


def extract_variables(template: str) -> set[str]:
    """Extract all variable names from a template string."""
    return set(VARIABLE_PATTERN.findall(template))


def validate_template(system_prompt: str, user_prompt: str) -> list[str]:
    """
    Validate a template's variables. Returns list of warnings.
    Does NOT reject unknown variables — just warns.
    """
    warnings = []
    all_vars = extract_variables(system_prompt) | extract_variables(user_prompt)
    unknown = all_vars - SUPPORTED_VARIABLES
    if unknown:
        warnings.append(f"Unknown variables: {', '.join(sorted(unknown))}")
    if not all_vars:
        warnings.append("Template contains no variables — messages won't be personalized")
    return warnings


def build_contact_variables(
    contact_name: str,
    contact_company: str | None = None,
    contact_role: str | None = None,
    contact_linkedin: str | None = None,
    contact_email: str | None = None,
    contact_notes: str | None = None,
    previous_message: str | None = None,
    previous_messages: str | None = None,
    sender_name: str | None = None,
    sender_company: str | None = None,
    custom_instructions: str | None = None,
) -> dict[str, str | None]:
    """Build the standard variables dict for a contact."""
    return {
        "name": contact_name,
        "company": contact_company,
        "role": contact_role,
        "linkedin_url": contact_linkedin,
        "email": contact_email,
        "notes": contact_notes,
        "previous_message": previous_message,
        "previous_messages": previous_messages,
        "sender_name": sender_name,
        "sender_company": sender_company,
        "custom_instructions": custom_instructions,
    }


# ============================================
# Async DB operations (FastAPI)
# ============================================

async def get_default_template(
    db: AsyncSession,
    message_type: MessageType,
    user_id: uuid.UUID | None = None,
) -> PromptTemplate | None:
    """
    Get the default template for a message type.
    Priority: user's default > system default.
    """
    # Try user's default first
    if user_id:
        result = await db.execute(
            select(PromptTemplate).where(
                PromptTemplate.user_id == user_id,
                PromptTemplate.message_type == message_type,
                PromptTemplate.is_default.is_(True),
            )
        )
        user_template = result.scalar_one_or_none()
        if user_template:
            return user_template

    # Fall back to system default
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.is_system.is_(True),
            PromptTemplate.message_type == message_type,
            PromptTemplate.is_default.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def get_template_by_id(
    db: AsyncSession,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PromptTemplate | None:
    """Get a specific template (user's own or system template)."""
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.id == template_id,
            or_(
                PromptTemplate.user_id == user_id,
                PromptTemplate.is_system.is_(True),
            ),
        )
    )
    return result.scalar_one_or_none()


async def list_templates(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_type: MessageType | None = None,
) -> list[PromptTemplate]:
    """List all templates available to a user (own + system)."""
    query = select(PromptTemplate).where(
        or_(
            PromptTemplate.user_id == user_id,
            PromptTemplate.is_system.is_(True),
        )
    )
    if message_type:
        query = query.where(PromptTemplate.message_type == message_type)

    query = query.order_by(PromptTemplate.is_system.desc(), PromptTemplate.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_template(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    message_type: MessageType,
    system_prompt: str,
    user_prompt: str,
    is_default: bool = False,
) -> PromptTemplate:
    """Create a new user template."""
    # If marking as default, unset other defaults for this type
    if is_default:
        await _unset_user_defaults(db, user_id, message_type)

    template = PromptTemplate(
        user_id=user_id,
        name=name,
        message_type=message_type,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        is_default=is_default,
        is_system=False,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def update_template(
    db: AsyncSession,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    update_data: dict,
) -> PromptTemplate:
    """Update a user-owned template. Cannot modify system templates."""
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.id == template_id,
            PromptTemplate.user_id == user_id,
            PromptTemplate.is_system.is_(False),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise ValueError("Template not found or is a system template")

    if update_data.get("is_default"):
        await _unset_user_defaults(db, user_id, template.message_type)

    for field, value in update_data.items():
        if hasattr(template, field) and field not in ("id", "user_id", "is_system"):
            setattr(template, field, value)

    await db.flush()
    await db.refresh(template)
    return template


async def delete_template(
    db: AsyncSession,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a user-owned template. Cannot delete system templates."""
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.id == template_id,
            PromptTemplate.user_id == user_id,
            PromptTemplate.is_system.is_(False),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        return False

    await db.delete(template)
    await db.flush()
    return True


async def _unset_user_defaults(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_type: MessageType,
) -> None:
    """Unset is_default for all user templates of a given type."""
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.user_id == user_id,
            PromptTemplate.message_type == message_type,
            PromptTemplate.is_default.is_(True),
        )
    )
    for template in result.scalars().all():
        template.is_default = False


# ============================================
# Sync DB operations (Celery workers)
# ============================================

def get_default_template_sync(
    db: Session,
    message_type: MessageType,
    user_id: uuid.UUID | None = None,
) -> PromptTemplate | None:
    """Sync version for Celery tasks."""
    if user_id:
        user_template = db.execute(
            select(PromptTemplate).where(
                PromptTemplate.user_id == user_id,
                PromptTemplate.message_type == message_type,
                PromptTemplate.is_default.is_(True),
            )
        ).scalar_one_or_none()
        if user_template:
            return user_template

    return db.execute(
        select(PromptTemplate).where(
            PromptTemplate.is_system.is_(True),
            PromptTemplate.message_type == message_type,
            PromptTemplate.is_default.is_(True),
        )
    ).scalar_one_or_none()


def get_template_by_id_sync(
    db: Session,
    template_id: uuid.UUID,
) -> PromptTemplate | None:
    """Sync version for Celery tasks."""
    return db.execute(
        select(PromptTemplate).where(PromptTemplate.id == template_id)
    ).scalar_one_or_none()
