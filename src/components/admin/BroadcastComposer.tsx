'use client';

import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { Send, Eye, EyeOff, FlaskConical, RefreshCw, ChevronDown, Users, Shield } from 'lucide-react';

/**
 * Build a branded HTML preview identical to the Edge Function template.
 * This runs client-side so the admin can preview before sending.
 */
function buildPreviewHtml(subject: string, body: string, nickname: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FFC000 0%, #FF8C00 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">CambioCromos</h1>
    </div>
    <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #1f2937; font-size: 18px; margin-top: 0;">Hola ${esc(nickname || 'there')} 👋</p>
      <h2 style="color: #1f2937; font-size: 20px;">${esc(subject)}</h2>
      <p style="color: #4b5563; margin: 16px 0; white-space: pre-wrap;">${esc(body)}</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin: 0;">Este es un mensaje del equipo de CambioCromos</p>
      <p style="margin: 8px 0 0 0;"><span style="color: #9ca3af; text-decoration: underline; cursor: default;">[Cancelar suscripción]</span></p>
    </div>
  </body>
</html>`;
}

export function BroadcastComposer() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.broadcasts');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testEmails, setTestEmails] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [nickname, setNickname] = useState('');

  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    return session;
  }, [supabase]);

  // Fetch admin nickname for preview (lazy, once)
  const ensureNickname = useCallback(async () => {
    if (nickname) return nickname;
    try {
      const session = await getSession();
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single();
      const n = data?.nickname || 'Admin';
      setNickname(n);
      return n;
    } catch {
      return 'Admin';
    }
  }, [supabase, nickname, getSession]);

  async function handleSendTest() {
    if (!subject.trim() || !body.trim()) {
      toast(t('errorEmpty'), 'error');
      return;
    }
    setSendingTest(true);
    try {
      const session = await getSession();
      const extraEmails = testEmails.trim()
        ? testEmails.split(',').map(e => e.trim()).filter(Boolean)
        : undefined;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-broadcast-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject: subject.trim(),
            body: body.trim(),
            mode: 'test',
            test_emails: extraEmails,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('errorSend'));
      toast(t('testSuccess', { email: session.user.email ?? '' }), 'success');
    } catch (e: unknown) {
      logger.error('Test broadcast error', e);
      toast(e instanceof Error ? e.message : t('errorSend'), 'error');
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendBroadcast() {
    if (!subject.trim() || !body.trim()) {
      toast(t('errorEmpty'), 'error');
      return;
    }
    setSending(true);
    try {
      const session = await getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-broadcast-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject: subject.trim(),
            body: body.trim(),
            mode: 'broadcast',
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('errorSend'));
      toast(t('successSent', { count: result.recipient_count || '~' }), 'success');
      setSubject('');
      setBody('');
      setShowConfirm(false);
      // Trigger history refresh by dispatching custom event
      window.dispatchEvent(new Event('broadcast-sent'));
    } catch (e: unknown) {
      logger.error('Broadcast send error', e);
      toast(e instanceof Error ? e.message : t('errorSend'), 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleSyncContacts(adminsOnly: boolean) {
    setSyncing(true);
    setShowSyncMenu(false);
    try {
      const session = await getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-resend-contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ admins_only: adminsOnly }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sync failed');
      toast(t('syncSuccess', { created: result.created, skipped: result.skipped }), 'success');
    } catch (e: unknown) {
      logger.error('Contact sync error', e);
      toast(e instanceof Error ? e.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function togglePreview() {
    if (!showPreview) {
      await ensureNickname();
    }
    setShowPreview(!showPreview);
  }

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">{t('compose')}</h2>

        {/* Sync Contacts Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() => setShowSyncMenu(!showSyncMenu)}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('syncing') : t('syncContacts')}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>

          {showSyncMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-[#2D3748] border-2 border-black rounded-md shadow-lg z-50">
              <button
                onClick={() => handleSyncContacts(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[#374151] flex items-center gap-2 rounded-t-md"
              >
                <Shield className="h-4 w-4 text-yellow-400" />
                {t('syncAdminsOnly')}
              </button>
              <button
                onClick={() => handleSyncContacts(false)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[#374151] flex items-center gap-2 rounded-b-md"
              >
                <Users className="h-4 w-4 text-blue-400" />
                {t('syncAllUsers')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Composer Form */}
      <div className="bg-[#2D3748] border-2 border-black rounded-lg p-6 space-y-4">
        {/* Subject */}
        <div>
          <label className="text-sm text-gray-300 mb-1 block">{t('subject')}</label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('subjectPlaceholder')}
            disabled={sending || sendingTest}
            className="bg-[#1A202C] border-2 border-black text-white"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-sm text-gray-300 mb-1 block">{t('body')}</label>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('bodyPlaceholder')}
            rows={10}
            disabled={sending || sendingTest}
            className="bg-[#1A202C] border-2 border-black text-white resize-none"
          />
        </div>

        {/* Test Emails (optional) */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">{t('testEmails')}</label>
          <Input
            value={testEmails}
            onChange={e => setTestEmails(e.target.value)}
            placeholder={t('testEmailsPlaceholder')}
            disabled={sending || sendingTest}
            className="bg-[#1A202C] border-2 border-black text-white text-sm"
          />
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500">{t('footerNote')}</p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreview}
            disabled={!canSend}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            {showPreview ? (
              <><EyeOff className="h-4 w-4 mr-2" />{t('closePreview')}</>
            ) : (
              <><Eye className="h-4 w-4 mr-2" />{t('preview')}</>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={!canSend || sendingTest || sending}
            className="border-amber-600/50 text-amber-400 hover:bg-amber-900/30 hover:text-amber-300"
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            {sendingTest ? t('sendingTest') : t('sendTest')}
          </Button>

          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={!canSend || sending || sendingTest}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? t('sending') : t('send')}
          </Button>
        </div>
      </div>

      {/* Preview */}
      {showPreview && canSend && (
        <div className="bg-[#2D3748] border-2 border-black rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[#1A202C] text-xs text-gray-400 font-mono">
            {t('preview')}
          </div>
          <iframe
            srcDoc={buildPreviewHtml(subject, body, nickname || 'Admin')}
            className="w-full bg-white rounded-b-lg"
            style={{ height: '500px', border: 'none' }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={e => sending && e.preventDefault()}
          onInteractOutside={e => sending && e.preventDefault()}
          className="bg-[#2D3748] border-4 border-black text-white max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('confirmMessage', { count: '~' })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-3 bg-[#1A202C] rounded-md border border-gray-700">
            <p className="text-sm text-gray-300"><strong>{t('subject')}:</strong> {subject}</p>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={sending}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? t('sending') : t('send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
