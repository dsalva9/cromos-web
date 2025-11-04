-- =====================================================
-- COLLECTION TEMPLATES: Add delete template copy RPC
-- =====================================================
-- Purpose: Allow users to delete their template copies
-- Note: This will cascade delete all progress data
-- =====================================================

-- FUNCTION: delete_template_copy
-- Deletes a user's template copy and all associated progress
CREATE OR REPLACE FUNCTION delete_template_copy(
    p_copy_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Copy not found or does not belong to you';
    END IF;

    -- Delete the copy (progress will cascade delete automatically)
    DELETE FROM user_template_copies
    WHERE id = p_copy_id AND user_id = auth.uid();

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_template_copy TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_template_copy IS 'Deletes a user''s template copy and all associated progress data';
