-- =====================================================
-- Add UPDATE triggers for push and email notifications
-- =====================================================
-- Purpose: Handle notification updates (e.g., chat message UPSERT)
-- Date: 2025-12-16
-- Issue: Chat notifications use ON CONFLICT DO UPDATE, which
--        doesn't trigger AFTER INSERT, so no emails/push are sent
--        for subsequent messages
-- =====================================================

-- -----------------------------------------------
-- Add AFTER UPDATE trigger for push notifications
-- -----------------------------------------------
DROP TRIGGER IF EXISTS trigger_send_push_notification_update ON notifications;

CREATE TRIGGER trigger_send_push_notification_update
    AFTER UPDATE ON notifications
    FOR EACH ROW
    WHEN (
        -- Only trigger if created_at was updated (indicates new content)
        -- AND the notification is still unread
        NEW.created_at > OLD.created_at
        AND NEW.read_at IS NULL
    )
    EXECUTE FUNCTION send_push_notification_trigger();

COMMENT ON TRIGGER trigger_send_push_notification_update ON notifications IS
    'Triggers push notification when an unread notification is updated with new content (e.g., new chat message).';

-- -----------------------------------------------
-- Add AFTER UPDATE trigger for email notifications
-- -----------------------------------------------
DROP TRIGGER IF EXISTS trigger_send_email_notification_update ON notifications;

CREATE TRIGGER trigger_send_email_notification_update
    AFTER UPDATE ON notifications
    FOR EACH ROW
    WHEN (
        -- Only trigger if created_at was updated (indicates new content)
        -- AND the notification is still unread
        NEW.created_at > OLD.created_at
        AND NEW.read_at IS NULL
    )
    EXECUTE FUNCTION send_email_notification_trigger();

COMMENT ON TRIGGER trigger_send_email_notification_update ON notifications IS
    'Triggers email notification when an unread notification is updated with new content (e.g., new chat message).';
