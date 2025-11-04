/**
 * ProfileBadgesSimple Component
 * Simplified badges display for profile pages - shows only earned badges
 */

'use client';

import { useState } from 'react';
import { useUserBadges } from '@/hooks/badges/useUserBadges';
import { BadgeCard } from '@/components/badges/BadgeCard';
import { BadgesModal } from '@/components/badges/BadgesModal';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileBadgesSimpleProps {
  userId: string;
  isOwnProfile?: boolean;
  className?: string;
}

export function ProfileBadgesSimple({
  userId,
  isOwnProfile = false,
  className,
}: ProfileBadgesSimpleProps) {
  const { badges, isLoading } = useUserBadges(userId);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FFC000]" />
          <h3 className="text-lg font-bold text-white">Insignias</h3>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-700 rounded-lg border-2 border-black"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No badges earned
  if (badges.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFC000]" />
            <h3 className="text-lg font-bold text-white">Insignias</h3>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs text-[#FFC000] hover:text-yellow-400 font-semibold underline"
          >
            Ver todas las insignias
          </button>
        </div>

        <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
          <Award className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {isOwnProfile
              ? 'Aún no has ganado ninguna insignia'
              : 'Sin insignias ganadas'}
          </p>
        </div>

        <BadgesModal
          userId={userId}
          isOwnProfile={isOwnProfile}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FFC000]" />
          <h3 className="text-lg font-bold text-white">Insignias</h3>
          <span className="text-xs text-gray-400 font-semibold">
            ({badges.length})
          </span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs text-[#FFC000] hover:text-yellow-400 font-semibold underline"
        >
          Ver todas
        </button>
      </div>

      {/* Earned Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.badge_id}
            badge={{
              badge_id: badge.badge_id,
              category: badge.category,
              tier: badge.tier,
              display_name_es: badge.display_name_es,
              description_es: badge.description_es,
              icon_name: badge.icon_name,
              threshold: badge.threshold,
              current_progress: badge.progress_snapshot || badge.threshold,
              is_earned: true,
              earned_at: badge.earned_at,
              sort_order: badge.sort_order,
            }}
            showProgress={false}
            showDescription={false}
            showEarnedDate={false}
            size="small"
          />
        ))}
      </div>

      {/* Modal */}
      <BadgesModal
        userId={userId}
        isOwnProfile={isOwnProfile}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
