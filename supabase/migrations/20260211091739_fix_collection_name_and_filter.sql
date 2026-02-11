-- Fix 1: get_user_collections should only return copies with valid template_id
CREATE OR REPLACE FUNCTION "public"."get_user_collections"("p_user_id" "uuid" DEFAULT NULL::uuid)
RETURNS TABLE(
  "copy_id" bigint,
  "template_id" bigint,
  "title" text,
  "is_active" boolean,
  "copied_at" timestamp with time zone
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    utc.id AS copy_id,
    utc.template_id,
    utc.title,
    utc.is_active,
    utc.copied_at
  FROM user_template_copies utc
  WHERE utc.user_id = p_user_id
    AND utc.template_id IS NOT NULL  -- Filter out orphaned copies
  ORDER BY utc.copied_at DESC;
END;
$$;

-- Fix 2: publish_duplicate_to_marketplace should set collection_name from the template
CREATE OR REPLACE FUNCTION "public"."publish_duplicate_to_marketplace"(
  "p_copy_id" bigint,
  "p_slot_id" bigint,
  "p_title" text,
  "p_description" text DEFAULT NULL,
  "p_image_url" text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_listing_id BIGINT;
    v_user_id UUID;
    v_template_id BIGINT;
    v_current_count INTEGER;
    v_copy_user_id UUID;
    v_slot_status TEXT;
    v_page_number INTEGER;
    v_page_title TEXT;
    v_slot_number INTEGER;
    v_slot_variant TEXT;
    v_global_number INTEGER;
    v_collection_name TEXT;  -- NEW: collection name from the template copy
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;

    -- Get copy details INCLUDING the title (which is the collection name)
    SELECT user_id, template_id, title
    INTO v_copy_user_id, v_template_id, v_collection_name
    FROM user_template_copies
    WHERE id = p_copy_id;

    IF v_copy_user_id IS NULL THEN
        RAISE EXCEPTION 'Copy not found';
    END IF;

    IF v_copy_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Copy does not belong to you';
    END IF;

    -- Get slot metadata
    SELECT
        tp.page_number,
        tp.title,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number
    INTO
        v_page_number,
        v_page_title,
        v_slot_number,
        v_slot_variant,
        v_global_number
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    WHERE ts.id = p_slot_id AND tp.template_id = v_template_id;

    IF v_slot_number IS NULL THEN
        RAISE EXCEPTION 'Slot does not belong to this template';
    END IF;

    SELECT status, count INTO v_slot_status, v_current_count
    FROM user_template_progress
    WHERE user_id = auth.uid() AND copy_id = p_copy_id AND slot_id = p_slot_id;

    IF v_slot_status IS NULL THEN
        RAISE EXCEPTION 'Slot progress not found';
    END IF;

    IF v_slot_status != 'duplicate' OR v_current_count < 1 THEN
        RAISE EXCEPTION 'No duplicates available for this slot';
    END IF;

    -- Create listing WITH collection_name
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        image_url,
        status,
        copy_id,
        slot_id,
        sticker_number,
        collection_name,  -- NEW
        page_number,
        page_title,
        slot_variant,
        global_number
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_image_url,
        'active',
        p_copy_id,
        p_slot_id,
        CONCAT(v_slot_number::TEXT, COALESCE(v_slot_variant, '')),
        v_collection_name,  -- NEW: set from the template copy title
        v_page_number,
        v_page_title,
        v_slot_variant,
        v_global_number
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

-- Fix 3: Backfill existing listings that have copy_id but no collection_name
UPDATE trade_listings tl
SET collection_name = utc.title
FROM user_template_copies utc
WHERE tl.copy_id = utc.id
  AND tl.collection_name IS NULL
  AND utc.title IS NOT NULL;
