'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useListingChat } from '@/hooks/marketplace/useListingChat';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Send, Package, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Listing } from '@/types/v1.6.0';
import Link from 'next/link';
import Image from 'next/image';
import { UserRatingDialog } from '@/components/marketplace/UserRatingDialog';
import { FloatingActionMenu } from '@/components/chat/FloatingActionMenu';
import { logger } from '@/lib/logger';

function ListingChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const listingId = parseInt(params.id as string, 10);

  const [messageText, setMessageText] = useState('');
  const [listingOwner, setListingOwner] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [unreserving, setUnreserving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<{ buyer_id: string } | null>(null);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isReservedBuyer, setIsReservedBuyer] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [counterpartyToRate, setCounterpartyToRate] = useState<{ id: string; nickname: string } | null>(null);
  const [myRating, setMyRating] = useState<{ rating: number; comment: string | null } | null>(null);
  const [counterpartyRating, setCounterpartyRating] = useState<{ rating: number; comment: string | null } | null>(null);
  const [bothRated, setBothRated] = useState(false);
  const [listingAccessDenied, setListingAccessDenied] = useState(false);
  const [chatTermsDialogOpen, setChatTermsDialogOpen] = useState(false);
  const [listingCardExpanded, setListingCardExpanded] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);



  const {
    messages,
    participants,
    loading,
    sending,
    sendMessage,
    fetchParticipants,
    messagesEndRef,
  } = useListingChat({
    listingId,
    participantId: selectedParticipant || undefined,
  });

  // Fetch listing details
  useEffect(() => {
    async function fetchListing() {
      // First get basic listing data from trade_listings table
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

      if (listingError) {
        logger.error('Error fetching listing:', listingError);
        setListingAccessDenied(true);
        // Don't return - we can still show chat even if listing fetch fails
        return;
      }

      if (!listingData) {
        logger.warn('Listing not found or access denied - continuing with chat only');
        setListingAccessDenied(true);
        // Don't return or show error - user may still have chat access
        // The chat will work, but listing card won't show
        return;
      }

      // Get author info including suspension and deletion status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, is_suspended, deleted_at, is_admin')
        .eq('id', listingData.user_id)
        .single();

      // Check if current user is admin
      const { data: currentUserProfile } = user ? await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single() : { data: null };

      const isCurrentUserAdmin = currentUserProfile?.is_admin || false;

      // Block access if author is suspended or deleted and viewer is not admin
      if (profileData && !isCurrentUserAdmin) {
        if (profileData.is_suspended || profileData.deleted_at) {
          setListingAccessDenied(true);
          return;
        }
      }

      // Combine data to match Listing interface
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
        views_count: 0, // Not needed for chat view
        created_at: listingData.created_at ?? '',
      };

      setListing(fullListing);
      setListingOwner(listingData.user_id);
      setIsOwner(user?.id === listingData.user_id);
    }

    void fetchListing();
  }, [supabase, listingId, user]);

  // Fetch participants if owner
  useEffect(() => {
    if (isOwner) {
      void fetchParticipants();
    }
  }, [isOwner, fetchParticipants]);

  // Auto-select conversation when only one exists
  useEffect(() => {
    if (isOwner && participants.length === 1 && !selectedParticipant) {
      setSelectedParticipant(participants[0].user_id);
      setShowConversationList(false); // Hide list when auto-selecting on mobile
    }
  }, [isOwner, participants, selectedParticipant]);

  // Fetch transaction if listing is reserved or completed
  useEffect(() => {
    async function fetchTransaction() {
      if (!listing || !user || (listing.status !== 'reserved' && listing.status !== 'completed')) return;

      const { data } = await supabase
        .rpc('get_listing_transaction', { p_listing_id: listingId });

      if (data && Array.isArray(data) && data.length > 0) {
        setTransactionId(data[0].id);
        setTransactionStatus(data[0].status);
        setTransaction({ buyer_id: data[0].buyer_id });
        const isUserBuyer = data[0].buyer_id === user.id;
        setIsBuyer(isUserBuyer);
        setIsReservedBuyer(isUserBuyer);

        // Set counterparty info for rating
        if (listing.status === 'completed') {
          if (isUserBuyer) {
            // Buyer rates seller
            setCounterpartyToRate({
              id: listing.user_id,
              nickname: listing.author_nickname
            });
          } else {
            // Seller rates buyer - need to get buyer info
            const { data: buyerProfile } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', data[0].buyer_id)
              .single();

            if (buyerProfile) {
              setCounterpartyToRate({
                id: data[0].buyer_id,
                nickname: buyerProfile.nickname ?? 'Usuario'
              });
            }
          }
        }
      }
    }

    void fetchTransaction();
  }, [listing, listingId, supabase, user]);

  // Fetch ratings when transaction is completed
  useEffect(() => {
    async function fetchRatings() {
      if (!listing || !user || listing.status !== 'completed') return;

      // Fetch my rating (if I've rated the other user)
      const { data: myRatingData } = await supabase
        .from('user_ratings')
        .select('rating, comment')
        .eq('rater_id', user.id)
        .eq('context_type', 'listing')
        .eq('context_id', listingId)
        .maybeSingle();

      if (myRatingData) {
        setMyRating(myRatingData);
      }

      // Fetch counterparty's rating (if they've rated me)
      const { data: counterpartyRatingData } = await supabase
        .from('user_ratings')
        .select('rating, comment')
        .eq('rated_id', user.id)
        .eq('context_type', 'listing')
        .eq('context_id', listingId)
        .maybeSingle();

      if (counterpartyRatingData) {
        setCounterpartyRating(counterpartyRatingData);
      }

      // Check if both have rated
      if (myRatingData && counterpartyRatingData) {
        setBothRated(true);
      }
    }

    void fetchRatings();
  }, [listing, listingId, supabase, user]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Improve auto-scroll behavior
  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Also scroll when conversation changes
  useEffect(() => {
    if (selectedParticipant) {
      // Small timeout to allow render
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [selectedParticipant]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    // Check ToS acceptance for buyers sending first message
    if (!isOwner && messages.length === 0 && !tosAccepted) {
      toast.error('Debes aceptar los términos y condiciones antes de enviar un mensaje');
      return;
    }

    const receiverId = isOwner
      ? selectedParticipant || undefined
      : listingOwner || undefined;

    await sendMessage(messageText, receiverId);
    setMessageText('');
  };

  const handleReserve = async () => {
    if (!listing || !isOwner || !user) {
      toast.error('Error: no se puede reservar en este momento');
      return;
    }

    if (!selectedParticipant) {
      toast.error('Debes seleccionar una conversación para reservar');
      setShowConversationList(true);
      return;
    }

    // Get selected participant's nickname
    const selectedParticipantData = participants.find(p => p.user_id === selectedParticipant);
    if (!selectedParticipantData) {
      toast.error('Error: no se encontró el comprador seleccionado');
      return;
    }

    if (!confirm(`¿Seguro que quieres reservar este anuncio para ${selectedParticipantData.nickname}?`)) {
      return;
    }

    setReserving(true);
    try {
      // Use reserve_listing RPC - it handles transaction creation, status update, and system messages
      const { error: reserveError } = await supabase.rpc('reserve_listing', {
        p_listing_id: listingId,
        p_buyer_id: selectedParticipant,
        p_note: undefined
      });

      if (reserveError) throw reserveError;

      toast.success(`Anuncio reservado para ${selectedParticipantData.nickname}`);
      // Update local state
      setListing({ ...listing, status: 'reserved' });

      // Refresh to show system messages
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      logger.error('Error reserving listing:', error);
      toast.error('Error al reservar el anuncio');
    } finally {
      setReserving(false);
    }
  };

  const handleUnreserve = async () => {
    if (!listing || !isOwner || !user || !transaction) return;

    // Get reserved buyer's nickname
    const reservedBuyerNickname = participants.find(p => p.user_id === transaction.buyer_id)?.nickname;
    if (!reservedBuyerNickname) {
      toast.error('Error: no se encontró el comprador reservado');
      return;
    }

    if (!confirm(`¿Seguro que quieres liberar la reserva con ${reservedBuyerNickname}? El anuncio volverá a estar disponible para todos.`)) {
      return;
    }

    setUnreserving(true);
    try {
      // Use unreserve_listing RPC - it handles status update and system messages
      const { error: unreserveError } = await supabase.rpc('unreserve_listing', {
        p_listing_id: listingId
      });

      if (unreserveError) throw unreserveError;

      toast.success('Reserva liberada. El anuncio está disponible nuevamente.');
      // Update local state
      setListing({ ...listing, status: 'active' });

      // Refresh to show system messages
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      logger.error('Error unreserving listing:', error);
      toast.error('Error al liberar la reserva');
    } finally {
      setUnreserving(false);
    }
  };

  const handleComplete = async () => {
    if (!listing || !isOwner || !user || !transactionId || !transaction) return;

    // Get reserved buyer's nickname
    const reservedBuyerNickname = participants.find(p => p.user_id === transaction.buyer_id)?.nickname;
    if (!reservedBuyerNickname) {
      toast.error('Error: no se encontró el comprador reservado');
      return;
    }

    if (!confirm(`¿Confirmas que has completado el intercambio con ${reservedBuyerNickname}? Esto enviará una notificación al comprador para que confirme.`)) {
      return;
    }

    setCompleting(true);
    try {
      // Mark transaction as completed (seller initiates) - RPC handles system messages
      const { error: completeError } = await supabase.rpc('complete_listing_transaction', {
        p_transaction_id: transactionId
      });

      if (completeError) throw completeError;

      toast.success(`Intercambio marcado como completado. Esperando confirmación de ${reservedBuyerNickname}.`);

      // Refresh to show system messages
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      logger.error('Error completing transaction:', error);
      toast.error('Error al completar el intercambio');
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirm = async () => {
    if (!listing || !isBuyer || !user || !transactionId) return;

    setConfirming(true);
    try {
      // Buyer confirms completion - RPC handles system messages
      const { error: confirmError } = await supabase.rpc('complete_listing_transaction', {
        p_transaction_id: transactionId
      });

      if (confirmError) throw confirmError;

      toast.success('Transacción confirmada. ¡Ahora puedes valorar al vendedor!');

      // Set seller info for rating
      setCounterpartyToRate({
        id: listing.user_id,
        nickname: listing.author_nickname
      });

      // Update local state
      setListing({ ...listing, status: 'completed' });
      setTransactionStatus('completed');

      // Show rating modal immediately
      setShowRatingModal(true);
    } catch (error) {
      logger.error('Error confirming transaction:', error);
      toast.error('Error al confirmar la transacción');
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!counterpartyToRate || !listing) return;

    const { error } = await supabase.rpc('create_user_rating', {
      p_rated_id: counterpartyToRate.id,
      p_rating: rating,
      p_comment: comment || undefined,
      p_context_type: 'listing',
      p_context_id: listingId
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update local state with new rating
    setMyRating({ rating, comment: comment || null });

    // Refresh the page to show updated ratings and check if both have rated
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };



  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--header-height,4rem)-5rem)] md:h-[calc(100vh-var(--header-height,5rem)-3.5rem)] bg-gray-50 dark:bg-gray-900 flex flex-col pb-0 md:py-4">
      <div className="container mx-auto px-4 max-w-5xl flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-4 hidden md:flex items-center gap-4 flex-none">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/chats')}
            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a mis chats
          </Button>
        </div>

        {/* Mobile sticky header with context */}
        {(!isOwner || selectedParticipant) && (
          <div className="md:hidden flex-none bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 z-20 -mx-4 px-4 py-3">
            <div className="flex items-center gap-3">
              {isOwner && selectedParticipant ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => participants.length > 1 ? setSelectedParticipant(null) : router.push('/chats')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {participants.find(p => p.user_id === selectedParticipant)?.nickname || 'Usuario'}
                    </p>
                    {listing && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {listing.title}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setListingCardExpanded(true)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </>
              ) : !isOwner && listing ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => router.push('/chats')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {listing.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      Vendedor: {listing.author_nickname}
                    </p>
                  </div>
                  <button
                    onClick={() => setListingCardExpanded(true)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
            {/* Mobile action buttons */}
            {listing && (
              <div className="flex gap-2 mt-2">
                {isOwner && listing.status === 'active' && !transactionStatus && (
                  <Button
                    onClick={handleReserve}
                    disabled={reserving || !selectedParticipant}
                    size="sm"
                    className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold text-xs flex-1"
                  >
                    <Package className="h-3.5 w-3.5 mr-1" />
                    {reserving ? 'Marcando...' : 'Reservar'}
                  </Button>
                )}
                {isOwner && listing.status === 'reserved' && transactionStatus === 'reserved' && (
                  <>
                    <Button
                      onClick={handleComplete}
                      disabled={completing}
                      size="sm"
                      className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold text-xs flex-1"
                    >
                      <Package className="h-3.5 w-3.5 mr-1" />
                      {completing ? 'Completando...' : 'Completar'}
                    </Button>
                    <Button
                      onClick={handleUnreserve}
                      disabled={unreserving}
                      size="sm"
                      variant="outline"
                      className="text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 font-bold text-xs flex-1"
                    >
                      {unreserving ? 'Liberando...' : 'Liberar'}
                    </Button>
                  </>
                )}
                {isBuyer && listing.status === 'reserved' && transactionStatus === 'pending_completion' && (
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    size="sm"
                    className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold text-xs flex-1"
                  >
                    <Package className="h-3.5 w-3.5 mr-1" />
                    {confirming ? 'Confirmando...' : 'Confirmar Recepción'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Listing Info Card */}
        {listing && (
          <ModernCard className="mb-4 hidden md:block flex-none">
            <ModernCardContent className="p-4">
              {/* Mobile: Collapsible - REDESIGNED for Phase 2 */}
              <div className="md:hidden">
                <button
                  onClick={() => setListingCardExpanded(!listingCardExpanded)}
                  className="w-full flex items-center gap-2 py-2"
                >
                  {listing.image_url && (
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <Image
                        src={listing.image_url}
                        alt={listing.title}
                        fill
                        className="object-cover rounded border border-gray-700"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {listing.title}
                    </p>
                  </div>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0',
                    listing.status === 'active' && 'bg-green-100 text-green-700',
                    listing.status === 'reserved' && 'bg-yellow-100 text-yellow-700',
                    listing.status === 'completed' && 'bg-blue-100 text-blue-700',
                    listing.status === 'sold' && 'bg-gray-200 text-gray-700'
                  )}>
                    {listing.status === 'active' && 'Activo'}
                    {listing.status === 'reserved' && 'Reservado'}
                    {listing.status === 'completed' && 'Completado'}
                    {listing.status === 'sold' && 'Completado'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
                      listingCardExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {listingCardExpanded && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {listing.collection_name} {listing.sticker_number && `- #${listing.sticker_number}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop: Keep current layout */}
              <div className="hidden md:block">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-4 flex-1">
                    {listing.image_url && (
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={listing.image_url}
                          alt={listing.title}
                          fill
                          className="object-cover rounded-md border-2 border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/marketplace/${listingId}`}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-[#FFC000] transition-colors">
                          {listing.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {listing.collection_name} {listing.sticker_number && `- #${listing.sticker_number}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-bold uppercase',
                          listing.status === 'active' && 'bg-green-100 text-green-700',
                          listing.status === 'reserved' && 'bg-yellow-100 text-yellow-700',
                          listing.status === 'completed' && 'bg-blue-100 text-blue-700',
                          listing.status === 'sold' && 'bg-gray-200 text-gray-700'
                        )}>
                          {listing.status === 'active' && 'Disponible'}
                          {listing.status === 'reserved' && 'Reservado'}
                          {listing.status === 'completed' && 'Completado'}
                          {listing.status === 'sold' && 'Completado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Desktop action buttons - keep as is */}
                    {isOwner && listing.status === 'active' && !transactionStatus && (
                      <Button
                        onClick={handleReserve}
                        disabled={reserving || !selectedParticipant}
                        variant="outline"
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {reserving ? 'Marcando...' : 'Marcar Reservado'}
                      </Button>
                    )}
                    {isOwner && listing.status === 'reserved' && transactionStatus === 'reserved' && (
                      <>
                        <Button
                          onClick={handleComplete}
                          disabled={completing}
                          variant="outline"
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
                        >
                          <Package className="h-4 w-4 mr-2" />
                          {completing ? 'Completando...' : 'Marcar Completado'}
                        </Button>
                        <Button
                          onClick={handleUnreserve}
                          disabled={unreserving}
                          variant="outline"
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
                        >
                          <Package className="h-4 w-4 mr-2" />
                          {unreserving ? 'Liberando...' : 'Liberar Reserva'}
                        </Button>
                      </>
                    )}

                    {/* Buyer confirmation - shows when transaction is pending_completion */}
                    {isBuyer && listing.status === 'reserved' && transactionStatus === 'pending_completion' && (
                      <Button
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold w-full sm:w-auto whitespace-nowrap"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {confirming ? 'Confirmando...' : 'Confirmar Recepción'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Mobile Info Modal (replacing inline accordion if desired, but for now just fix the layout structure in grid) */}
        {listingCardExpanded && (
          <Dialog open={listingCardExpanded} onOpenChange={setListingCardExpanded}>
            <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 w-[95%] rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Información del Anuncio</DialogTitle>
              </DialogHeader>
              {listing && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-square md:hidden">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url}
                        alt={listing.title}
                        fill
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-md">
                        <span className="text-gray-500">Sin imagen</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{listing.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{listing.collection_name} - #{listing.sticker_number}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-bold uppercase',
                        listing.status === 'active' && 'bg-green-900/30 text-green-400',
                        listing.status === 'reserved' && 'bg-yellow-900/30 text-yellow-400',
                        listing.status === 'completed' && 'bg-blue-900/30 text-blue-400',
                        listing.status === 'sold' && 'bg-gray-700 text-gray-300'
                      )}>
                        {listing.status === 'active' && 'Disponible'}
                        {listing.status === 'reserved' && 'Reservado'}
                        {listing.status === 'completed' && 'Completado'}
                        {listing.status === 'sold' && 'Completado'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{listing.description || 'Sin descripción'}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Participants sidebar (seller only) */}
          {isOwner && participants.length > 0 && (
            <>
              {/* Mobile: Show list OR hidden if showing chat */}
              <div className={cn("md:hidden flex-1 overflow-y-auto min-h-0", selectedParticipant ? "hidden" : "block")}>
                <div className="mb-6">
                  <ModernCard>
                    <ModernCardContent className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        Conversaciones ({participants.length})
                      </h3>
                      <div className="space-y-2">
                        {participants.map(participant => {
                          const isReservedForThisParticipant =
                            listing?.status === 'reserved' &&
                            transactionId &&
                            transaction?.buyer_id === participant.user_id;

                          return (
                            <button
                              key={participant.user_id}
                              onClick={() => {
                                setSelectedParticipant(participant.user_id);
                                setShowConversationList(false);
                              }}
                              className={cn(
                                'w-full text-left p-3 rounded-md transition-colors',
                                selectedParticipant === participant.user_id
                                  ? 'bg-[#FFC000]/20 border-2 border-[#FFC000]'
                                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {participant.nickname}
                                  </span>
                                  {isReservedForThisParticipant && (
                                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded">
                                      Reservado
                                    </span>
                                  )}
                                </div>
                                {participant.unread_count > 0 && (
                                  <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                                    {participant.unread_count}
                                  </span>
                                )}
                              </div>
                              {participant.last_message && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                  {participant.last_message}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                </div>
              </div>

              {/* Desktop: Always show sidebar */}
              <div className="hidden md:block md:col-span-1 overflow-y-auto min-h-0">
                <ModernCard>
                  <ModernCardContent className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                      Conversaciones
                    </h3>
                    <div className="space-y-2">
                      {participants.map(participant => {
                        const isReservedForThisParticipant =
                          listing?.status === 'reserved' &&
                          transactionId &&
                          transaction?.buyer_id === participant.user_id;

                        return (
                          <button
                            key={participant.user_id}
                            onClick={() => setSelectedParticipant(participant.user_id)}
                            className={cn(
                              'w-full text-left p-3 rounded-md transition-colors',
                              selectedParticipant === participant.user_id
                                ? 'bg-[#FFC000]/20 border-2 border-[#FFC000]'
                                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {participant.nickname}
                                </span>
                                {isReservedForThisParticipant && (
                                  <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded">
                                    Reservado
                                  </span>
                                )}
                              </div>
                              {participant.unread_count > 0 && (
                                <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                                  {participant.unread_count}
                                </span>
                              )}
                            </div>
                            {participant.last_message && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                                {participant.last_message}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ModernCardContent>
                </ModernCard>
              </div>
            </>
          )}

          {/* Chat panel */}
          <div className={cn(
            isOwner && participants.length > 0 ? 'md:col-span-2' : 'md:col-span-3',
            // Mobile: Show if appropriate
            'flex flex-col min-h-0',
            // On mobile, if owner and no selected participant, hide chat (show list instead)
            isOwner && !selectedParticipant ? 'hidden md:block' : 'flex'
          )}>
            <ModernCard className="flex flex-col flex-1 min-h-0 overflow-hidden border-0 md:border-2">
              <ModernCardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="overflow-y-auto p-4 space-y-3 flex-1 min-h-0"
                >
                  {isOwner && !selectedParticipant && participants.length > 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 dark:text-gray-500">
                        Selecciona una conversación para ver los mensajes
                      </p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 dark:text-gray-500">
                        {isOwner
                          ? 'No hay mensajes en esta conversación'
                          : 'Envía un mensaje para iniciar la conversación'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map(message => {
                        // System messages render differently
                        if (message.is_system) {
                          return (
                            <div
                              key={message.id}
                              className="flex justify-center my-4"
                            >
                              <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm text-center max-w-[80%] border border-[#FFC000]">
                                <p className="italic">{message.message}</p>
                                <p className="text-xs mt-1 opacity-60">
                                  {new Date(message.created_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // Regular user messages
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isOwnMessage ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg p-3 border-2 border-black',
                                isOwnMessage
                                  ? 'bg-[#FFC000] text-black'
                                  : 'bg-gray-800 text-white'
                              )}
                            >
                              {!isOwnMessage && message.sender_nickname && (
                                <p className="text-xs font-bold mb-1 opacity-70">
                                  {message.sender_id ? (
                                    <Link
                                      href={`/users/${message.sender_id}`}
                                      className="hover:text-[#FFC000] hover:underline transition-colors"
                                    >
                                      {message.sender_nickname}
                                    </Link>
                                  ) : (
                                    message.sender_nickname
                                  )}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">
                                {message.message}
                              </p>
                              <p className="text-xs mt-1 opacity-60">
                                {new Date(message.created_at).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Rating UI - shown when transaction is completed */}
                      {listing?.status === 'completed' && counterpartyToRate && (
                        <div className="flex justify-center my-4">
                          {!myRating ? (
                            // Show rating link if user hasn't rated yet
                            <button
                              onClick={() => setShowRatingModal(true)}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-6 py-3 text-sm border border-[#FFC000] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              ⭐ Haz clic aquí para valorar a {counterpartyToRate.nickname}
                            </button>
                          ) : (
                            // Show system message with user's rating
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm text-center max-w-[80%] border border-[#FFC000]">
                              <p>
                                Has valorado a {counterpartyToRate.nickname} con{' '}
                                {'⭐'.repeat(myRating.rating)} ({myRating.rating}/5)
                                {myRating.comment && ` y has comentado: "${myRating.comment}"`}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show counterparty's rating when both have rated */}
                      {listing?.status === 'completed' && bothRated && counterpartyRating && (
                        <div className="flex justify-center my-4">
                          <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm text-center max-w-[80%] border border-[#FFC000]">
                            <p>
                              {isOwner ? 'El comprador' : 'El vendedor'} te ha valorado con{' '}
                              {'⭐'.repeat(counterpartyRating.rating)} ({counterpartyRating.rating}/5)
                              {counterpartyRating.comment && ` y ha comentado: "${counterpartyRating.comment}"`}
                            </p>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t-2 border-gray-200 dark:border-gray-700 p-4 flex-none">
                  {/* Logic for chat disabling */}
                  {(() => {
                    const isReserved = listing?.status === 'reserved';
                    const isCompleted = listing?.status === 'completed';
                    const isReservedParticipant = isReserved && transaction?.buyer_id === selectedParticipant;

                    // Access denied (RLS or blocked)
                    if (listingAccessDenied && !isOwner) {
                      return (
                        <p className="text-gray-400 dark:text-gray-500 text-center italic">
                          No tienes acceso a este chat
                        </p>
                      );
                    }

                    // Completed listing
                    if (isCompleted) {
                      // Only allow chat if it was the successful transaction (for history/rating) - though typically completed chats are read-only eventually
                      // For now, let's keep it simple: if completed, chat is closed for everyone or maybe just read-only?
                      // The original code said: "Chat cerrado - La transacción ha sido completada" if isReservedBuyer or isOwner
                      if ((isReservedBuyer || isOwner)) {
                        return (
                          <p className="text-gray-400 dark:text-gray-500 text-center italic">
                            Chat cerrado - La transacción ha sido completada
                          </p>
                        );
                      }
                      return (
                        <p className="text-gray-400 dark:text-gray-500 text-center italic">
                          Este anuncio ya no está disponible
                        </p>
                      );
                    }

                    // Reserved listing logic
                    if (isReserved) {
                      // Case 1: Owner viewing the reserved buyer's chat -> ALLOW
                      if (isOwner && isReservedParticipant) {
                        return null; // Render composer
                      }

                      // Case 2: Owner viewing OTHER chat -> BLOCK
                      if (isOwner && !isReservedParticipant) {
                        return (
                          <p className="text-gray-400 dark:text-gray-500 text-center italic">
                            Este anuncio está reservado para otro usuario
                          </p>
                        );
                      }

                      // Case 3: Reserved Buyer viewing their chat -> ALLOW
                      if (!isOwner && isReservedBuyer) {
                        return null; // Render composer
                      }

                      // Case 4: Other Buyer viewing their chat -> BLOCK
                      if (!isOwner && !isReservedBuyer) {
                        return (
                          <p className="text-gray-400 dark:text-gray-500 text-center italic">
                            Este anuncio está reservado para otro usuario
                          </p>
                        );
                      }
                    }

                    // Active listings
                    // Owner needs to select a participant
                    if (isOwner && !selectedParticipant && participants.length > 0) {
                      return (
                        <p className="text-gray-400 dark:text-gray-500 text-center">
                          Selecciona una conversación para responder
                        </p>
                      );
                    }

                    // Default: Allow chat
                    return null;
                  })() || (
                      <>
                        {/* ToS acceptance for buyers with no messages */}
                        {!isOwner && messages.length === 0 && (
                          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="tos-chat"
                                checked={tosAccepted}
                                onCheckedChange={(checked) => setTosAccepted(checked === true)}
                              />
                              <label
                                htmlFor="tos-chat"
                                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
                              >
                                Acepto los{' '}
                                <button
                                  type="button"
                                  onClick={() => setChatTermsDialogOpen(true)}
                                  className="text-[#FFC000] hover:underline font-semibold"
                                >
                                  términos y condiciones
                                </button>{' '}
                                y me comprometo a realizar intercambios de manera honesta y respetuosa.
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <textarea
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}

                            placeholder="Escribe un mensaje..."
                            maxLength={500}
                            rows={2}
                            className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md px-4 py-2 border-2 border-gray-200 dark:border-gray-700 focus:border-[#FFC000] focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={sending}
                          />
                          <Button
                            onClick={handleSend}
                            disabled={!messageText.trim() || sending}
                            className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {messageText.length}/500 caracteres
                  </p>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>

        {/* Rating Modal */}
        {counterpartyToRate && listing && (
          <UserRatingDialog
            open={showRatingModal}
            onOpenChange={setShowRatingModal}
            userToRate={counterpartyToRate}
            listingTitle={listing.title}
            listingId={listingId}
            onSubmit={handleSubmitRating}
          />
        )}

        {/* Chat Terms Dialog */}
        <Dialog open={chatTermsDialogOpen} onOpenChange={setChatTermsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 text-gray-200 border-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase text-white">
                Términos y Condiciones del Chat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                El chat de Cambiocromos.com te permite comunicarte con otros usuarios de forma privada para intercambiar o vender cromos. El contenido de los mensajes no se usa con fines comerciales, pero puede ser revisado si otro usuario reporta abuso, fraude o incumplimiento de nuestras normas. No compartas información personal sensible ni enlaces externos que puedan poner en riesgo tu seguridad. Respeta siempre a los demás usuarios. El mal uso del chat puede suponer la suspensión de tu cuenta. Al continuar, aceptas nuestras Condiciones de uso y Política de privacidad.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => setChatTermsDialogOpen(false)}
                  className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold uppercase"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Action Menu - Mobile Only */}
        <div className="md:hidden">
          <FloatingActionMenu
            // Seller actions
            canReserve={isOwner && listing?.status === 'active' && !transactionStatus}
            canComplete={isOwner && listing?.status === 'reserved' && transactionStatus === 'reserved' && transaction?.buyer_id === selectedParticipant}
            canUnreserve={isOwner && listing?.status === 'reserved' && transactionStatus === 'reserved' && transaction?.buyer_id === selectedParticipant}
            onReserve={handleReserve}
            onComplete={handleComplete}
            onUnreserve={handleUnreserve}
            reserving={reserving}
            completing={completing}
            unreserving={unreserving}
            // Buyer actions
            canConfirm={isBuyer && listing?.status === 'reserved' && transactionStatus === 'pending_completion'}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        </div>
      </div>
    </div>
  );
}

export default function ListingChatPage() {
  return (
    <AuthGuard>
      <ListingChatPageContent />
    </AuthGuard>
  );
}
