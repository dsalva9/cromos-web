-- Safety net: Prevent cascading deletion of user progress data
-- when a collection template is hard-deleted.
--
-- Problem: template_slots and template_pages have CASCADE FK to collection_templates.
-- Deleting a template cascades to slots → which cascades to user_template_progress,
-- silently destroying all user sticker tracking data.
--
-- Fix: Change CASCADE to SET NULL so structural data (pages/slots) survives
-- template deletion and continues serving user_template_progress rows.

-- Step 1: Make template_id nullable on both tables (required for SET NULL)
ALTER TABLE template_pages ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE template_slots ALTER COLUMN template_id DROP NOT NULL;

-- Step 2: Change FK on template_pages from CASCADE to SET NULL
ALTER TABLE template_pages
  DROP CONSTRAINT template_pages_template_id_fkey,
  ADD CONSTRAINT template_pages_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES collection_templates(id)
    ON DELETE SET NULL;

-- Step 3: Change FK on template_slots from CASCADE to SET NULL
ALTER TABLE template_slots
  DROP CONSTRAINT fk_template_slots_template,
  ADD CONSTRAINT fk_template_slots_template
    FOREIGN KEY (template_id) REFERENCES collection_templates(id)
    ON DELETE SET NULL;
