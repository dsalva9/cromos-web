'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Listing } from '@/types/v1.6.0';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LeanListingCardProps {
    listing: Listing;
}

export function LeanListingCard({ listing }: LeanListingCardProps) {

    const getStatusColor = (status: string, isPack: boolean = false) => {
        switch (status) {
            case 'active':
                if (isPack) return 'bg-blue-100 text-blue-800 border-blue-200';
                return 'bg-green-100 text-green-800 border-green-200';
            case 'sold':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'removed':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return listing.is_group ? 'PACK' : null;
            case 'sold':
                return 'VENDIDO';
            case 'removed':
                return 'ELIMINADO';
            default:
                return status;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'hoy';
        if (diffDays === 1) return 'ayer';
        if (diffDays < 7)
            return `hace ${diffDays} ${diffDays === 1 ? 'd' : 'd'}`;
        return `hace ${diffDays}d`;
    };

    return (
        <Link href="/signup" className="group block h-full">
            <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">

                {/* Image Container */}
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
                    {listing.image_url ? (
                        <Image
                            src={listing.image_url}
                            alt={listing.title}
                            fill
                            className="object-contain transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-400 font-bold text-6xl">
                            {listing.title.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 pointer-events-none">
                        {getStatusLabel(listing.status) && (
                            <span
                                className={cn(
                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border",
                                    getStatusColor(listing.status, listing.is_group)
                                )}
                            >
                                {getStatusLabel(listing.status)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-sm group-hover:text-[#FFC000] transition-colors">
                                {listing.title}
                            </h3>
                            {listing.collection_name && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                    {listing.collection_name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] text-gray-400 font-medium">
                            Publicado {formatDate(listing.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
