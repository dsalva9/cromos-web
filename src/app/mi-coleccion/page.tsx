'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import { logger } from '@/lib/logger';

function CollectionRedirectContent() {
  const supabase = useSupabaseClient();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    logger.debug(
      'Collection redirect - userLoading:',
      userLoading,
      'user:',
      !!user
    );

    if (!userLoading && user) {
      const handleRedirect = async () => {
        try {
          logger.debug('Checking user collections...');

          // Get user's collections
          const { data: userCollections, error } = await (supabase as any)
            .from('user_collections')
            .select(
              `
              collection_id,
              is_active,
              collections (
                id,
                name
              )
            `
            )
            .eq('user_id', user.id);

          logger.debug('User collections:', userCollections, 'Error:', error);

          if (error) {
            logger.error('Error fetching collections:', error);
            router.push('/profile');
            return;
          }

          if (!userCollections || userCollections.length === 0) {
            logger.debug('No collections found, redirecting to profile');
            router.push('/profile');
            return;
          }

          // Find active collection
          const activeCollection = userCollections.find((uc: any) => uc.is_active);
          logger.debug('Active collection:', activeCollection);

          if (activeCollection) {
            logger.debug(
              'Redirecting to active collection:',
              activeCollection.collection_id
            );
            router.push(`/mi-coleccion/${activeCollection.collection_id}`);
            return;
          }

          // No active collection but user owns some - set first as active and redirect
          const firstCollection = userCollections[0];
          logger.debug('Setting first collection as active:', firstCollection);

          if (firstCollection) {
            // Set first collection as active
            await (supabase as any)
              .from('user_collections')
              .update({ is_active: true })
              .eq('user_id', user.id)
              .eq('collection_id', firstCollection.collection_id);

            router.push(`/mi-coleccion/${firstCollection.collection_id}`);
            return;
          }

          // Fallback to profile
          logger.debug('Fallback to profile');
          router.push('/profile');
        } catch (err) {
          logger.error('Error in collection redirect:', err);
          router.push('/profile');
        } finally {
          setChecking(false);
        }
      };

      handleRedirect();
    } else if (!userLoading && !user) {
      logger.debug('No user, redirecting to login');
      router.push('/login');
      setChecking(false);
    }
  }, [user, userLoading, supabase, router]);

  // Show loading while redirecting or checking
  if (userLoading || checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 text-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <div className="text-xl">
            {userLoading ? 'Cargando usuario...' : 'Buscando tu colección...'}
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't render, but just in case
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4 text-gray-900">
        <h1 className="text-2xl font-bold">Redirigiendo...</h1>
      </div>
    </div>
  );
}

export default function CollectionRedirectPage() {
  return (
    <AuthGuard>
      <CollectionRedirectContent />
    </AuthGuard>
  );
}

