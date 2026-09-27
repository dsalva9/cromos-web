'use client';

import { useEffect, useRef, useState, useCallback, Fragment } from 'react';
import {
  X,
  Info,
  ArrowLeft,
  MoreVertical,
  Flag,
  Ban,
  Star,
  EyeOff,
  Trash2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useListingChat } from '@/hooks/marketplace/useListingChat';
import { useTradeConfirmations } from '@/hooks/marketplace/useTradeConfirmations';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { ChatDateSeparator } from './ChatDateSeparator';
import { UserRatingDialog } from '@/components/marketplace/UserRatingDialog';
import { ReportModal } from '@/components/social/ReportModal';
import { ProBadge, ProAvatarRing } from '@/components/ui/ProBadge';
import { cn } from '@/lib/utils';
import { isSameDay } from '@/lib/chatDate';
import { useTranslations, useLocale } from 'next-intl';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { useIgnore } from '@/hooks/social/useIgnore';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { triggerInAppReview } from '@/lib/inAppReview';
import { containsUrl, containsForbiddenAppText } from '@/lib/validations/chat';
import {
  deleteMarketplaceConversation,
  hideMarketplaceConversation,
} from '@/lib/supabase/listings/chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Listing } from '@/types/v1.6.0';

export interface MarketplaceChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  initialParticipantId?: string | null;
  onHide?: () => void;
  onDelete?: () => void;
  /** When true, renders in page mode (non-modal on desktop, fullscreen on mobile) */
  isPage?: boolean;
}

export function MarketplaceChatDrawer({
  isOpen,
  onClose,
  listingId,
  initialParticipantId,
  onHide,
  onDelete,
  isPage = false,
}: MarketplaceChatDrawerProps) {
  const t = useTranslations('marketplaceChat');
  const t_match = useTranslations('matchChat');
  const t_chats = useTranslations('chats');
  const t_tc = useTranslations('tradeConfirmations');
  const locale = useLocale();
  const { user } = useUser();
  const supabase = useSupabaseClient();

  // Basic UI states
  const [showListingInfo, setShowListingInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [chatTermsDialogOpen, setChatTermsDialogOpen] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  // Hide & Delete dialog states
  const [showHideModal, setShowHideModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hidingChat, setHidingChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  // Ignore / block hook
  const { ignoreUser, loading: ignoreLoading } = useIgnore();

  // Listing data
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingOwner, setListingOwner] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [listingUnavailable, setListingUnavailable] = useState(false);

  // Selected participant for seller
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    initialParticipantId || null
  );

  // Counterparty profile state
  const [counterpartyNickname, setCounterpartyNickname] = useState<string>('Usuario');
  const [counterpartyAvatarUrl, setCounterpartyAvatarUrl] = useState<string | null>(null);
  const [counterpartyIsPro, setCounterpartyIsPro] = useState(false);
  const [counterpartyIsPatron, setCounterpartyIsPatron] = useState(false);
  const [counterpartyDeleted, setCounterpartyDeleted] = useState(false);

  // Transactions / reservation state
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [unreserving, setUnreserving] = useState(false);

  // Rating eligibility
  const [canRate, setCanRate] = useState(false);
  const [existingRating, setExistingRating] = useState<{ rating: number; comment: string | null } | null>(null);

  // Chat hook
  const {
    messages,
    participants,
    loading: chatLoading,
    sending,
    uploading,
    sendMessage,
    fetchParticipants,
    markAsRead,
    messagesEndRef,
  } = useListingChat({
    listingId,
    participantId: selectedParticipant || undefined,
    enableRealtime: isOpen,
  });

  // Sync initialParticipantId when passed or changed
  useEffect(() => {
    if (initialParticipantId) {
      setSelectedParticipant(initialParticipantId);
    }
  }, [initialParticipantId]);

  // Auto-select if there's only 1 participant and none selected
  useEffect(() => {
    if (isOwner && !selectedParticipant && participants.length === 1) {
      setSelectedParticipant(participants[0].user_id);
    }
  }, [isOwner, selectedParticipant, participants]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Determine effective counterparty ID
  const effectiveParticipantId = isOwner ? selectedParticipant : listingOwner;

  // Trade confirmations hook
  const {
    pendingConfirmation,
    pendingForMe,
    pendingByMe,
    shouldShowNudge,
    requestConfirmation,
    confirmTrade,
    dismissConfirmation,
    submitting: confirmationSubmitting,
  } = useTradeConfirmations({
    listingId,
    participantId: effectiveParticipantId || '',
    messages,
  });

  // Confirmation nudge state
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [showNudgeForm, setShowNudgeForm] = useState(false);
  const [nudgeStickerCount, setNudgeStickerCount] = useState<string>('');
  const [nudgeNote, setNudgeNote] = useState<string>('');

  // Manual trade confirmation modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStickerCount, setManualStickerCount] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');

  // Fetch listing details
  useEffect(() => {
    if (!isOpen || !listingId) return;

    async function fetchListing() {
      const { data: listingData, error: listingError } = await supabase
        .from('trade_listings')
        .select(`
          id,
          user_id,
          title,
          description,
          sticker_number,
          collection_name,
          image_url,
          status,
          created_at
        `)
        .eq('id', listingId)
        .maybeSingle();

      if (listingError || !listingData) {
        logger.warn('Listing not found or unavailable');
        setListingUnavailable(true);
        return;
      }

      if (listingData.status === 'archived' || listingData.status === 'removed') {
        setListingUnavailable(true);
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, is_suspended, deleted_at, is_admin, completed_trades, is_pro, is_patron')
        .eq('id', listingData.user_id)
        .maybeSingle();

      const fullListing: Listing = {
        id: listingData.id,
        user_id: listingData.user_id,
        author_nickname: profileData?.nickname || 'Usuario',
        author_avatar_url: profileData?.avatar_url || null,
        title: listingData.title,
        description: listingData.description,
        sticker_number: listingData.sticker_number,
        collection_name: listingData.collection_name,
        image_url: listingData.image_url,
        status: listingData.status as 'active' | 'sold' | 'removed',
        views_count: 0,
        created_at: listingData.created_at ?? '',
        author_completed_trades: profileData?.completed_trades || 0,
      };

      setListing(fullListing);
      setListingOwner(listingData.user_id);
      setIsOwner(user?.id === listingData.user_id);

      // If viewer is buyer, set counterparty info to seller
      if (user?.id !== listingData.user_id) {
        setCounterpartyNickname(profileData?.nickname || 'Usuario');
        setCounterpartyAvatarUrl(profileData?.avatar_url || null);
        setCounterpartyIsPro(!!profileData?.is_pro);
        setCounterpartyIsPatron(!!profileData?.is_patron);
        setCounterpartyDeleted(!!(profileData?.is_suspended || profileData?.deleted_at));
      }
    }

    void fetchListing();
  }, [isOpen, listingId, user, supabase]);

  // Fetch participants if viewer is owner
  useEffect(() => {
    if (isOpen && isOwner) {
      void fetchParticipants();
    }
  }, [isOpen, isOwner, fetchParticipants]);

  // Auto-select participant if owner and only 1 conversation exists
  useEffect(() => {
    if (isOwner && participants.length === 1 && !selectedParticipant) {
      setSelectedParticipant(participants[0].user_id);
    }
  }, [isOwner, participants, selectedParticipant]);

  // Update counterparty info when viewer is seller and selectedParticipant changes
  useEffect(() => {
    if (!isOwner || !selectedParticipant) return;
    const participantId = selectedParticipant;

    async function fetchParticipantProfile() {
      const part = participants.find((p) => p.user_id === participantId);
      if (part) {
        setCounterpartyNickname(part.nickname);
        setCounterpartyAvatarUrl(part.avatar_url);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, is_pro, is_patron, is_suspended, deleted_at')
        .eq('id', participantId)
        .maybeSingle();

      if (profile) {
        setCounterpartyNickname(profile.nickname || part?.nickname || 'Usuario');
        setCounterpartyAvatarUrl(profile.avatar_url || part?.avatar_url || null);
        setCounterpartyIsPro(!!profile.is_pro);
        setCounterpartyIsPatron(!!profile.is_patron);
        setCounterpartyDeleted(!!(profile.is_suspended || profile.deleted_at));
      }
    }

    void fetchParticipantProfile();
  }, [isOwner, selectedParticipant, participants, supabase]);

  // Fetch transaction status
  useEffect(() => {
    if (!listing || !user || (listing.status !== 'reserved' && listing.status !== 'completed')) {
      setTransactionStatus(null);
      return;
    }

    async function fetchTransaction() {
      const { data } = await supabase.rpc('get_listing_transaction', {
        p_listing_id: listingId,
      });

      if (data && Array.isArray(data) && data.length > 0) {
        setTransactionStatus(data[0].status);
      }
    }

    void fetchTransaction();
  }, [listing, listingId, supabase, user]);

  // Check rating eligibility for counterparty
  useEffect(() => {
    if (!isOpen || !effectiveParticipantId || !user) {
      setCanRate(false);
      return;
    }
    const targetUserId = effectiveParticipantId;

    async function checkRating() {
      try {
        const { data: eligibility } = await supabase.rpc('can_rate_user', {
          p_target_id: targetUserId,
        });
        const canRateResult = Array.isArray(eligibility) ? eligibility[0]?.can_rate : false;
        setCanRate(canRateResult === true);

        if (canRateResult) {
          const { data: myRating } = await supabase.rpc('get_my_rating_for_user', {
            p_rated_id: targetUserId,
          });
          if (myRating && myRating.length > 0) {
            setExistingRating({ rating: myRating[0].rating, comment: myRating[0].comment });
          } else {
            setExistingRating(null);
          }
        }
      } catch {
        // Non-critical
      }
    }

    void checkRating();
  }, [isOpen, effectiveParticipantId, user, supabase]);

  // Mark as read when active
  useEffect(() => {
    if (!isOpen || chatLoading || messages.length === 0 || !user || !effectiveParticipantId) return;
    const targetId = effectiveParticipantId;

    const hasUnread = messages.some((m) => m.receiver_id === user.id && !m.is_read);
    if (hasUnread) {
      void markAsRead(targetId);
    }
  }, [isOpen, chatLoading, messages, user, effectiveParticipantId, markAsRead]);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, messagesEndRef]);

  // Send message handler
  const handleComposerSend = useCallback(
    async (text: string, file?: File | Blob | null) => {
      if ((!text.trim() && !file) || sending || uploading) return;

      if (text.trim() && containsUrl(text)) {
        toast.error('No se permiten enlaces o URLs en los mensajes del chat.');
        return;
      }

      if (text.trim() && containsForbiddenAppText(text)) {
        toast.error('No se permite publicidad de otras apps.');
        return;
      }

      if (!isOwner && messages.length === 0 && !tosAccepted) {
        toast.error('Debes aceptar los términos y condiciones antes de enviar un mensaje');
        return;
      }

      const receiverId = isOwner ? selectedParticipant || undefined : listingOwner || undefined;

      await sendMessage(text, receiverId, file);
    },
    [sending, uploading, isOwner, messages.length, tosAccepted, selectedParticipant, listingOwner, sendMessage]
  );

  // Reserve listing handler
  const handleReserve = useCallback(async () => {
    if (!listing || !isOwner || !selectedParticipant) return;

    if (!confirm(`¿Seguro que quieres reservar este anuncio para ${counterpartyNickname}?`)) {
      return;
    }

    setReserving(true);
    try {
      const { error: reserveError } = await supabase.rpc('reserve_listing', {
        p_listing_id: listingId,
        p_buyer_id: selectedParticipant,
        p_note: undefined,
      });

      if (reserveError) throw reserveError;

      toast.success(`Anuncio reservado para ${counterpartyNickname}`);
      setListing((prev) => (prev ? { ...prev, status: 'reserved' } : null));
      setTransactionStatus('reserved');
    } catch (err) {
      logger.error('Error reserving listing:', err);
      toast.error('Error al reservar el anuncio');
    } finally {
      setReserving(false);
    }
  }, [listing, isOwner, selectedParticipant, counterpartyNickname, supabase, listingId]);

  // Unreserve listing handler
  const handleUnreserve = useCallback(async () => {
    if (!listing || !isOwner) return;

    if (!confirm(`¿Seguro que quieres liberar la reserva con ${counterpartyNickname}? El anuncio volverá a estar disponible.`)) {
      return;
    }

    setUnreserving(true);
    try {
      const { error: unreserveError } = await supabase.rpc('unreserve_listing', {
        p_listing_id: listingId,
      });

      if (unreserveError) throw unreserveError;

      toast.success('Reserva liberada. El anuncio vuelve a estar disponible.');
      setListing((prev) => (prev ? { ...prev, status: 'active' } : null));
      setTransactionStatus(null);
    } catch (err) {
      logger.error('Error unreserving listing:', err);
      toast.error('Error al liberar la reserva');
    } finally {
      setUnreserving(false);
    }
  }, [listing, isOwner, counterpartyNickname, supabase, listingId]);

  // Confirm Hide
  const handleConfirmHide = useCallback(async () => {
    const targetId = effectiveParticipantId;
    if (!targetId) return;
    setHidingChat(true);
    setShowHideModal(false);
    try {
      const { error } = await hideMarketplaceConversation(supabase, listingId, targetId);
      if (error) throw error;
      toast.success(t_chats('hide.success'));
      if (onHide) {
        onHide();
      } else if (isOwner && participants.length > 1) {
        setSelectedParticipant(null);
        void fetchParticipants();
      } else {
        onClose();
      }
    } catch (err) {
      logger.error('Error hiding chat:', err);
      toast.error(t_chats('hide.error'));
    } finally {
      setHidingChat(false);
    }
  }, [effectiveParticipantId, supabase, listingId, t_chats, onHide, isOwner, participants.length, fetchParticipants, onClose]);

  // Confirm Delete
  const handleConfirmDelete = useCallback(async () => {
    const targetId = effectiveParticipantId;
    if (!targetId) return;
    setDeletingChat(true);
    setShowDeleteModal(false);
    try {
      const { error } = await deleteMarketplaceConversation(supabase, listingId, targetId);
      if (error) throw error;
      toast.success(t_chats('delete.success'));
      if (onDelete) {
        onDelete();
      } else if (isOwner && participants.length > 1) {
        setSelectedParticipant(null);
        void fetchParticipants();
      } else {
        onClose();
      }
    } catch (err) {
      logger.error('Error deleting chat:', err);
      toast.error(t_chats('delete.error'));
    } finally {
      setDeletingChat(false);
    }
  }, [effectiveParticipantId, supabase, listingId, t_chats, onDelete, isOwner, participants.length, fetchParticipants, onClose]);

  // Handle back button
  const handleBack = () => {
    if (isOwner && participants.length > 1 && selectedParticipant) {
      setSelectedParticipant(null);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // View state: Seller has multiple inquiries and has not selected one yet
  const showParticipantSelector = isOwner && participants.length > 1 && !selectedParticipant;

  return (
    <>
      {/* Overlay: when modal drawer on desktop */}
      {!isPage && (
        <div
          className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Main panel */}
      <div
        className={cn(
          'flex flex-col bg-white dark:bg-gray-900',
          // Mobile: Always full screen covering navigation and ads
          'fixed inset-0 z-[110]',
          // Desktop: Modal drawer OR page container
          isPage
            ? 'sm:relative sm:inset-auto sm:z-auto sm:w-full sm:max-w-2xl sm:mx-auto sm:my-6 sm:h-[680px] sm:max-h-[85vh] sm:rounded-2xl sm:border-2 sm:border-black sm:shadow-2xl sm:overflow-hidden'
            : 'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl sm:border-2 sm:border-black sm:shadow-2xl'
        )}
      >
        {/* ==================================================================== */}
        {/* PARTICIPANT SELECTOR VIEW (Seller with multiple buyers)               */}
        {/* ==================================================================== */}
        {showParticipantSelector ? (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
            >
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-gold hover:text-yellow-600 font-bold text-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver</span>
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                  {listing?.title || t('conversations')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {participants.length} {t('conversations').toLowerCase()}
                </p>
              </div>

              {listing && (
                <button
                  onClick={() => setShowListingInfo(true)}
                  className="text-gray-400 hover:text-gold transition-colors p-1"
                  title={t('listingInfo')}
                >
                  <Info className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="hidden sm:flex text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Participants list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('chooseBuyer')}
              </p>
              {participants.map((participant) => (
                <button
                  key={participant.user_id}
                  onClick={() => setSelectedParticipant(participant.user_id)}
                  className="w-full text-left p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gold dark:hover:border-gold hover:bg-gold/5 dark:hover:bg-gold/5 transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {participant.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={participant.avatar_url} alt={participant.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gold">
                        {participant.nickname.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {participant.nickname}
                      </p>
                      {participant.unread_count > 0 && (
                        <span className="bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {participant.unread_count}
                        </span>
                      )}
                    </div>
                    {participant.last_message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {participant.last_message}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ==================================================================== */
          /* ACTIVE CHAT VIEW (Identical to ChatDrawer / Match Chat)              */
          /* ==================================================================== */
          <>
            {/* ---- Top Header ---- */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
            >
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-gold hover:text-yellow-600 font-bold text-sm sm:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver</span>
              </button>

              {/* Avatar */}
              <ProAvatarRing isPro={counterpartyIsPro && !counterpartyDeleted} size="sm">
                <div className="w-9 h-9 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {counterpartyAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={counterpartyAvatarUrl} alt={counterpartyNickname} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gold">
                      {counterpartyNickname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </ProAvatarRing>

              {/* Nickname + Subtitle */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {effectiveParticipantId && !counterpartyDeleted ? (
                    <Link
                      href={`/users/${effectiveParticipantId}`}
                      className="font-bold text-gray-900 dark:text-white truncate text-sm hover:text-gold transition-colors"
                    >
                      {counterpartyNickname}
                    </Link>
                  ) : (
                    <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                      {counterpartyNickname}
                    </p>
                  )}
                  {counterpartyIsPro && !counterpartyDeleted && <ProBadge size="sm" />}
                  {counterpartyIsPatron && !counterpartyDeleted && !counterpartyIsPro && (
                    <span className="inline-flex items-center text-[10px]" title="Patrón">
                      ☕
                    </span>
                  )}
                </div>
                {listing?.title && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {listing.title}
                  </p>
                )}
              </div>

              {/* Info button */}
              <button
                onClick={() => setShowListingInfo(true)}
                className="text-gray-400 hover:text-gold transition-colors p-1"
                title={t('listingInfo')}
              >
                <Info className="w-5 h-5" />
              </button>

              {/* Rate button (if eligible) */}
              {canRate && effectiveParticipantId && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className={cn(
                    'transition-colors p-1',
                    existingRating
                      ? 'text-gold hover:text-yellow-400'
                      : 'text-gray-400 hover:text-gold'
                  )}
                  title={existingRating ? t_match('updateRating') : t_match('rateUser')}
                >
                  <Star className={cn('w-5 h-5', existingRating && 'fill-current')} />
                </button>
              )}

              {/* 3-dots Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1"
                  aria-label="Más opciones"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl min-w-[190px] py-1">
                      {/* Seller reserve / unreserve actions */}
                      {isOwner && listing?.status === 'active' && !transactionStatus && selectedParticipant && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            void handleReserve();
                          }}
                          disabled={reserving}
                          className="w-full px-4 py-2 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 transition-colors font-medium"
                        >
                          <Package className="w-4 h-4" />
                          {reserving ? t('reserving') : t('reserve')}
                        </button>
                      )}
                      {isOwner && listing?.status === 'reserved' && transactionStatus === 'reserved' && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            void handleUnreserve();
                          }}
                          disabled={unreserving}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          {unreserving ? t('unreserving') : t('unreserve')}
                        </button>
                      )}

                      {/* Hide conversation */}
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowHideModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <EyeOff className="w-4 h-4 text-amber-500" />
                        {t_match('hideChat')}
                      </button>

                      {/* Delete conversation */}
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t_match('deleteChat')}
                      </button>

                      {/* Report user */}
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <Flag className="w-4 h-4" />
                        {t_match('reportUser')}
                      </button>

                      {/* Block user */}
                      <button
                        disabled={ignoreLoading}
                        onClick={async () => {
                          if (!effectiveParticipantId) return;
                          const ok = await ignoreUser(effectiveParticipantId);
                          if (ok) {
                            setShowMenu(false);
                            onClose();
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        {t_match('blockUser')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Close button (desktop) */}
              <button
                onClick={onClose}
                className="hidden sm:flex text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Banners */}
            {counterpartyDeleted && (
              <div className="p-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('userNoLongerAvailable')}
                </p>
              </div>
            )}
            {listingUnavailable && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-center flex-shrink-0">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  {t('listingNoLongerAvailable')}
                </p>
              </div>
            )}

            {/* ---- Messages Area ---- */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-8 w-8 border-3 border-gold border-r-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500 px-4">
                  <span className="text-4xl mb-3">💬</span>
                  <p className="text-sm">{t('noMessages')}</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const showDateSep =
                      index === 0 || !isSameDay(msg.created_at, messages[index - 1].created_at);

                    return (
                      <Fragment key={msg.id}>
                        {showDateSep && <ChatDateSeparator date={msg.created_at} locale={locale} />}
                        <MessageBubble message={msg} isOwn={msg.sender_id === user?.id} />
                      </Fragment>
                    );
                  })}

                  {/* Confirmation Banner (when pending for current user) */}
                  {pendingConfirmation && pendingForMe && !listingUnavailable && !counterpartyDeleted && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-gold rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                      <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">📬</span>
                        <div className="text-left">
                          <p className="font-semibold">
                            {t_tc('bannerTitle', { nickname: counterpartyNickname })}
                          </p>
                          {(pendingConfirmation.sticker_count || pendingConfirmation.note) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {pendingConfirmation.sticker_count &&
                                `Cromos: ${pendingConfirmation.sticker_count}`}
                              {pendingConfirmation.sticker_count &&
                                pendingConfirmation.note &&
                                ' · '}
                              {pendingConfirmation.note && `Nota: "${pendingConfirmation.note}"`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => confirmTrade(pendingConfirmation.id)}
                          disabled={confirmationSubmitting}
                          className="bg-gold text-black hover:bg-yellow-400 font-bold flex-1 sm:flex-initial"
                        >
                          {t_tc('bannerConfirm')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissConfirmation(pendingConfirmation.id)}
                          disabled={confirmationSubmitting}
                          className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex-1 sm:flex-initial"
                        >
                          {t_tc('bannerDismiss')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Banner when I requested it and it is still pending */}
                  {pendingConfirmation && pendingByMe && (
                    <div className="bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-4 text-xs text-center text-gray-500 dark:text-gray-400">
                      📬 Solicitud de confirmación de intercambio pendiente de aprobación por el otro usuario.
                    </div>
                  )}

                  {/* Nudge card */}
                  {shouldShowNudge && !nudgeDismissed && !showNudgeForm && (
                    <div className="flex justify-center my-4 w-full">
                      <div className="bg-yellow-50/50 dark:bg-yellow-950/20 border-2 border-gold rounded-lg p-4 w-full max-w-[95%] sm:max-w-[85%] text-center space-y-3">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {t_tc('nudgeTitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setShowNudgeForm(true)}
                            className="bg-gold text-gold-foreground font-bold w-full sm:w-auto"
                          >
                            {t_tc('nudgeConfirm')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setNudgeDismissed(true)}
                            className="text-gray-500 hover:text-gray-900 dark:hover:text-white w-full sm:w-auto"
                          >
                            {t_tc('nudgeNotYet')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nudge Form */}
                  {shouldShowNudge && !nudgeDismissed && showNudgeForm && (
                    <div className="bg-yellow-50/30 dark:bg-yellow-950/10 border-2 border-gold rounded-lg p-4 mb-4 space-y-3 text-sm">
                      <h4 className="font-bold text-gray-900 dark:text-white text-center">
                        {t_tc('nudgeConfirm')}
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          {t_tc('stickerCountLabel')}
                        </label>
                        <input
                          type="number"
                          value={nudgeStickerCount}
                          onChange={(e) => setNudgeStickerCount(e.target.value)}
                          placeholder={t_tc('stickerCountPlaceholder')}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Nota (opcional)
                        </label>
                        <input
                          type="text"
                          value={nudgeNote}
                          onChange={(e) => setNudgeNote(e.target.value)}
                          placeholder="Ej: Compra de 5 cromos de la colección"
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-gold text-gold-foreground font-bold flex-1"
                          disabled={confirmationSubmitting}
                          onClick={async () => {
                            const count = nudgeStickerCount ? parseInt(nudgeStickerCount, 10) : undefined;
                            await requestConfirmation(count, nudgeNote || undefined);
                            setShowNudgeForm(false);
                            setNudgeDismissed(true);
                          }}
                        >
                          {t_tc('submitConfirmation')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setShowNudgeForm(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* ---- ToS Acceptance (for buyer before first message) ---- */}
            {!isOwner && messages.length === 0 && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="tos-chat-drawer"
                    checked={tosAccepted}
                    onCheckedChange={(checked) => setTosAccepted(checked === true)}
                  />
                  <label
                    htmlFor="tos-chat-drawer"
                    className="text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    {t('tosAccept')}
                    <button
                      type="button"
                      onClick={() => setChatTermsDialogOpen(true)}
                      className="text-gold hover:underline font-semibold ml-1"
                    >
                      {t('termsAndConditions')}
                    </button>
                  </label>
                </div>
              </div>
            )}

            {/* ---- Composer ---- */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <ChatComposer
                onSend={handleComposerSend}
                sending={sending}
                uploading={uploading}
                disabled={listingUnavailable || counterpartyDeleted}
                placeholder={t('writeMessage')}
                showConfirmButton={messages.length >= 4 && !pendingConfirmation}
                onManualConfirm={() => setShowManualModal(true)}
              />
            </div>
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODALS & DIALOGS                                                     */}
      {/* ==================================================================== */}

      {/* Listing Info Modal */}
      {showListingInfo && listing && (
        <Dialog open={showListingInfo} onOpenChange={setShowListingInfo}>
          <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 w-[95%] max-w-md rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white font-bold text-base">
                {t('listingInfo')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {listing.image_url ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <Image src={listing.image_url} alt={listing.title} fill className="object-cover" />
                </div>
              ) : null}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">{listing.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {listing.collection_name} {listing.sticker_number ? `· #${listing.sticker_number}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                      listing.status === 'active' && 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400',
                      listing.status === 'reserved' && 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
                      listing.status === 'sold' && 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {listing.status === 'active' && t('statusAvailable')}
                    {listing.status === 'reserved' && t('statusReserved')}
                    {listing.status === 'sold' && t('statusSold')}
                  </span>
                </div>
              </div>
              {listing.description && (
                <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Action buttons inside Info modal */}
              {isOwner && listing.status === 'active' && !transactionStatus && selectedParticipant && (
                <Button
                  onClick={() => {
                    setShowListingInfo(false);
                    void handleReserve();
                  }}
                  disabled={reserving}
                  className="w-full bg-gold text-black hover:bg-yellow-400 font-bold text-sm rounded-xl"
                >
                  <Package className="w-4 h-4 mr-2" />
                  {reserving ? t('reserving') : t('reserve')}
                </Button>
              )}
              {isOwner && listing.status === 'reserved' && transactionStatus === 'reserved' && (
                <Button
                  onClick={() => {
                    setShowListingInfo(false);
                    void handleUnreserve();
                  }}
                  disabled={unreserving}
                  variant="outline"
                  className="w-full font-bold text-sm rounded-xl"
                >
                  <Package className="w-4 h-4 mr-2" />
                  {unreserving ? t('unreserving') : t('unreserve')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User Rating Dialog */}
      {showRatingModal && effectiveParticipantId && (
        <UserRatingDialog
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          userToRate={{
            id: effectiveParticipantId,
            nickname: counterpartyNickname,
          }}
          existingRating={existingRating}
          onSubmit={async (rating, comment) => {
            const { error } = await supabase.rpc('upsert_user_rating', {
              p_rated_id: effectiveParticipantId,
              p_rating: rating,
              p_comment: comment || undefined,
            });
            if (error) throw new Error(error.message);
            setExistingRating({ rating, comment: comment || null });
            void triggerInAppReview('marketplace_rating_submitted');
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && effectiveParticipantId && (
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          entityType="user"
          entityId={effectiveParticipantId}
        />
      )}

      {/* Manual Confirmation Request Modal */}
      {showManualModal && (
        <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-xl">📬</span>
                {t_tc('manualButton')}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                {t_tc('bannerTitle', { nickname: counterpartyNickname })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t_tc('stickerCountLabel')}
                </label>
                <input
                  type="number"
                  value={manualStickerCount}
                  onChange={(e) => setManualStickerCount(e.target.value)}
                  placeholder={t_tc('stickerCountPlaceholder')}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Ej: Intercambio acordado en el chat"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowManualModal(false)}
                disabled={confirmationSubmitting}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gold text-gold-foreground font-bold hover:bg-yellow-400"
                disabled={confirmationSubmitting}
                onClick={async () => {
                  const count = manualStickerCount ? parseInt(manualStickerCount, 10) : undefined;
                  await requestConfirmation(count, manualNote || undefined);
                  setShowManualModal(false);
                  setManualStickerCount('');
                  setManualNote('');
                }}
              >
                {t_tc('submitConfirmation')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hide Confirmation Modal */}
      <Dialog open={showHideModal} onOpenChange={setShowHideModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <EyeOff className="w-5 h-5 text-amber-500" />
              {t_chats('hide.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t_chats('hide.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowHideModal(false)}
              disabled={hidingChat}
            >
              {t_chats('hide.cancelButton')}
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmHide}
              disabled={hidingChat}
            >
              {hidingChat ? t('loading') : t_chats('hide.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
              {t_chats('delete.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t_chats('delete.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingChat}
            >
              {t_chats('delete.cancelButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingChat}
            >
              {deletingChat ? t('loading') : t_chats('delete.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Terms Dialog */}
      <Dialog open={chatTermsDialogOpen} onOpenChange={setChatTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 text-gray-200 border-2 border-black">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gold">
              Términos y Condiciones del Chat de CambioCromos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              El chat de CambioCromos está diseñado para facilitar la comunicación entre coleccionistas
              de forma segura y respetuosa. Al utilizarlo, te comprometes a:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-300">
              <li>Tratar con respeto a los demás miembros de la comunidad.</li>
              <li>No compartir contenido ofensivo, discriminatorio o engañoso.</li>
              <li>No realizar spam ni publicidad no autorizada de terceros.</li>
              <li>No incluir enlaces externos ni datos de contacto que infrinjan la política de la plataforma.</li>
              <li>Utilizar el chat exclusivamente para fines relacionados con el intercambio o venta de cromos.</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setTosAccepted(true);
                setChatTermsDialogOpen(false);
              }}
              className="bg-gold text-black hover:bg-yellow-400 font-bold"
            >
              Entendido y Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
