-- =====================================================
-- Add mutual rating notification system
-- =====================================================
-- When both users rate each other for a listing transaction,
-- send a notification to both users with the counterparty's rating
-- =====================================================

-- Function to check and notify when both users have rated
CREATE OR REPLACE FUNCTION check_mutual_ratings_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counterparty_id UUID;
  v_counterparty_rating RECORD;
  v_listing_id BIGINT;
  v_listing_title TEXT;
  v_rater_nickname TEXT;
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

  -- Check if the counterparty has also rated
  -- (counterparty rated the rater)
  SELECT * INTO v_counterparty_rating
  FROM user_ratings
  WHERE rater_id = NEW.rated_id
    AND rated_id = NEW.rater_id
    AND context_type = 'listing'
    AND context_id = v_listing_id;

  -- If counterparty has also rated, send notifications to both users
  IF FOUND THEN
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

    -- Add system message to the listing chat with both ratings
    PERFORM add_system_message_to_listing_chat(
      v_listing_id,
      format('Ambos usuarios se han valorado. %s: %s estrellas%s. %s: %s estrellas%s.',
        v_rater_nickname,
        NEW.rating,
        CASE WHEN NEW.comment IS NOT NULL THEN format(' - "%s"', NEW.comment) ELSE '' END,
        (SELECT nickname FROM profiles WHERE id = NEW.rated_id),
        v_counterparty_rating.rating,
        CASE WHEN v_counterparty_rating.comment IS NOT NULL THEN format(' - "%s"', v_counterparty_rating.comment) ELSE '' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on user_ratings
DROP TRIGGER IF EXISTS trigger_check_mutual_ratings ON user_ratings;
CREATE TRIGGER trigger_check_mutual_ratings
  AFTER INSERT ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_ratings_and_notify();

-- Add comment
COMMENT ON FUNCTION check_mutual_ratings_and_notify IS 'Checks if both users have rated each other and sends notifications when mutual ratings are complete';
