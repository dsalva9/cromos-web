-- Migration: Add match stats to admin messaging activity summary
-- Drops and recreates public.admin_get_messaging_activity_summary to include match-specific statistics.

DROP FUNCTION IF EXISTS public.admin_get_messaging_activity_summary(integer, timestamptz);

CREATE OR REPLACE FUNCTION public.admin_get_messaging_activity_summary(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  total_messages bigint,
  unique_senders bigint,
  unique_receivers bigint,
  unique_conversations bigint,
  messages_per_day numeric,
  busiest_hour integer,
  top_senders jsonb,
  match_conversations_opened bigint,
  match_active_users bigint,
  match_messages_sent bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_total BIGINT;
  v_senders BIGINT;
  v_receivers BIGINT;
  v_conversations BIGINT;
  v_per_day NUMERIC;
  v_busiest INT;
  v_top JSONB;
  v_effective_days NUMERIC;
  
  -- Match statistics
  v_match_conversations BIGINT;
  v_match_active_users BIGINT;
  v_match_messages BIGINT;
BEGIN
  v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  -- For messages_per_day, compute effective days from v_since
  v_effective_days := GREATEST(EXTRACT(EPOCH FROM (NOW() - v_since)) / 86400.0, 0.01);

  -- 1. General Messaging Metrics (total, active senders, active receivers, unique conversations)
  SELECT COUNT(*) INTO v_total
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false;

  SELECT COUNT(DISTINCT tc.sender_id) INTO v_senders
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false AND tc.sender_id IS NOT NULL;

  SELECT COUNT(DISTINCT tc.receiver_id) INTO v_receivers
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false AND tc.receiver_id IS NOT NULL;

  SELECT COUNT(DISTINCT COALESCE(tc.listing_id::TEXT, 'trade_' || tc.trade_id::TEXT)) INTO v_conversations
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false;

  v_per_day := ROUND(v_total::NUMERIC / v_effective_days, 1);

  -- 2. Busiest Hour
  SELECT EXTRACT(HOUR FROM tc.created_at)::INT INTO v_busiest
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false
  GROUP BY EXTRACT(HOUR FROM tc.created_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- 3. Top Senders
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_top
  FROM (
    SELECT p.nickname, COUNT(*) AS message_count
    FROM trade_chats tc
    JOIN profiles p ON tc.sender_id = p.id
    WHERE tc.created_at >= v_since AND tc.is_system = false
    GROUP BY p.nickname
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) t;

  -- 4. Match-Specific Metrics
  -- Count of new match conversations created
  SELECT COUNT(*) INTO v_match_conversations
  FROM match_conversations mc
  WHERE mc.created_at >= v_since;

  -- Count of unique users active in match conversations
  SELECT COUNT(DISTINCT u.user_id) INTO v_match_active_users
  FROM (
    SELECT tc.sender_id AS user_id 
    FROM trade_chats tc 
    WHERE tc.match_conversation_id IS NOT NULL 
      AND tc.created_at >= v_since 
      AND tc.is_system = false
    UNION
    SELECT tc.receiver_id AS user_id 
    FROM trade_chats tc 
    WHERE tc.match_conversation_id IS NOT NULL 
      AND tc.created_at >= v_since 
      AND tc.is_system = false
  ) u;

  -- Count of messages sent in match conversations
  SELECT COUNT(*) INTO v_match_messages
  FROM trade_chats tc
  WHERE tc.match_conversation_id IS NOT NULL
    AND tc.created_at >= v_since
    AND tc.is_system = false;

  RETURN QUERY SELECT 
    v_total, 
    v_senders, 
    v_receivers, 
    v_conversations, 
    v_per_day, 
    v_busiest, 
    v_top,
    v_match_conversations,
    v_match_active_users,
    v_match_messages;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_messaging_activity_summary(integer, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_get_messaging_activity_summary(integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_messaging_activity_summary(integer, timestamptz) TO service_role;
