'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface UserRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToRate: {
    id: string;
    nickname: string;
  };
  listingTitle: string;
  listingId: number; // For rating context
  onSubmit: (rating: number, comment?: string) => Promise<void>;
}

export function UserRatingDialog({
  open,
  onOpenChange,
  userToRate,
  listingTitle,
  listingId: _listingId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Used by parent's onSubmit callback
  onSubmit
}: UserRatingDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setRating(0);
      setComment('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una valoración');
      return;
    }

    if (comment.length > 280) {
      toast.error('El comentario no puede exceder 280 caracteres');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(rating, comment || undefined);
      toast.success('Valoración enviada con éxito');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al enviar valoración'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle>Valorar a {userToRate.nickname}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Transacción: {listingTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Tu valoración <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#FFC000] rounded"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? 'fill-[#FFC000] text-[#FFC000]'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-slate-400">
                {rating === 1 && 'Muy mala experiencia'}
                {rating === 2 && 'Mala experiencia'}
                {rating === 3 && 'Experiencia aceptable'}
                {rating === 4 && 'Buena experiencia'}
                {rating === 5 && 'Excelente experiencia'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Comentario (opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte tu experiencia con este usuario..."
              maxLength={280}
              rows={4}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            />
            <p className="text-xs text-slate-500 text-right">
              {comment.length}/280 caracteres
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar valoración'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
