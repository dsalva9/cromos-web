-- =====================================================
-- Email Notification Trigger
-- =====================================================
-- Purpose: Trigger Edge Function to send email notifications on new inserts
-- Date: 2025-12-16
-- =====================================================

-- -----------------------------------------------
-- Function: send_email_notification_trigger
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION send_email_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-email-notification';
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';
BEGIN
    -- Determine title and body based on notification kind
    CASE NEW.kind
        WHEN 'chat_unread' THEN
            v_title := 'Nuevo mensaje';
            v_body := 'Tienes un mensaje nuevo en un intercambio';
        WHEN 'listing_chat' THEN
            v_title := 'Pregunta sobre tu anuncio';
            v_body := COALESCE(NEW.payload->>'message_preview', 'Alguien ha preguntado por tu cromo');
        WHEN 'listing_reserved' THEN
            v_title := '¡Cromo reservado!';
            v_body := 'Alguien ha reservado uno de tus cromos';
        WHEN 'listing_completed' THEN
            v_title := 'Venta completada';
            v_body := 'Se ha confirmado la venta de tu cromo';
        WHEN 'proposal_accepted' THEN
            v_title := '¡Oferta aceptada!';
            v_body := 'Tu oferta de intercambio ha sido aceptada';
        WHEN 'proposal_rejected' THEN
            v_title := 'Oferta rechazada';
            v_body := 'Tu oferta de intercambio ha sido rechazada';
        WHEN 'finalization_requested' THEN
            v_title := 'Finalización solicitada';
            v_body := 'La otra parte ha solicitado finalizar el intercambio';
        WHEN 'user_rated' THEN
            v_title := 'Nueva valoración';
            v_body := 'Has recibido una nueva valoración de usuario';
        WHEN 'template_rated' THEN
            v_title := 'Valoración de plantilla';
            v_body := 'Alguien ha valorado una de tus plantillas';
        WHEN 'badge_earned' THEN
            v_title := '¡Nueva insignia!';
            v_body := 'Has desbloqueado una nueva insignia';
        WHEN 'system_message' THEN
            v_title := 'Mensaje del sistema';
            v_body := COALESCE(NEW.payload->>'message', 'Tienes un mensaje importante del sistema');
        WHEN 'admin_action' THEN
            v_title := 'Acción administrativa';
            v_body := COALESCE(NEW.payload->>'message', 'Un administrador ha realizado una acción en tu cuenta');
        WHEN 'level_up' THEN
            v_title := '¡Subiste de nivel!';
            v_body := COALESCE(NEW.payload->>'message', 'Has alcanzado un nuevo nivel');
        ELSE
            v_title := 'Nueva notificación';
            v_body := 'Tienes una nueva actividad en CambioCromos';
    END CASE;

    -- Call Edge Function via pg_net
    -- We use perform to discard the result (fire and forget)
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
            'data', NEW.payload
        )
    );

    RETURN NEW;
END;
$$;

-- -----------------------------------------------
-- Trigger: trigger_send_email_notification
-- -----------------------------------------------
DROP TRIGGER IF EXISTS trigger_send_email_notification ON notifications;

CREATE TRIGGER trigger_send_email_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_email_notification_trigger();

COMMENT ON FUNCTION send_email_notification_trigger() IS 'Triggers the send-email-notification Edge Function when a new notification is inserted.';
