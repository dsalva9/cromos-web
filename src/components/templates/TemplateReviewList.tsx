'use client';

import { User, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { TemplateRating } from '@/hooks/templates/useTemplateRatings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TemplateReviewListProps {
  ratings: TemplateRating[];
  hasMore: boolean;
  onLoadMore: () => void;
  loading?: boolean;
}

export function TemplateReviewList({
  ratings,
  hasMore,
  onLoadMore,
  loading
}: TemplateReviewListProps) {
  if (ratings.length === 0) {
    return (
      <ModernCard>
        <ModernCardContent className="p-8 text-center">
          <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            Esta plantilla aún no tiene valoraciones
          </p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <ModernCard key={rating.id}>
          <ModernCardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                {rating.user_avatar_url ? (
                  <img
                    src={rating.user_avatar_url}
                    alt={rating.user_nickname}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-white">
                      {rating.user_nickname}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= rating.rating
                                ? 'fill-[#FFC000] text-[#FFC000]'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-400">
                        {format(new Date(rating.created_at), 'PPP', {
                          locale: es
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {rating.comment && (
                  <p className="text-slate-300 text-sm mt-2 whitespace-pre-wrap">
                    {rating.comment}
                  </p>
                )}
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      ))}

      {hasMore && (
        <div className="text-center pt-2">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            {loading ? 'Cargando...' : 'Cargar más valoraciones'}
          </Button>
        </div>
      )}
    </div>
  );
}
