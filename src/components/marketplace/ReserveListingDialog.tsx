'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import {
  getListingChatParticipants,
  ChatParticipant,
} from '@/lib/supabase/listings/chat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserLink } from '@/components/ui/user-link';

interface ReserveListingDialogProps {
  listingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserve: (buyerId: string) => Promise<void>;
  processing?: boolean;
}

export function ReserveListingDialog({
  listingId,
  open,
  onOpenChange,
  onReserve,
  processing = false,
}: ReserveListingDialogProps) {
  const supabase = useSupabaseClient();
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchParticipants() {
      if (!open) return;

      setLoading(true);
      const { data } = await getListingChatParticipants(supabase, listingId);
      setParticipants(data.filter(p => !p.is_owner));
      setLoading(false);
    }

    void fetchParticipants();
  }, [open, supabase, listingId]);

  const handleReserve = async () => {
    if (!selectedBuyerId) return;
    await onReserve(selectedBuyerId);
    setSelectedBuyerId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar Anuncio</DialogTitle>
          <DialogDescription>
            Selecciona el comprador que ha contactado contigo para reservar este
            anuncio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No hay compradores interesados aún.</p>
              <p className="text-sm mt-2">
                Espera a que alguien te contacte a través del chat.
              </p>
            </div>
          ) : (
            <>
              <Label>Selecciona el comprador</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {participants.map(participant => (
                  <button
                    key={participant.user_id}
                    type="button"
                    onClick={() => setSelectedBuyerId(participant.user_id)}
                    className={`w-full text-left p-3 rounded-md border-2 transition-all ${
                      selectedBuyerId === participant.user_id
                        ? 'border-[#FFC000] bg-[#FFC000]/10'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <UserLink
                        userId={participant.user_id}
                        nickname={participant.nickname}
                        variant="bold"
                        disabled={true} // Keep as text since this is inside a button
                      />
                      {participant.unread_count > 0 && (
                        <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {participant.unread_count} mensajes
                        </span>
                      )}
                    </div>
                    {participant.last_message && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {participant.last_message}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReserve}
            disabled={!selectedBuyerId || processing || loading}
            className="bg-[#FFC000] text-black hover:bg-yellow-400"
          >
            {processing ? 'Reservando...' : 'Reservar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
