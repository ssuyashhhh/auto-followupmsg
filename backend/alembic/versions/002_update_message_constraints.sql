-- Migration: 002_update_message_constraints
-- Description: Update constraints and default prompts for cold outreach and follow-ups.
-- Date: 2026-03-16

-- 1. Loosen word_count constraint up to 500
ALTER TABLE messages DROP CONSTRAINT chk_word_count;
ALTER TABLE messages ADD CONSTRAINT chk_word_count CHECK (word_count > 0 AND word_count <= 500);

-- 2. Update default templates in prompt_templates
-- Cold Outreach
UPDATE prompt_templates 
SET 
    system_prompt = 'You are an expert cold outreach copywriter. Write personalized, conversational messages that feel human and authentic. Never be salesy or pushy. Keep messages strictly under 200 characters. Focus on providing value and building genuine connection.',
    user_prompt = 'Write a personalized cold outreach message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}
LinkedIn: {{linkedin_url}}

The message should:
1. Reference something specific about their role or company
2. Offer genuine value or insight
3. End with a soft, low-pressure call to action
4. Feel like it was written by a real person, not AI
5. Be strictly under 200 characters'
WHERE name = 'Default Cold Outreach' AND is_system = TRUE;

-- Follow-Up 1
UPDATE prompt_templates 
SET 
    system_prompt = 'You are an expert follow-up message writer. Write a friendly follow-up that references the previous outreach. Be respectful of their time. The length must be strictly between 200 and 300 words.',
    user_prompt = 'Write a follow-up message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}

Original message sent:
{{previous_message}}

The follow-up should:
1. Be brief and respectful
2. Add new value or a different angle
3. Not be pushy or guilt-tripping
4. Be strictly between 200 and 300 words'
WHERE name = 'Default Follow-Up 1' AND is_system = TRUE;

-- Follow-Up 2
UPDATE prompt_templates 
SET 
    system_prompt = 'You are an expert at writing final follow-up messages. This is the last attempt to connect. Be gracious, provide value, and make it easy for them to respond or opt out. The length must be strictly between 200 and 300 words.',
    user_prompt = 'Write a final follow-up message for:
Name: {{name}}
Company: {{company}}
Role: {{role}}

Previous messages sent:
{{previous_messages}}

The message should:
1. Acknowledge this is a follow-up
2. Provide a compelling reason to connect
3. Give them an easy out
4. Be strictly between 200 and 300 words'
WHERE name = 'Default Follow-Up 2' AND is_system = TRUE;
