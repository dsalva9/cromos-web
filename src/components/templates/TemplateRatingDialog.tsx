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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('templates.ratingDialog');
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
      toast.error(t('selectRatingError'));
      return;
    }

    if (comment.length > 280) {
      toast.error(t('commentLengthError'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(rating, comment || undefined);
      toast.success(
        isEditing
          ? t('updateSuccess')
          : t('createSuccess')
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('saveError')
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
      toast.success(t('deleteSuccess'));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('deleteError')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 max-w-md">
        {showDeleteConfirm ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                {t('confirmDeleteDesc')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('deleteBtn')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? t('updateTitle') : t('rateTitle')}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                {templateTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('yourRating')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gold rounded"
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${star <= (hoveredStar || rating)
                            ? 'fill-gold text-gold'
                            : 'text-gray-300 dark:text-gray-600'
                          }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {rating === 1 && t('rating1')}
                    {rating === 2 && t('rating2')}
                    {rating === 3 && t('rating3')}
                    {rating === 4 && t('rating4')}
                    {rating === 5 && t('rating5')}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('commentLabel')}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('commentPlaceholder')}
                  maxLength={280}
                  rows={4}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                  {t('charsLeft', { current: comment.length })}
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
                  {t('deleteBtn')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className="bg-gold text-black hover:bg-gold-light"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>{isEditing ? t('updateBtn') : t('sendBtn')}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
