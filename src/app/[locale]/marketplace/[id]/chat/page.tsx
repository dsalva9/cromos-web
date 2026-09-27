'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { MarketplaceChatDrawer } from '@/components/chats/MarketplaceChatDrawer';

function ListingChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = parseInt(params.id as string, 10);
  const participantFromUrl = searchParams.get('participant');

  const handleClose = () => {
    // If there is history, go back; otherwise navigate to /chats
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/chats');
    }
  };

  return (
    <MarketplaceChatDrawer
      isOpen={true}
      isPage={true}
      listingId={listingId}
      initialParticipantId={participantFromUrl}
      onClose={handleClose}
      onHide={() => router.push('/chats')}
      onDelete={() => router.push('/chats')}
    />
  );
}

export default function ListingChatPage() {
  return (
    <AuthGuard>
      <ListingChatPageContent />
    </AuthGuard>
  );
}
