-- =====================================================
-- Fix listing_reserved Deeplink
-- =====================================================
-- Purpose: Make listing_reserved emails link to the chat, not reservations page
-- Date: 2025-12-16
-- =====================================================

-- Update send_email_notification_trigger
CREATE OR REPLACE FUNCTION send_email_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_action_url TEXT;
    v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-email-notification';
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';
    v_base_url TEXT := 'https://cromos-web.vercel.app';
BEGIN
    -- Determine title, body, and action URL based on notification kind
    CASE NEW.kind
        WHEN 'chat_unread' THEN
            v_title := 'Nuevo mensaje';
            v_body := 'Tienes un mensaje nuevo en un intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'listing_chat' THEN
            v_title := 'Pregunta sobre tu anuncio';
            v_body := COALESCE(NEW.payload->>'message_preview', 'Alguien ha preguntado por tu cromo');
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_reserved' THEN
            v_title := '¡Cromo reservado!';
            v_body := 'Alguien ha reservado uno de tus cromos';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_completed' THEN
            v_title := 'Venta completada';
            v_body := 'Se ha confirmado la venta de tu cromo';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id;
        WHEN 'proposal_accepted' THEN
            v_title := '¡Oferta aceptada!';
            v_body := 'Tu oferta de intercambio ha sido aceptada';
            v_action_url := v_base_url || '/chats';
        WHEN 'proposal_rejected' THEN
            v_title := 'Oferta rechazada';
            v_body := 'Tu oferta de intercambio ha sido rechazada';
            v_action_url := v_base_url || '/chats';
        WHEN 'finalization_requested' THEN
            v_title := 'Finalización solicitada';
            v_body := 'La otra parte ha solicitado finalizar el intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'user_rated' THEN
            v_title := 'Nueva valoración';
            v_body := 'Has recibido una nueva valoración de usuario';
            v_action_url := v_base_url || '/profile';
        WHEN 'template_rated' THEN
            v_title := 'Valoración de plantilla';
            v_body := 'Alguien ha valorado una de tus plantillas';
            v_action_url := v_base_url || '/templates/' || NEW.template_id;
        WHEN 'badge_earned' THEN
            v_title := '¡Nueva insignia!';
            v_body := 'Has desbloqueado una nueva insignia';
            v_action_url := v_base_url || '/profile';
        WHEN 'system_message' THEN
            v_title := 'Mensaje del sistema';
            v_body := COALESCE(NEW.payload->>'message', 'Tienes un mensaje importante del sistema');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'admin_action' THEN
            v_title := 'Acción administrativa';
            v_body := COALESCE(NEW.payload->>'message', 'Un administrador ha realizado una acción en tu cuenta');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'level_up' THEN
            v_title := '¡Subiste de nivel!';
            v_body := COALESCE(NEW.payload->>'message', 'Has alcanzado un nuevo nivel');
            v_action_url := v_base_url || '/profile';
        ELSE
            v_title := 'Nueva notificación';
            v_body := 'Tienes una nueva actividad en CambioCromos';
            v_action_url := v_base_url || '/profile/notifications';
    END CASE;

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'notification_kind', NEW.kind,
            'title', v_title,
            'body', v_body,
            'data', NEW.payload || jsonb_build_object('action_url', v_action_url)
        )
    );

    RETURN NEW;
END;
$$;

-- Update send_push_notification_trigger as well
CREATE OR REPLACE FUNCTION send_push_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_action_url TEXT;
    v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-push-notification';
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';
    v_base_url TEXT := 'https://cromos-web.vercel.app';
BEGIN
    -- Determine title, body, and action URL based on notification kind
    CASE NEW.kind
        WHEN 'chat_unread' THEN
            v_title := 'Nuevo mensaje';
            v_body := 'Tienes un mensaje nuevo en un intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'listing_chat' THEN
            v_title := 'Pregunta sobre tu anuncio';
            v_body := COALESCE(NEW.payload->>'message_preview', 'Alguien ha preguntado por tu cromo');
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_reserved' THEN
            v_title := '¡Cromo reservado!';
            v_body := 'Alguien ha reservado uno de tus cromos';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_completed' THEN
            v_title := 'Venta completada';
            v_body := 'Se ha confirmado la venta de tu cromo';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id;
        WHEN 'proposal_accepted' THEN
            v_title := '¡Oferta aceptada!';
            v_body := 'Tu oferta de intercambio ha sido aceptada';
            v_action_url := v_base_url || '/chats';
        WHEN 'proposal_rejected' THEN
            v_title := 'Oferta rechazada';
            v_body := 'Tu oferta de intercambio ha sido rechazada';
            v_action_url := v_base_url || '/chats';
        WHEN 'finalization_requested' THEN
            v_title := 'Finalización solicitada';
            v_body := 'La otra parte ha solicitado finalizar el intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'user_rated' THEN
            v_title := 'Nueva valoración';
            v_body := 'Has recibido una nueva valoración de usuario';
            v_action_url := v_base_url || '/profile';
        WHEN 'template_rated' THEN
            v_title := 'Valoración de plantilla';
            v_body := 'Alguien ha valorado una de tus plantillas';
            v_action_url := v_base_url || '/templates/' || NEW.template_id;
        WHEN 'badge_earned' THEN
            v_title := '¡Nueva insignia!';
            v_body := 'Has desbloqueado una nueva insignia';
            v_action_url := v_base_url || '/profile';
        WHEN 'system_message' THEN
            v_title := 'Mensaje del sistema';
            v_body := COALESCE(NEW.payload->>'message', 'Tienes un mensaje importante del sistema');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'admin_action' THEN
            v_title := 'Acción administrativa';
            v_body := COALESCE(NEW.payload->>'message', 'Un administrador ha realizado una acción en tu cuenta');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'level_up' THEN
            v_title := '¡Subiste de nivel!';
            v_body := COALESCE(NEW.payload->>'message', 'Has alcanzado un nuevo nivel');
            v_action_url := v_base_url || '/profile';
        ELSE
            v_title := 'Nueva notificación';
            v_body := 'Tienes una nueva actividad en CambioCromos';
            v_action_url := v_base_url || '/profile/notifications';
    END CASE;

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'notification_kind', NEW.kind,
            'title', v_title,
            'body', v_body,
            'data', NEW.payload || jsonb_build_object('action_url', v_action_url)
        )
    );

    RETURN NEW;
END;
$$;