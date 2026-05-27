-- Correct notify_finalization_requested trigger function to insert into 'payload' instead of non-existent 'metadata' column on the 'notifications' table.

CREATE OR REPLACE FUNCTION "public"."notify_finalization_requested"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_from_user UUID;
  v_to_user UUID;
  v_counterparty UUID;
  v_already_finalized BOOLEAN;
BEGIN
  -- Get trade participants
  SELECT tp.from_user, tp.to_user
  INTO v_from_user, v_to_user
  FROM trade_proposals tp
  WHERE tp.id = NEW.trade_id;

  -- Determine counterparty
  IF NEW.user_id = v_from_user THEN
    v_counterparty := v_to_user;
  ELSE
    v_counterparty := v_from_user;
  END IF;

  -- Check if counterparty has already finalized
  SELECT EXISTS(
    SELECT 1 FROM trade_finalizations
    WHERE trade_id = NEW.trade_id AND user_id = v_counterparty
  ) INTO v_already_finalized;

  -- Only notify if counterparty hasn't finalized yet
  IF NOT v_already_finalized THEN
    INSERT INTO notifications (user_id, kind, trade_id, created_at, payload)
    VALUES (
      v_counterparty,
      'finalization_requested',
      NEW.trade_id,
      NOW(),
      jsonb_build_object('requester_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;
