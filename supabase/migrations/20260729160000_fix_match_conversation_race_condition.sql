-- Fix race condition in get_or_create_match_conversation
-- When two concurrent requests for the same user pair both pass the SELECT check,
-- the second INSERT hits the idx_match_conv_user_pair unique constraint (error 23505).
-- This wraps the INSERT in a BEGIN/EXCEPTION block to catch the unique_violation
-- and return the existing row instead of crashing.

CREATE OR REPLACE FUNCTION public.get_or_create_match_conversation(
  p_other_user_id uuid,
  p_template_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_conv match_conversations%ROWTYPE;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot chat with yourself';
  END IF;

  -- Normalize order for the unique constraint
  v_user_a := LEAST(v_me, p_other_user_id);
  v_user_b := GREATEST(v_me, p_other_user_id);

  -- Try to find existing conversation
  SELECT * INTO v_conv
  FROM match_conversations
  WHERE LEAST(user_a_id, user_b_id) = v_user_a
    AND GREATEST(user_a_id, user_b_id) = v_user_b;

  IF v_conv.id IS NOT NULL THEN
    -- Update template_id if a new one is provided
    IF p_template_id IS NOT NULL AND (v_conv.template_id IS NULL OR v_conv.template_id != p_template_id) THEN
      UPDATE match_conversations SET template_id = p_template_id WHERE id = v_conv.id;
      v_conv.template_id := p_template_id;
    END IF;
    
    RETURN jsonb_build_object(
      'id', v_conv.id,
      'created_at', v_conv.created_at,
      'other_user_id', p_other_user_id,
      'template_id', v_conv.template_id,
      'is_new', false
    );
  END IF;

  -- Create new conversation (with race condition protection)
  BEGIN
    INSERT INTO match_conversations (user_a_id, user_b_id, template_id)
    VALUES (v_user_a, v_user_b, p_template_id)
    RETURNING * INTO v_conv;
  EXCEPTION WHEN unique_violation THEN
    -- Another concurrent request created it first; fetch the existing row
    SELECT * INTO v_conv
    FROM match_conversations
    WHERE LEAST(user_a_id, user_b_id) = v_user_a
      AND GREATEST(user_a_id, user_b_id) = v_user_b;

    -- Update template_id if needed
    IF p_template_id IS NOT NULL AND (v_conv.template_id IS NULL OR v_conv.template_id != p_template_id) THEN
      UPDATE match_conversations SET template_id = p_template_id WHERE id = v_conv.id;
      v_conv.template_id := p_template_id;
    END IF;

    RETURN jsonb_build_object(
      'id', v_conv.id,
      'created_at', v_conv.created_at,
      'other_user_id', p_other_user_id,
      'template_id', v_conv.template_id,
      'is_new', false
    );
  END;

  RETURN jsonb_build_object(
    'id', v_conv.id,
    'created_at', v_conv.created_at,
    'other_user_id', p_other_user_id,
    'template_id', v_conv.template_id,
    'is_new', true
  );
END;
$$;
