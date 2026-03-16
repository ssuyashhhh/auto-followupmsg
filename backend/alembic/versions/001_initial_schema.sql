-- Migration: 001_initial_schema
-- Description: Create all core tables for the Auto Follow-Ups platform
-- Date: 2026-03-11

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE campaign_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE upload_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

CREATE TYPE contact_status AS ENUM (
    'new',
    'message_generated',
    'message_sent',
    'follow_up_scheduled',
    'follow_up_sent',
    'replied',
    'opted_out'
);

CREATE TYPE message_type AS ENUM (
    'cold_outreach',
    'follow_up_1',
    'follow_up_2',
    'follow_up_3',
    'custom'
);

CREATE TYPE message_status AS ENUM (
    'draft',
    'generated',
    'approved',
    'sent',
    'failed'
);

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    company         VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TABLE: campaigns
-- ============================================
CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          campaign_status NOT NULL DEFAULT 'draft',
    total_contacts  INTEGER NOT NULL DEFAULT 0,
    messages_generated INTEGER NOT NULL DEFAULT 0,
    messages_sent   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- TABLE: uploads
-- ============================================
CREATE TABLE uploads (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    storage_path      VARCHAR(1000) NOT NULL,
    file_type         VARCHAR(20) NOT NULL,  -- csv, txt, xlsx, xls
    file_size_bytes   BIGINT NOT NULL,
    row_count         INTEGER,
    parsed_count      INTEGER DEFAULT 0,
    failed_count      INTEGER DEFAULT 0,
    status            upload_status NOT NULL DEFAULT 'pending',
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_file_type CHECK (file_type IN ('csv', 'txt', 'xlsx', 'xls'))
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_campaign_id ON uploads(campaign_id);
CREATE INDEX idx_uploads_status ON uploads(status);

-- ============================================
-- TABLE: contacts
-- ============================================
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    upload_id       UUID REFERENCES uploads(id) ON DELETE SET NULL,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    linkedin_url    VARCHAR(500),
    company         VARCHAR(255),
    role            VARCHAR(255),
    notes           TEXT,
    raw_data        JSONB,  -- Store original row data for reference
    status          contact_status NOT NULL DEFAULT 'new',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate contacts in the same campaign
    CONSTRAINT uq_contact_campaign_email UNIQUE (campaign_id, email),
    CONSTRAINT uq_contact_campaign_linkedin UNIQUE (campaign_id, linkedin_url)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_campaign_id ON contacts(campaign_id);
CREATE INDEX idx_contacts_upload_id ON contacts(upload_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_company ON contacts(company);

-- ============================================
-- TABLE: messages
-- ============================================
CREATE TABLE messages (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    campaign_id      UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    message_type     message_type NOT NULL DEFAULT 'cold_outreach',
    content          TEXT NOT NULL,
    word_count       INTEGER NOT NULL,
    version          INTEGER NOT NULL DEFAULT 1,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,  -- Latest version flag
    status           message_status NOT NULL DEFAULT 'generated',
    ai_model         VARCHAR(100) NOT NULL,           -- e.g., 'gpt-4', 'claude-3-opus'
    prompt_template  VARCHAR(100),                     -- Template ID used
    ai_metadata      JSONB,                            -- Token usage, latency, etc.
    generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at     TIMESTAMPTZ,                      -- When follow-up is scheduled
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_word_count CHECK (word_count > 0 AND word_count <= 500)
);

CREATE INDEX idx_messages_contact_id ON messages(contact_id);
CREATE INDEX idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'approved';
CREATE INDEX idx_messages_active_version ON messages(contact_id, message_type, is_active) WHERE is_active = TRUE;

-- ============================================
-- TABLE: prompt_templates
-- ============================================
CREATE TABLE prompt_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system template
    name            VARCHAR(255) NOT NULL,
    message_type    message_type NOT NULL,
    system_prompt   TEXT NOT NULL,
    user_prompt     TEXT NOT NULL,           -- Supports {{name}}, {{company}}, {{role}} placeholders
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,  -- System-provided vs user-created
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_user_id ON prompt_templates(user_id);
CREATE INDEX idx_prompt_templates_type ON prompt_templates(message_type);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_uploads_updated_at
    BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_messages_updated_at
    BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_prompt_templates_updated_at
    BEFORE UPDATE ON prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED: Default prompt templates
-- ============================================
INSERT INTO prompt_templates (name, message_type, system_prompt, user_prompt, is_default, is_system)
VALUES
(
    'Default Cold Outreach',
    'cold_outreach',
    'You are an expert cold outreach copywriter. Write personalized, conversational messages that feel human and authentic. Never be salesy or pushy. Keep messages strictly under 200 characters. Focus on providing value and building genuine connection.',
    'Write a personalized cold outreach message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}
LinkedIn: {{linkedin_url}}

The message should:
1. Reference something specific about their role or company
2. Offer genuine value or insight
3. End with a soft, low-pressure call to action
4. Feel like it was written by a real person, not AI
5. Be strictly under 200 characters',
    TRUE,
    TRUE
),
(
    'Default Follow-Up 1',
    'follow_up_1',
    'You are an expert follow-up message writer. Write a friendly follow-up that references the previous outreach. Be respectful of their time. The length must be strictly between 200 and 300 words.',
    'Write a follow-up message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}

Original message sent:
{{previous_message}}

The follow-up should:
1. Be brief and respectful
2. Add new value or a different angle
3. Not be pushy or guilt-tripping
4. Be strictly between 200 and 300 words',
    TRUE,
    TRUE
),
(
    'Default Follow-Up 2',
    'follow_up_2',
    'You are an expert at writing final follow-up messages. This is the last attempt to connect. Be gracious, provide value, and make it easy for them to respond or opt out. The length must be strictly between 200 and 300 words.',
    'Write a final follow-up message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}

Previous messages sent:
{{previous_messages}}

The message should:
1. Acknowledge this is a follow-up
2. Provide a compelling reason to connect
3. Give them an easy out
4. Be strictly between 200 and 300 words',
    TRUE,
    TRUE
);
