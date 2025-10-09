'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AlbumPageData } from '@/hooks/album';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical } from 'lucide-react';
import { toast } from '@/lib/toast';

interface PageHeaderProps {
  page: AlbumPageData;
  onMarkPageComplete?: (pageId: number) => Promise<void>;
}

export default function PageHeader({
  page,
  onMarkPageComplete,
}: PageHeaderProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const progress =
    page.total_slots > 0 ? (page.owned_slots / page.total_slots) * 100 : 0;

  const missingCount = page.total_slots - page.owned_slots;
  const isTeamPage = page.kind === 'team';
  const hasMissing = missingCount > 0;
  const showCompleteButton = isTeamPage && hasMissing && onMarkPageComplete;
  const canComplete = isTeamPage && hasMissing && onMarkPageComplete;

  const handleConfirmComplete = async () => {
    if (!onMarkPageComplete) return;

    setIsCompleting(true);
    try {
      await onMarkPageComplete(page.id);
      setShowConfirmDialog(false);
      setShowActionSheet(false);
      toast.success('Equipo completado ✔️');
    } catch (error) {
      logger.error('Error completing page:', error);
      // Error toast is handled by the hook
    } finally {
      setIsCompleting(false);
    }
  };

  // Long-press handlers
  const startLongPress = useCallback(() => {
    if (!canComplete) return;

    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      setShowActionSheet(true);
      setIsLongPressing(false);
    }, 600);
  }, [canComplete]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleActionSheetComplete = async () => {
    await handleConfirmComplete();
  };

  return (
    <>
      <div className="sticky bottom-0 z-20 bg-gray-900 border-t-2 border-black py-3 shadow-xl">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4">
          {/* Desktop: Team title */}
          <div className="hidden sm:flex items-center gap-4 flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-black uppercase text-white truncate">
              {page.title}
            </h2>
          </div>

          {/* Mobile: Long-press area with title + progress */}
          <div
            className="flex sm:hidden flex-1 min-w-0 cursor-pointer select-none"
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (canComplete) setShowActionSheet(true);
              }
            }}
            tabIndex={canComplete ? 0 : -1}
            role="button"
            aria-label={
              canComplete
                ? `Mantén presionado para completar ${page.title}`
                : page.title
            }
            style={{
              opacity: isLongPressing ? 0.7 : 1,
              transition: 'opacity 0.1s',
            }}
          >
            <h2 className="text-lg font-black uppercase text-white truncate">
              {page.title}
            </h2>
          </div>

          {/* Progress bar */}
          <div className="flex w-full sm:max-w-xs items-center justify-center gap-4">
            <Progress
              value={progress}
              className="h-2 w-full bg-gray-700 border border-black rounded-md"
              indicatorClassName="bg-[#FFC000]"
            />
            <span className="flex-shrink-0 text-sm font-black text-[#FFC000] uppercase">
              Tengo {page.owned_slots} / {page.total_slots}
            </span>
          </div>

          {/* Mobile: Overflow menu button */}
          {canComplete && (
            <button
              onClick={() => setShowActionSheet(true)}
              className="md:hidden p-2 rounded-md hover:bg-gray-800 transition-colors border-2 border-transparent hover:border-black"
              aria-label="Más opciones"
            >
              <MoreVertical className="w-5 h-5 text-gray-300" />
            </button>
          )}

          {/* Desktop: Complete button */}
          {showCompleteButton && (
            <div className="hidden md:flex items-center">
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowConfirmDialog(true)}
                className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-black uppercase border-2 border-black rounded-md shadow-xl"
              >
                Marcar equipo completo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-900 border-2 border-black text-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl">Confirmar completar equipo</DialogTitle>
            <DialogDescription className="text-gray-300 font-medium">
              Vas a marcar {missingCount} cromos de <strong>{page.title}</strong>{' '}
              como TENGO. No se tocarán REPES. ¿Confirmas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isCompleting}
              className="bg-gray-800 text-white hover:bg-gray-700 border-2 border-black font-bold uppercase rounded-md"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmComplete}
              disabled={isCompleting}
              className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase rounded-md shadow-xl"
            >
              {isCompleting ? 'Completando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile: Action Sheet (Bottom Sheet) */}
      <Dialog open={showActionSheet} onOpenChange={setShowActionSheet}>
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 bg-gray-900 border-2 border-black border-b-0 bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-xl rounded-b-none shadow-2xl"
          showCloseButton={false}
        >
          <div className="flex flex-col gap-2 p-4">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg font-black uppercase text-white">
                {page.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-300 font-medium">
                Marcar {missingCount} cromos como TENGO. No se tocarán REPES.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="default"
                onClick={handleActionSheetComplete}
                disabled={isCompleting}
                className="w-full bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-black uppercase h-12 text-base border-2 border-black rounded-md shadow-xl"
              >
                {isCompleting
                  ? 'Completando...'
                  : 'Marcar todo el equipo como completado'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowActionSheet(false)}
                disabled={isCompleting}
                className="w-full h-12 text-base bg-gray-800 text-white hover:bg-gray-700 border-2 border-black font-bold uppercase rounded-md"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}





