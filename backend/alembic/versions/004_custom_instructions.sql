-- Migration: 004_custom_instructions
-- Description: Update default system templates to use {{custom_instructions}} instead of {{notes}}
-- Date: 2026-03-24

UPDATE prompt_templates
SET user_prompt = REPLACE(user_prompt, '{{notes}}', '{{custom_instructions}}')
WHERE is_system = TRUE;
