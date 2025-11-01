-- =====================================================
-- COLLECTION TEMPLATES: Add slot variants and global numbering
-- =====================================================
-- Purpose: Support Panini-style album structures with sub-slots (5A, 5B)
--          and optional global checklist numbers (1-773)
-- =====================================================

-- Step 1: Add new columns to template_slots
-- slot_variant: stores 'A', 'B', 'C' etc. for sub-slots (nullable for backward compatibility)
-- global_number: optional checklist number for quick entry (nullable)
ALTER TABLE template_slots
ADD COLUMN slot_variant TEXT,
ADD COLUMN global_number INTEGER;

-- Step 2: Drop old unique constraint
ALTER TABLE template_slots
DROP CONSTRAINT unique_page_slot;

-- Step 3: Create new unique constraint that includes variant
-- This allows multiple slots with same number but different variants (5A, 5B)
ALTER TABLE template_slots
ADD CONSTRAINT unique_page_slot_variant UNIQUE(page_id, slot_number, slot_variant);

-- Step 4: Create index for global number lookups (used in quick entry)
CREATE INDEX idx_template_slots_global_number
ON template_slots(global_number)
WHERE global_number IS NOT NULL;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN template_slots.slot_variant IS 'Optional variant identifier (A, B, C) for sub-slots at same position';
COMMENT ON COLUMN template_slots.global_number IS 'Optional global checklist number for quick entry (e.g., 1-773 in Panini albums)';

-- Step 6: Add check constraint to ensure variant is single uppercase letter if provided
ALTER TABLE template_slots
ADD CONSTRAINT check_slot_variant_format
CHECK (slot_variant IS NULL OR slot_variant ~ '^[A-Z]$');

-- Step 7: Add template_id column to template_slots for efficient global_number uniqueness
-- This denormalizes template_id to allow unique constraint on (template_id, global_number)
ALTER TABLE template_slots
ADD COLUMN template_id BIGINT;

-- Populate template_id from the parent page
UPDATE template_slots ts
SET template_id = tp.template_id
FROM template_pages tp
WHERE ts.page_id = tp.id;

-- Make template_id NOT NULL now that it's populated
ALTER TABLE template_slots
ALTER COLUMN template_id SET NOT NULL;

-- Add foreign key constraint to maintain referential integrity
ALTER TABLE template_slots
ADD CONSTRAINT fk_template_slots_template
FOREIGN KEY (template_id) REFERENCES collection_templates(id)
ON DELETE CASCADE;

-- Create unique index on global_number scoped to template
-- This ensures no duplicate global numbers within the same template
CREATE UNIQUE INDEX idx_template_slots_unique_global_number
ON template_slots(template_id, global_number)
WHERE global_number IS NOT NULL;

-- Add trigger to auto-populate template_id when inserting new slots
CREATE OR REPLACE FUNCTION set_template_slot_template_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT template_id INTO NEW.template_id
    FROM public.template_pages
    WHERE id = NEW.page_id;

    IF NEW.template_id IS NULL THEN
        RAISE EXCEPTION 'Cannot find template_id for page_id %', NEW.page_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_template_slot_template_id
BEFORE INSERT ON template_slots
FOR EACH ROW
EXECUTE FUNCTION set_template_slot_template_id();
