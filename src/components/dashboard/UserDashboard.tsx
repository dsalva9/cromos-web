'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useUserProfile } from '@/hooks/social/useUserProfile';
import { ProfileBadgesSimple } from '@/components/badges/ProfileBadgesSimple';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, User, Trophy, LayoutGrid, Check, X, ArrowRight, Package, Heart } from 'lucide-react';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { logger } from '@/lib/logger';

// Types for the dashboard
interface Rating {
    id: number;
    rater_id: string;
    rater_nickname: string;
    rater_avatar_url: string | null;
    rating: number;
    comment: string | null;
    context_type: string;
    context_id: number;
    created_at: string;
}

interface RatingSummary {
    rating_avg: number;
    rating_count: number;
    rating_distribution: {
        '5_star': number;
        '4_star': number;
        '3_star': number;
        '2_star': number;
        '1_star': number;
    };
}

// Reuse logic from server-my-templates but for client
interface TemplateCopy {
    copy_id: string;
    template_id: string;
    title: string;
    image_url?: string;
    is_active: boolean;
    copied_at: string;
    original_author_nickname: string;
    original_author_id: string;
    completed_slots: number;
    total_slots: number;
    completion_percentage: number;
}


export default function UserDashboard() {
    const { user } = useUser();
    const supabase = useSupabaseClient();
    const router = useRouter();

    // 1. Profile Data
    const { profile, listings, loading: profileLoading, error: profileError } = useUserProfile(user?.id || '');

    // 2. Templates Data
    const [copies, setCopies] = useState<TemplateCopy[]>([]);
    const [loadingCopies, setLoadingCopies] = useState(true);

    // 3. Ratings Data
    const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loadingRatings, setLoadingRatings] = useState(false);



    // --- Fetch Templates ---
    useEffect(() => {
        async function fetchCopies() {
            if (!user) return;
            try {
                setLoadingCopies(true);
                const { data, error } = await supabase.rpc('get_my_template_copies');

                if (error) throw error;

                const processedCopies = (data || []).map((copy: any) => {
                    const completed = copy.completed_slots || 0;
                    const total = copy.total_slots || 0;
                    const completionPercentage =
                        total > 0 ? Math.round((completed / total) * 100) : 0;

                    return {
                        ...copy,
                        completed_slots: completed,
                        total_slots: total,
                        completion_percentage: completionPercentage,
                    };
                });
                setCopies(processedCopies);
            } catch (error) {
                logger.error('Error fetching copies:', error);
            } finally {
                setLoadingCopies(false);
            }
        }
        fetchCopies();
    }, [user, supabase]);

    // --- Fetch Ratings (parallel) ---
    useEffect(() => {
        async function fetchRatings() {
            if (!user) return;
            setLoadingRatings(true);
            try {
                const [summaryResult, ratingsResult] = await Promise.all([
                    supabase.rpc('get_user_rating_summary', { p_user_id: user.id }),
                    supabase.rpc('get_user_ratings', { p_user_id: user.id, p_limit: 10, p_offset: 0 }),
                ]);

                if (summaryResult.data && summaryResult.data.length > 0) setRatingSummary(summaryResult.data[0]);
                setRatings(ratingsResult.data || []);
            } catch (err) {
                logger.error('Error fetching ratings:', err);
            } finally {
                setLoadingRatings(false);
            }
        }
        fetchRatings();
    }, [user, supabase]);

    // --- Render Helpers ---
    const renderStars = (rating: number) => (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-[#FFC000] text-[#FFC000]' : 'text-gray-200'}`} />
            ))}
        </div>
    );

    const renderRatingBar = (count: number, total: number) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
            <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="h-full bg-[#FFC000]" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold min-w-[2rem] text-right">{count}</span>
            </div>
        );
    };

    const activeListings = useMemo(() => listings.filter(l => l.status === 'active'), [listings]);


    // --- Profile Header Logic (Derived) ---
    // Moved up to avoid early return hook violation
    const displayAvatarUrl = useMemo(
        () => resolveAvatarUrl(profile?.avatar_url ?? null, supabase),
        [profile?.avatar_url, supabase]
    );

    const locationDisplay = profile?.location_label
        ? profile.postcode
            ? `${profile.location_label} (${profile.postcode})`
            : profile.location_label
        : profile?.postcode
            ? `CP ${profile.postcode}`
            : null;

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-8 space-y-8">
                    {/* Profile skeleton */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                        <div className="flex flex-row gap-4 md:gap-6 animate-pulse">
                            <div className="w-[120px] h-[120px] rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                            <div className="flex-1 space-y-3 py-2">
                                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                            </div>
                        </div>
                    </div>
                    {/* Albums skeleton */}
                    <div className="space-y-4 animate-pulse">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 space-y-8">

                {/* 1. Profile Header */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                    <div className="flex flex-row gap-4 md:gap-6">

                        <div className="flex-shrink-0">
                            {displayAvatarUrl ? (
                                <Image src={displayAvatarUrl} alt={profile.nickname || 'Avatar'} width={120} height={120} className="rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm bg-gray-50 dark:bg-gray-800" />
                            ) : (
                                <div className="w-30 h-30 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                    <User className="h-16 w-16 text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div>

                                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{profile.nickname}</h1>
                                {user?.email && <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">{user.email}</p>}
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>{locationDisplay || 'Sin ubicación'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <Star className="h-5 w-5 fill-[#FFC000] text-[#FFC000]" />
                                        <span className="text-gray-900 dark:text-white font-bold text-lg">{profile.rating_avg?.toFixed(1) || '0.0'}</span>
                                    </div>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">({profile.rating_count} valoraciones)</span>
                                </div>
                                {profile.is_admin && (
                                    <div className="mt-3">
                                        <Badge className="bg-red-50 text-red-600 border-red-100">Administrador</Badge>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Link href="/ajustes">
                                    <Button variant="outline">
                                        EDITAR PERFIL
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 2. Albums (Mis Plantillas) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase">Mis Álbumes</h2>
                        {/* Removed description text as requested */}
                        <Link href="/templates">
                            <Button variant="outline" size="sm" className="hidden md:flex">
                                <LayoutGrid className="mr-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>

                    {loadingCopies ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        </div>
                    ) : copies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 border-dashed">
                            <LayoutGrid className="h-10 w-10 text-gray-400 mb-3" />
                            <p className="text-gray-500 mb-4">No tienes colecciones activas</p>
                            <Link href="/templates">
                                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                                    Explorar Colecciones
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {copies.map(copy => {
                                const percentage = copy.completion_percentage;
                                const isComplete = percentage === 100;

                                return (
                                    <Link key={copy.copy_id} href={`/mis-plantillas/${copy.copy_id}`} className="block">
                                        <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#FFC000] transition-all hover:shadow-md p-4">
                                            <div className="flex items-start gap-4">
                                                {/* Mini Image (Optional as requested "no image", but maybe a super small thumb or icon is good? User said "without the image". I will assume NO image at all, just data) */}

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#FFC000] transition-colors line-clamp-1">{copy.title}</h3>
                                                        {isComplete && <Trophy className="w-5 h-5 text-green-500" />}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        <User className="w-3 h-3" />
                                                        <span>por {copy.original_author_nickname}</span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold uppercase">
                                                            <span>Progreso</span>
                                                            <span className={isComplete ? "text-green-600" : "text-[#FFC000]"}>{percentage}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#FFC000]'}`} style={{ width: `${percentage}%` }} />
                                                        </div>
                                                        <p className="text-xs text-right text-gray-400">{copy.completed_slots} / {copy.total_slots} cromos</p>
                                                    </div>

                                                    <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded text-xs font-bold text-green-700 dark:text-green-400">
                                                            <Check className="w-3 h-3" />
                                                            <span>TENGO {copy.completed_slots}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded text-xs font-bold text-red-700 dark:text-red-400">
                                                            <X className="w-3 h-3" />
                                                            <span>FALTAN {copy.total_slots - copy.completed_slots}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-end text-xs font-black uppercase text-gray-400 group-hover:text-[#FFC000] transition-colors">
                                                <span>Gestionar Colección</span>
                                                <ArrowRight className="w-3 h-3 ml-1" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 3. Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <ProfileBadgesSimple userId={user?.id || ''} isOwnProfile={true} />
                </div>

                {/* 4. Stats Cards (Moved to bottom) */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Link href="/marketplace/my-listings" className="block transform transition hover:scale-[1.02]">
                        <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600">
                            <Package className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{activeListings.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Anuncios activos</p>
                        </div>
                    </Link>
                    <Link href="/favorites" className="block transform transition hover:scale-[1.02]">
                        <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600">
                            <Heart className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.favorites_count}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Favoritos</p>
                        </div>
                    </Link>
                    <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <Star className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.rating_count}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Valoraciones</p>
                    </div>
                </div>


                {/* 3. Listings */}
                {
                    activeListings.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 border-dashed">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Anuncios</h2>
                                <div className="flex gap-2">
                                    <Badge variant="secondary">ACTIVOS {activeListings.length}</Badge>
                                    <Badge variant="outline" className="text-gray-400">RESERVADOS {listings.filter(l => l.status === 'reserved').length}</Badge>
                                    <Badge variant="outline" className="text-gray-400">COMPLETADOS {listings.filter(l => l.status === 'sold').length}</Badge>
                                    <Badge variant="outline" className="text-gray-400">ELIMINADOS {listings.filter(l => l.status === 'removed').length}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {activeListings.map(listing => (
                                    <ListingCard key={listing.id} listing={listing} />
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* 4. Ratings */}
                {
                    ratingSummary && ratingSummary.rating_count > 0 && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 border-dashed">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Valoraciones</h2>
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="flex items-end gap-3 mb-2">
                                            <span className="text-5xl font-black text-gray-900 dark:text-white">{ratingSummary.rating_avg.toFixed(1)}</span>
                                            <div className="mb-2">{renderStars(Math.round(ratingSummary.rating_avg))}</div>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">Basado en {ratingSummary.rating_count} valoraciones</p>
                                    </div>
                                    <div className="space-y-2">
                                        {['5_star', '4_star', '3_star', '2_star', '1_star'].map(key => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-16">{key.replace('_star', ' estrellas')}</span>
                                                {renderRatingBar(ratingSummary.rating_distribution[key as keyof typeof ratingSummary.rating_distribution], ratingSummary.rating_count)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div >
        </div >
    );
}
