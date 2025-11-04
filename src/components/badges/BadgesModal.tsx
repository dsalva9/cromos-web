/**
 * BadgesModal Component
 * Full-featured badges modal with tabs and progress tracking
 */

'use client';

import { useBadgeProgress } from '@/hooks/badges/useBadgeProgress';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { getCategoryInfo } from '@/config/badges';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BadgeCategory } from '@/types/badges';

interface BadgesModalProps {
  userId: string;
  isOwnProfile?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BadgesModal({
  userId,
  isOwnProfile = false,
  open,
  onOpenChange,
}: BadgesModalProps) {
  const { progress, isLoading: progressLoading } = useBadgeProgress(userId);

  if (progressLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-6 h-6" />
              Insignias
            </DialogTitle>
          </DialogHeader>
          <div className="animate-pulse space-y-4 py-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const earnedBadges = progress.filter((p) => p.is_earned);
  const unearnedBadges = progress.filter((p) => !p.is_earned);

  // Group by category
  const categories: BadgeCategory[] = [
    'collector',
    'creator',
    'reviewer',
    'completionist',
    'trader',
    'top_rated',
  ];

  const badgesByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = {
        earned: earnedBadges.filter((b) => b.category === cat),
        unearned: unearnedBadges.filter((b) => b.category === cat),
      };
      return acc;
    },
    {} as Record<
      BadgeCategory,
      { earned: typeof progress; unearned: typeof progress }
    >
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-6 h-6" />
            Insignias
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm py-2">
          <div className="flex items-center gap-1">
            <Award className="w-4 h-4 text-green-600" />
            <span className="font-semibold">{earnedBadges.length}</span>
            <span className="text-gray-500">ganadas</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">{unearnedBadges.length}</span>
            <span className="text-gray-500">por ganar</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Todas las insignias</TabsTrigger>
            <TabsTrigger value="earned">
              Ganadas ({earnedBadges.length})
            </TabsTrigger>
          </TabsList>

          {/* All badges tab */}
          <TabsContent value="all" className="space-y-8 mt-6">
            {categories.map((category) => {
              const catBadges = badgesByCategory[category];
              const allCatBadges = [...catBadges.earned, ...catBadges.unearned];

              if (allCatBadges.length === 0) return null;

              const catInfo = getCategoryInfo(category);

              return (
                <div key={category}>
                  <div className="mb-4">
                    <h3 className={cn('text-lg font-semibold', catInfo.color)}>
                      {catInfo.name_es}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {catInfo.description_es}
                    </p>
                  </div>
                  <BadgeGrid
                    badges={allCatBadges}
                    showProgress={true}
                    columns={3}
                    size="medium"
                  />
                </div>
              );
            })}
          </TabsContent>

          {/* Earned badges tab */}
          <TabsContent value="earned" className="mt-6">
            {earnedBadges.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isOwnProfile
                    ? 'Aún no has ganado ninguna insignia. ¡Comienza a coleccionar!'
                    : 'Este usuario aún no ha ganado insignias.'}
                </p>
              </div>
            ) : (
              <BadgeGrid
                badges={earnedBadges}
                showProgress={false}
                columns={3}
                size="medium"
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
