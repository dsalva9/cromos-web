'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2, Trash2 } from 'lucide-react';
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

interface TemplateRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateTitle: string;
  currentRating?: number | null;
  currentComment?: string | null;
  currentRatingId?: string | null;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TemplateRatingDialog({
  open,
  onOpenChange,
  templateTitle,
  currentRating,
  currentComment,
  currentRatingId,
  onSubmit,
  onDelete
}: TemplateRatingDialogProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [comment, setComment] = useState<string>(currentComment || '');
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!currentRatingId;

  // Update local state when props change
  useEffect(() => {
    if (open) {
      setRating(currentRating || 0);
      setComment(currentComment || '');
      setShowDeleteConfirm(false);
    }
  }, [open, currentRating, currentComment]);

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
      toast.success(
        isEditing
          ? 'Valoración actualizada con éxito'
          : 'Valoración creada con éxito'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar valoración'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setLoading(true);
    try {
      await onDelete();
      toast.success('Valoración eliminada con éxito');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar valoración'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-md">
        {showDeleteConfirm ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription className="text-slate-400">
                ¿Estás seguro de que quieres eliminar tu valoración? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Actualizar valoración' : 'Valorar plantilla'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {templateTitle}
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
                    {rating === 1 && 'Muy mala'}
                    {rating === 2 && 'Mala'}
                    {rating === 3 && 'Aceptable'}
                    {rating === 4 && 'Buena'}
                    {rating === 5 && 'Excelente'}
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
                  placeholder="Comparte tu opinión sobre esta plantilla..."
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
              {isEditing && onDelete && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="mr-auto border-red-600 text-red-500 hover:bg-red-600/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              )}
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
                    Guardando...
                  </>
                ) : (
                  <>{isEditing ? 'Actualizar' : 'Enviar valoración'}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
