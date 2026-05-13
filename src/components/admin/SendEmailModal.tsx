'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface SendEmailModalProps {
  user: { user_id: string; email: string; nickname: string } | null;
  open: boolean;
  onClose: () => void;
}

export function SendEmailModal({ user, open, onClose }: SendEmailModalProps) {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.sendEmail');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!user) return;
    if (!subject.trim() || !body.trim()) { toast(t('errorEmpty'), 'error'); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('errorNoSession'));
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-corporate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ to_email: user.email, subject: subject.trim(), body: body.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('errorSend'));
      toast(t('successSent', { email: user.email }), 'success');
      setSubject(''); setBody(''); onClose();
    } catch (e: unknown) {
      logger.error('Send corporate email error', e);
      const msg = e instanceof Error ? e.message : t('errorSend');
      toast(msg, 'error');
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    if (!sending) { setSubject(''); setBody(''); onClose(); }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={e => sending && e.preventDefault()} onInteractOutside={e => sending && e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">{t('to')}</label>
              <div className="bg-[#1A202C] px-3 py-2 rounded-md border-2 border-black text-gray-300">
                {user.nickname} ({user.email})
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">{t('subject')}</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('subjectPlaceholder')} disabled={sending} className="bg-[#1A202C] border-2 border-black text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">{t('message')}</label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t('messagePlaceholder')} rows={6} disabled={sending} className="bg-[#1A202C] border-2 border-black text-white resize-none" />
            </div>
            <p className="text-xs text-gray-400">{t('footerNote')}</p>
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
            {sending ? t('sending') : t('send')}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={sending}>{t('cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
