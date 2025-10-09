'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import StickerImage from '@/components/ui/sticker-image';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Sticker {
  id: number;
  player_name: string;
  code: string;
  rarity: string | null;
  thumb_path_webp_100: string | null;
  image_path_webp_300: string | null;
  image_url: string | null;
  thumb_public_url?: string | null;
  image_public_url?: string | null;
  collection_teams?:
    | {
        team_name: string;
      }
    | {
        team_name: string;
      }[]
    | null;
}

const DEFAULT_COLLECTION_ID = 1; // Fallback to first public collection

export default function StickerTeaser() {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStickers = useCallback(async () => {
    try {
      setLoading(true);

      // Determine which collection to fetch from
      let collectionId = DEFAULT_COLLECTION_ID;

      if (user) {
        // Try to get user's active collection
        const { data: userCollections } = await supabase
          .from('user_collections')
          .select('collection_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userCollections?.collection_id) {
          collectionId = userCollections.collection_id;
        }
      }

      // Fetch 8 stickers: prioritize rare stickers, ordered by sticker number
      const { data, error } = await supabase
        .from('stickers')
        .select(
          `
          id,
          player_name,
          code,
          rarity,
          thumb_path_webp_100,
          image_path_webp_300,
          image_url,
          sticker_number,
          collection_teams (
            team_name
          )
        `
        )
        .eq('collection_id', collectionId)
        .order('rarity', { ascending: false })
        .order('sticker_number', { ascending: true })
        .limit(8);

      if (error) throw error;

      // Resolve public URLs for images
      const stickersWithUrls = (data || []).map(sticker => {
        const thumb_public_url = sticker.thumb_path_webp_100
          ? supabase.storage
              .from('sticker-images')
              .getPublicUrl(sticker.thumb_path_webp_100).data.publicUrl
          : null;

        const image_public_url = sticker.image_path_webp_300
          ? supabase.storage
              .from('sticker-images')
              .getPublicUrl(sticker.image_path_webp_300).data.publicUrl
          : null;

        return {
          ...sticker,
          thumb_public_url,
          image_public_url,
        };
      });

      setStickers(stickersWithUrls);
    } catch (err) {
      logger.error('Error fetching sticker teaser:', err);
      // Fail silently - empty grid is acceptable for home page
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchStickers();
  }, [fetchStickers]);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-white text-center mb-12">
            Cromos Destacados
          </h2>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-[#FFC000] animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (stickers.length === 0) {
    return null; // Don't show section if no stickers available
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-white text-center mb-12">
          Cromos Destacados
        </h2>

        {/* Stickers grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {stickers.map((sticker, index) => {
            // Handle team name extraction from nested structure
            let teamName = 'Equipo Desconocido';
            if (sticker.collection_teams) {
              if (Array.isArray(sticker.collection_teams)) {
                teamName =
                  sticker.collection_teams[0]?.team_name || 'Equipo Desconocido';
              } else if (typeof sticker.collection_teams === 'object') {
                teamName = sticker.collection_teams.team_name;
              }
            }

            const altText = `${sticker.player_name} - ${teamName}`;

            return (
              <div
                key={sticker.id}
                className="aspect-[3/4] relative rounded-lg overflow-hidden bg-gray-800 border-2 border-black shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <StickerImage
                  thumbUrl={sticker.thumb_public_url}
                  imageUrl={sticker.image_public_url}
                  externalUrl={sticker.image_url}
                  alt={altText}
                  playerName={sticker.player_name}
                  fill
                  priority={index < 4} // First 4 images are priority
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />

                {/* Player info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
                  <p className="text-white font-bold text-sm truncate">
                    {sticker.player_name}
                  </p>
                  <p className="text-gray-300 text-xs truncate">{teamName}</p>
                </div>

                {/* Rarity badge */}
                {sticker.rarity && (
                  <div className="absolute top-2 right-2">
                    <div
                      className={`
                      px-2 py-1 text-xs font-extrabold uppercase border-2 border-black rounded shadow-lg
                      ${
                        sticker.rarity === 'legendary'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900'
                          : sticker.rarity === 'epic'
                            ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white'
                            : sticker.rarity === 'rare'
                              ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }
                    `}
                    >
                      {sticker.rarity}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
