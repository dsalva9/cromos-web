-- Add listing_type and price columns to trade_listings
-- listing_type: 'intercambio' (exchange), 'venta' (sale), 'ambos' (both)
-- price: required when listing_type is 'venta' or 'ambos'

-- 1. Add columns
ALTER TABLE trade_listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'intercambio',
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

-- 2. Add constraints
ALTER TABLE trade_listings
  ADD CONSTRAINT check_listing_type
    CHECK (listing_type IN ('intercambio', 'venta', 'ambos')),
  ADD CONSTRAINT check_price_when_sale
    CHECK (
      (listing_type = 'intercambio' AND (price IS NULL OR price >= 0))
      OR (listing_type IN ('venta', 'ambos') AND price IS NOT NULL AND price > 0)
    );

-- 3. Backfill existing rows (all default to intercambio, which is already the default)
-- No-op since the DEFAULT handles it, but explicit for clarity
UPDATE trade_listings SET listing_type = 'intercambio' WHERE listing_type IS NULL;

-- 4. Add comments
COMMENT ON COLUMN trade_listings.listing_type IS 'Type of listing: intercambio (exchange), venta (sale), ambos (both)';
COMMENT ON COLUMN trade_listings.price IS 'Price in EUR, required when listing_type is venta or ambos';

-- 5. Update create_trade_listing RPC to accept listing_type and price
CREATE OR REPLACE FUNCTION "public"."create_trade_listing"(
  "p_title" "text",
  "p_description" "text",
  "p_sticker_number" "text",
  "p_collection_name" "text",
  "p_image_url" "text",
  "p_copy_id" bigint,
  "p_slot_id" bigint,
  "p_page_number" integer DEFAULT NULL::integer,
  "p_page_title" "text" DEFAULT NULL::"text",
  "p_slot_variant" "text" DEFAULT NULL::"text",
  "p_global_number" integer DEFAULT NULL::integer,
  "p_is_group" boolean DEFAULT false,
  "p_group_count" integer DEFAULT 1,
  "p_listing_type" "text" DEFAULT 'intercambio'::"text",
  "p_price" numeric DEFAULT NULL::numeric
) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_listing_id BIGINT;
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate listing_type
  IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
    RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
  END IF;

  -- Validate price when selling
  IF p_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
    RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
  END IF;

  -- Insert the listing
  INSERT INTO trade_listings (
    user_id,
    title,
    description,
    sticker_number,
    collection_name,
    image_url,
    copy_id,
    slot_id,
    page_number,
    page_title,
    slot_variant,
    global_number,
    is_group,
    group_count,
    listing_type,
    price,
    status
  ) VALUES (
    v_user_id,
    p_title,
    p_description,
    p_sticker_number,
    p_collection_name,
    p_image_url,
    p_copy_id,
    p_slot_id,
    p_page_number,
    p_page_title,
    p_slot_variant,
    p_global_number,
    p_is_group,
    p_group_count,
    p_listing_type,
    p_price,
    'active'
  ) RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$;

COMMENT ON FUNCTION "public"."create_trade_listing" IS 'Creates a new marketplace listing with listing_type (intercambio/venta/ambos) and optional price';

-- 6. Update publish_duplicate_to_marketplace RPC
CREATE OR REPLACE FUNCTION "public"."publish_duplicate_to_marketplace"(
  "p_copy_id" bigint,
  "p_slot_id" bigint,
  "p_title" text,
  "p_description" text DEFAULT NULL,
  "p_image_url" text DEFAULT NULL,
  "p_listing_type" text DEFAULT 'intercambio',
  "p_price" numeric DEFAULT NULL
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
    v_collection_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;

    -- Validate listing_type
    IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
        RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
    END IF;

    -- Validate price when selling
    IF p_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
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

    -- Create listing WITH collection_name, listing_type, and price
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        image_url,
        status,
        copy_id,
        slot_id,
        sticker_number,
        collection_name,
        page_number,
        page_title,
        slot_variant,
        global_number,
        listing_type,
        price
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_image_url,
        'active',
        p_copy_id,
        p_slot_id,
        CONCAT(v_slot_number::TEXT, COALESCE(v_slot_variant, '')),
        v_collection_name,
        v_page_number,
        v_page_title,
        v_slot_variant,
        v_global_number,
        p_listing_type,
        p_price
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

COMMENT ON FUNCTION "public"."publish_duplicate_to_marketplace" IS 'Creates a marketplace listing from a template duplicate with listing_type and price support';

-- 7. Update update_trade_listing RPC
CREATE OR REPLACE FUNCTION "public"."update_trade_listing"(
  "p_listing_id" bigint,
  "p_title" "text",
  "p_description" "text" DEFAULT NULL::"text",
  "p_sticker_number" "text" DEFAULT NULL::"text",
  "p_collection_name" "text" DEFAULT NULL::"text",
  "p_image_url" "text" DEFAULT NULL::"text",
  "p_listing_type" "text" DEFAULT NULL::"text",
  "p_price" numeric DEFAULT NULL::numeric
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_user_id UUID;
    v_final_listing_type TEXT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to update a listing';
    END IF;
    
    -- Get the listing owner
    SELECT user_id INTO v_user_id
    FROM trade_listings
    WHERE id = p_listing_id;
    
    -- Check if listing exists and user is the owner
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only update your own listings';
    END IF;

    -- If listing_type is provided, validate it
    IF p_listing_type IS NOT NULL THEN
        IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
            RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
        END IF;
        v_final_listing_type := p_listing_type;
    ELSE
        -- Keep existing listing_type
        SELECT listing_type INTO v_final_listing_type
        FROM trade_listings
        WHERE id = p_listing_id;
    END IF;

    -- Validate price when selling
    IF v_final_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
    END IF;
    
    -- Update the listing
    UPDATE trade_listings
    SET 
        title = p_title,
        description = p_description,
        sticker_number = p_sticker_number,
        collection_name = p_collection_name,
        image_url = p_image_url,
        listing_type = v_final_listing_type,
        price = p_price,
        updated_at = NOW()
    WHERE id = p_listing_id;
END;
$$;

COMMENT ON FUNCTION "public"."update_trade_listing" IS 'Updates an existing marketplace listing with listing_type and price support';
