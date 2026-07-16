'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/hooks/use-router';
import Link from '@/components/ui/link';
import { SimplifiedListingForm } from '@/components/marketplace/SimplifiedListingForm';
import { DestacaAnuncioModal } from '@/components/marketplace/DestacaAnuncioModal';
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';
import AuthGuard from '@/components/AuthGuard';
import { toast } from 'sonner';
import { CreateListingForm, PackItem } from '@/types/v1.6.0';
import { logger } from '@/lib/logger';
import { ArrowLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useTranslations } from 'next-intl';
import { getCurrencySymbol } from '@/constants/countries';

function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createListing, loading } = useCreateListing();
  const { profile } = useProfileCompletion();
  const { user } = useUser();
  const currencySymbol = getCurrencySymbol(profile?.country_code);
  const t = useTranslations('createListing');

  // Modal state — shown after successful publish
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [newListingId, setNewListingId] = useState<number | null>(null);

  // Get initial data from query parameters
  const initialData = useMemo(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const collection = searchParams.get('collection');
    const isGroup = searchParams.get('isGroup') === 'true';
    const groupCount = searchParams.get('groupCount');

    if (!title) return undefined;

    return {
      title,
      description: description || '',
      collection_name: collection || '',
      is_group: isGroup,
      group_count: groupCount ? parseInt(groupCount) : undefined,
    };
  }, [searchParams]);

  // Get back URL and template ID from query parameters
  const backUrl = searchParams.get('from') || '/marketplace';
  const templateId = searchParams.get('templateId');
  const copyId = searchParams.get('copyId');

  // Build QR data for the "Generate QR" button in ImageUpload
  // Only available when publishing a pack from an album (has copyId + isGroup)
  const qrData = useMemo(() => {
    if (!copyId || !user || !initialData?.is_group) return undefined;
    return {
      userId: user.id,
      copyId: parseInt(copyId),
      copyTitle: initialData.collection_name || initialData.title || '',
      nickname: user.user_metadata?.nickname ?? user.email ?? 'yo',
    };
  }, [copyId, user, initialData]);

  const handleSubmit = async (data: CreateListingForm) => {
    try {
      // Read structured pack items from sessionStorage if available
      let packItems: PackItem[] | undefined;
      try {
        const stored = sessionStorage.getItem('pending_pack_items');
        if (stored) {
          packItems = JSON.parse(stored) as PackItem[];
          sessionStorage.removeItem('pending_pack_items');
        }
      } catch {
        // Ignore sessionStorage errors
      }

      const listingId = await createListing({
        ...data,
        template_id: templateId ? parseInt(templateId) : undefined,
        pack_items: packItems,
      });
      toast.success(t('successToast'));
      // Show highlight upsell modal instead of navigating immediately
      setNewListingId(Number(listingId));
      setHighlightModalOpen(true);
    } catch (error) {
      logger.error('Create listing error:', error);
      toast.error(
        error instanceof Error ? error.message : t('errorToast')
      );
    }
  };

  const handleHighlightModalClose = () => {
    setHighlightModalOpen(false);
    if (newListingId) {
      router.push(`/marketplace/${newListingId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href={backUrl}
          className="inline-flex items-center text-gold hover:text-gold-light mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backUrl.includes('/mis-plantillas/') ? t('backAlbum') : t('backMarketplace')}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {initialData ? t('subtitleGroup') : t('subtitleIndividual')}
          </p>
        </div>

        <SimplifiedListingForm
          onSubmit={handleSubmit}
          loading={loading}
          initialData={initialData}
          disablePackOption={initialData?.is_group}
          currencySymbol={currencySymbol}
          qrData={qrData}
        />
      </div>

      {/* Post-publish highlight upsell modal */}
      {highlightModalOpen && newListingId && user && (
        <DestacaAnuncioModal
          open={highlightModalOpen}
          listingId={newListingId}
          userId={user.id}
          onClose={handleHighlightModalClose}
          isNewListing
        />
      )}
    </div>
  );
}

export default function CreateListingPage() {
  return (
    <AuthGuard>
      <CreateListingContent />
    </AuthGuard>
  );
}
