-- =====================================================
-- Fix rating visibility and mutual rating notifications
-- =====================================================
-- Purpose:
-- 1. Only show ratings/notifications after BOTH users have rated
-- 2. Make mutual rating system messages visible only to participants
-- =====================================================

-- Update check_mutual_ratings_and_notify to only notify after both rated
-- and make system message visible only to transaction participants
CREATE OR REPLACE FUNCTION check_mutual_ratings_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counterparty_rating RECORD;
  v_listing_id BIGINT;
  v_listing_title TEXT;
  v_rater_nickname TEXT;
  v_rated_nickname TEXT;
  v_transaction_buyer_id UUID;
  v_transaction_seller_id UUID;
BEGIN
  -- Only process listing ratings
  IF NEW.context_type != 'listing' THEN
    RETURN NEW;
  END IF;

  v_listing_id := NEW.context_id;

  -- Get listing title
  SELECT title INTO v_listing_title
  FROM trade_listings
  WHERE id = v_listing_id;

  -- Get rater's nickname
  SELECT nickname INTO v_rater_nickname
  FROM profiles
  WHERE id = NEW.rater_id;

  -- Get rated user's nickname
  SELECT nickname INTO v_rated_nickname
  FROM profiles
  WHERE id = NEW.rated_id;

  -- Check if the counterparty has also rated
  -- (counterparty rated the rater)
  SELECT * INTO v_counterparty_rating
  FROM user_ratings
  WHERE rater_id = NEW.rated_id
    AND rated_id = NEW.rater_id
    AND context_type = 'listing'
    AND context_id = v_listing_id;

  -- Only proceed if BOTH users have rated each other
  IF FOUND THEN
    -- Get transaction participants to verify these are the actual buyer/seller
    SELECT buyer_id, seller_id INTO v_transaction_buyer_id, v_transaction_seller_id
    FROM listing_transactions
    WHERE listing_id = v_listing_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Notify the user who just rated (about counterparty's rating of them)
    INSERT INTO notifications (
      user_id,
      kind,
      listing_id,
      actor_id,
      payload
    ) VALUES (
      NEW.rater_id,
      'user_rated',
      v_listing_id,
      NEW.rated_id,
      jsonb_build_object(
        'rating_value', v_counterparty_rating.rating,
        'has_comment', v_counterparty_rating.comment IS NOT NULL,
        'comment', v_counterparty_rating.comment,
        'listing_title', v_listing_title
      )
    );

    -- Notify the counterparty (about this user's rating of them)
    INSERT INTO notifications (
      user_id,
      kind,
      listing_id,
      actor_id,
      payload
    ) VALUES (
      NEW.rated_id,
      'user_rated',
      v_listing_id,
      NEW.rater_id,
      jsonb_build_object(
        'rating_value', NEW.rating,
        'has_comment', NEW.comment IS NOT NULL,
        'comment', NEW.comment,
        'listing_title', v_listing_title
      )
    );

    -- Add system message visible ONLY to the buyer (transaction participant)
    IF v_transaction_buyer_id IS NOT NULL THEN
      PERFORM add_system_message_to_listing_chat(
        v_listing_id,
        format('Ambos habéis valorado. %s te ha valorado con %s estrellas%s.',
          v_rated_nickname,
          v_counterparty_rating.rating,
          CASE WHEN v_counterparty_rating.comment IS NOT NULL THEN format(' - "%s"', v_counterparty_rating.comment) ELSE '' END
        ),
        v_transaction_buyer_id
      );
    END IF;

    -- Add system message visible ONLY to the seller (transaction participant)
    IF v_transaction_seller_id IS NOT NULL THEN
      PERFORM add_system_message_to_listing_chat(
        v_listing_id,
        format('Ambos habéis valorado. %s te ha valorado con %s estrellas%s.',
          v_rater_nickname,
          NEW.rating,
          CASE WHEN NEW.comment IS NOT NULL THEN format(' - "%s"', NEW.comment) ELSE '' END
        ),
        v_transaction_seller_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_mutual_ratings_and_notify IS 'Only sends notifications and adds targeted system messages after BOTH users have rated each other';

-- Update create_user_rating to NOT update profile aggregates immediately
-- Instead, only update when both users have rated (via the trigger)
DROP FUNCTION IF EXISTS create_user_rating(UUID, INTEGER, TEXT, TEXT, BIGINT);

CREATE OR REPLACE FUNCTION create_user_rating(
    p_rated_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL,
    p_context_type TEXT DEFAULT NULL,
    p_context_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_id BIGINT;
    v_counterparty_rating RECORD;
    v_old_rating NUMERIC;
    v_old_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Validate context_type
    IF p_context_type NOT IN ('trade', 'listing') THEN
        RAISE EXCEPTION 'Invalid context_type. Must be one of: trade, listing';
    END IF;

    -- Validate context_id is provided if context_type is provided
    IF p_context_type IS NOT NULL AND p_context_id IS NULL THEN
        RAISE EXCEPTION 'context_id must be provided when context_type is specified';
    END IF;

    -- Validate user is not rating themselves
    IF p_rated_id = auth.uid() THEN
        RAISE EXCEPTION 'Users cannot rate themselves';
    END IF;

    -- Create the rating
    INSERT INTO user_ratings (
        rater_id,
        rated_id,
        rating,
        comment,
        context_type,
        context_id
    ) VALUES (
        auth.uid(),
        p_rated_id,
        p_rating,
        p_comment,
        p_context_type,
        p_context_id
    ) RETURNING id INTO v_rating_id;

    -- ONLY update profile aggregates if BOTH users have now rated each other
    -- Check if counterparty has also rated the current user
    SELECT * INTO v_counterparty_rating
    FROM user_ratings
    WHERE rater_id = p_rated_id
      AND rated_id = auth.uid()
      AND context_type = p_context_type
      AND context_id = p_context_id;

    -- If both have rated, update BOTH profiles
    IF FOUND THEN
        -- Update the profile of the user being rated (p_rated_id)
        SELECT rating_avg, rating_count INTO v_old_rating, v_old_count
        FROM profiles
        WHERE id = p_rated_id;

        UPDATE profiles
        SET
            rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + p_rating) / (v_old_count + 1),
            rating_count = v_old_count + 1
        WHERE id = p_rated_id;

        -- Also update the profile of the current user (auth.uid())
        SELECT rating_avg, rating_count INTO v_old_rating, v_old_count
        FROM profiles
        WHERE id = auth.uid();

        UPDATE profiles
        SET
            rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + v_counterparty_rating.rating) / (v_old_count + 1),
            rating_count = v_old_count + 1
        WHERE id = auth.uid();
    END IF;
    -- If only one has rated, DON'T update any profiles yet

    RETURN v_rating_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_user_rating(UUID, INTEGER, TEXT, TEXT, BIGINT) TO authenticated;

COMMENT ON FUNCTION create_user_rating IS 'Creates a rating - only updates profile aggregates after BOTH users have rated each other';
