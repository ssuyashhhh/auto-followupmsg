import enum


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class UploadStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ContactStatus(str, enum.Enum):
    NEW = "new"
    MESSAGE_GENERATED = "message_generated"
    MESSAGE_SENT = "message_sent"
    FOLLOW_UP_SCHEDULED = "follow_up_scheduled"
    FOLLOW_UP_SENT = "follow_up_sent"
    REPLIED = "replied"
    OPTED_OUT = "opted_out"


class MessageType(str, enum.Enum):
    COLD_OUTREACH = "cold_outreach"
    FOLLOW_UP_1 = "follow_up_1"
    FOLLOW_UP_2 = "follow_up_2"
    FOLLOW_UP_3 = "follow_up_3"
    CUSTOM = "custom"


class MessageStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"
    SENT = "sent"
    FAILED = "failed"
