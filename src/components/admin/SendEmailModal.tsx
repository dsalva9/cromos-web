'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SendEmailModalProps {
    user: {
        user_id: string;
        email: string;
        nickname: string;
    } | null;
    open: boolean;
    onClose: () => void;
}

export function SendEmailModal({ user, open, onClose }: SendEmailModalProps) {
    const supabase = useSupabaseClient();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    async function handleSend() {
        if (!user) return;

        if (!subject.trim() || !body.trim()) {
            toast('Por favor, completa el asunto y el mensaje', 'error');
            return;
        }

        setSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No hay sesión activa');
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-corporate-email`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        to_email: user.email,
                        subject: subject.trim(),
                        body: body.trim(),
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al enviar el correo');
            }

            toast(`Correo enviado a ${user.email}`, 'success');
            setSubject('');
            setBody('');
            onClose();
        } catch (e: unknown) {
            logger.error('Send corporate email error', e);
            const msg = e instanceof Error ? e.message : 'Error al enviar el correo';
            toast(msg, 'error');
        } finally {
            setSending(false);
        }
    }

    function handleClose() {
        if (!sending) {
            setSubject('');
            setBody('');
            onClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={open => !open && handleClose()}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={e => sending && e.preventDefault()}
                onInteractOutside={e => sending && e.preventDefault()}
                className="bg-[#2D3748] border-4 border-black text-white max-w-lg"
            >
                <DialogHeader>
                    <DialogTitle>Enviar correo corporativo</DialogTitle>
                </DialogHeader>

                {user && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">
                                Destinatario
                            </label>
                            <div className="bg-[#1A202C] px-3 py-2 rounded-md border-2 border-black text-gray-300">
                                {user.nickname} ({user.email})
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">
                                Asunto *
                            </label>
                            <Input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Escribe el asunto del correo..."
                                disabled={sending}
                                className="bg-[#1A202C] border-2 border-black text-white"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">
                                Mensaje *
                            </label>
                            <Textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Escribe el mensaje..."
                                rows={6}
                                disabled={sending}
                                className="bg-[#1A202C] border-2 border-black text-white resize-none"
                            />
                        </div>

                        <p className="text-xs text-gray-400">
                            El correo se enviará desde info@cambiocromos.com con el estilo corporativo de CambioCromos.
                        </p>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button
                        onClick={handleSend}
                        disabled={sending || !subject.trim() || !body.trim()}
                    >
                        {sending ? 'Enviando...' : 'Enviar correo'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={sending}
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
