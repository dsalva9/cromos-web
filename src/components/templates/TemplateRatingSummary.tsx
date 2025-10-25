'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RatingSummary } from '@/hooks/templates/useTemplateRatings';

interface TemplateRatingSummaryProps {
  summary: RatingSummary;
  onRateClick: () => void;
  isAuthor: boolean;
  hasUserRated: boolean;
}

export function TemplateRatingSummary({
  summary,
  onRateClick,
  isAuthor,
  hasUserRated
}: TemplateRatingSummaryProps) {
  const distribution = summary.rating_distribution;
  const total = summary.rating_count;

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const stars = [
    { label: '5 estrellas', count: distribution['5_star'], value: 5 },
    { label: '4 estrellas', count: distribution['4_star'], value: 4 },
    { label: '3 estrellas', count: distribution['3_star'], value: 3 },
    { label: '2 estrellas', count: distribution['2_star'], value: 2 },
    { label: '1 estrella', count: distribution['1_star'], value: 1 }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-1">
              {summary.rating_avg.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(summary.rating_avg)
                      ? 'fill-[#FFC000] text-[#FFC000]'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-slate-400">
              {total} {total === 1 ? 'valoración' : 'valoraciones'}
            </div>
          </div>
        </div>

        {/* Rating Bars */}
        <div className="flex-grow max-w-md space-y-2">
          {stars.map((star) => (
            <div key={star.value} className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 w-24 text-slate-400">
                <span>{star.value}</span>
                <Star className="h-3 w-3 fill-[#FFC000] text-[#FFC000]" />
              </div>
              <div className="flex-grow bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#FFC000] h-full transition-all duration-300"
                  style={{ width: `${getPercentage(star.count)}%` }}
                />
              </div>
              <span className="text-slate-400 w-12 text-right">{star.count}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="md:ml-4">
          {isAuthor ? (
            <div className="text-sm text-slate-400 bg-slate-800 px-4 py-3 rounded-lg border border-slate-700">
              No puedes valorar tus propias plantillas
            </div>
          ) : (
            <Button
              onClick={onRateClick}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium px-6"
            >
              <Star className="mr-2 h-4 w-4" />
              {hasUserRated ? 'Actualizar valoración' : 'Valorar plantilla'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
