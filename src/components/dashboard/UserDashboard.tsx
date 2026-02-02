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
import { Star, User, Trophy, LayoutGrid, Check, X, ArrowRight, Package, Heart, Store, PlusCircle, MessageCircle, Lightbulb } from 'lucide-react';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { logger } from '@/lib/logger';
import { Listing } from '@/types/v1.6.0';
import { ContextualTip } from '@/components/ui/ContextualTip';

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

    // 3. Recent Marketplace Listings
    const [recentListings, setRecentListings] = useState<Listing[]>([]);
    const [loadingRecentListings, setLoadingRecentListings] = useState(true);

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

    // --- Fetch Recent Marketplace Listings ---
    useEffect(() => {
        async function fetchRecentListings() {
            try {
                setLoadingRecentListings(true);
                const { data, error } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (error) throw error;
                setRecentListings(data || []);
            } catch (error) {
                logger.error('Error fetching recent listings:', error);
            } finally {
                setLoadingRecentListings(false);
            }
        }
        fetchRecentListings();
    }, [supabase]);

    const activeListings = useMemo(() => listings.filter(l => l.status === 'active'), [listings]);

    // Find the album with most missing cromos for CTA
    const mostIncompleteAlbum = useMemo(() => {
        if (copies.length === 0) return null;
        return copies.reduce((prev, current) => {
            const prevMissing = prev.total_slots - prev.completed_slots;
            const currentMissing = current.total_slots - current.completed_slots;
            return currentMissing > prevMissing ? current : prev;
        });
    }, [copies]);

    // --- Profile Header Logic (Derived) ---
    const displayAvatarUrl = useMemo(
        () => resolveAvatarUrl(profile?.avatar_url ?? null, supabase),
        [profile?.avatar_url, supabase]
    );

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-8 space-y-8">
                    {/* Compact Profile skeleton */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                            </div>
                        </div>
                    </div>
                    {/* Quick actions skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
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

                {/* 1. Compact Profile Header */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                {displayAvatarUrl ? (
                                    <Image src={displayAvatarUrl} alt={profile.nickname || 'Avatar'} width={64} height={64} className="rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm bg-gray-50 dark:bg-gray-800" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                        <User className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{profile.nickname}</h1>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} className={`h-4 w-4 ${star <= Math.round(profile.rating_avg) ? 'fill-[#FFC000] text-[#FFC000]' : 'text-gray-200 dark:text-gray-600'}`} />
                                        ))}
                                    </div>
                                </div>
                                {profile.is_admin && (
                                    <Badge className="bg-red-50 text-red-600 border-red-100 mt-2">Administrador</Badge>
                                )}
                            </div>
                        </div>
                        <Link href="/ajustes" className="text-sm font-bold text-[#FFC000] hover:text-[#FFD700] transition-colors">
                            Editar Perfil
                        </Link>
                    </div>
                </div>

                {/* 2. Quick Actions Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/marketplace" className="group">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-[#FFC000] transition-all hover:shadow-md">
                            <Store className="h-6 w-6 text-[#FFC000] mb-2" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Explorar Marketplace</p>
                        </div>
                    </Link>
                    <Link href="/marketplace/create" className="group">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-[#FFC000] transition-all hover:shadow-md">
                            <PlusCircle className="h-6 w-6 text-[#FFC000] mb-2" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Publicar Anuncio</p>
                        </div>
                    </Link>
                    <Link href="/templates" className="group">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-[#FFC000] transition-all hover:shadow-md">
                            <LayoutGrid className="h-6 w-6 text-[#FFC000] mb-2" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Descubrir Colecciones</p>
                        </div>
                    </Link>
                    <Link href="/chats" className="group">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-[#FFC000] transition-all hover:shadow-md">
                            <MessageCircle className="h-6 w-6 text-[#FFC000] mb-2" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Mis Chats</p>
                        </div>
                    </Link>
                </div>

                {/* 3. Contextual Tip */}
                <ContextualTip
                    tipId="tip-dashboard"
                    icon={Lightbulb}
                    title="Cómo empezar"
                    description="Visita el Marketplace para ver qué hay disponible, o explora las Colecciones para copiar un álbum y empezar a seguir tus cromos. Cuando tengas repetidos, publícalos en el Marketplace para intercambiar con otros coleccionistas."
                />

                {/* 4. Complete Your Collection CTA Banner */}
                {mostIncompleteAlbum && mostIncompleteAlbum.completion_percentage < 100 ? (
                    <div className="bg-gradient-to-r from-[#FFC000]/10 to-[#FFD700]/10 dark:from-[#FFC000]/5 dark:to-[#FFD700]/5 border-2 border-[#FFC000] rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Completa tu colección</p>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    Te faltan {mostIncompleteAlbum.total_slots - mostIncompleteAlbum.completed_slots} cromos de {mostIncompleteAlbum.title}
                                </h3>
                            </div>
                            <Link href="/marketplace">
                                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-black whitespace-nowrap">
                                    Buscar en el Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : copies.length === 0 ? (
                    <div className="bg-gradient-to-r from-[#FFC000]/10 to-[#FFD700]/10 dark:from-[#FFC000]/5 dark:to-[#FFD700]/5 border-2 border-[#FFC000] rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Empieza a coleccionar</p>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    Comienza tu primera colección
                                </h3>
                            </div>
                            <Link href="/templates">
                                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-black whitespace-nowrap">
                                    Explorar Colecciones <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {/* 5. Albums (Mis Álbumes) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase">Mis Álbumes</h2>
                        <Link href="/templates">
                            <Button variant="outline" size="sm" className="hidden md:flex">
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Ver Todas
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

                {/* 6. Badges */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <ProfileBadgesSimple userId={user?.id || ''} isOwnProfile={true} />
                </div>

                {/* 7. Recent Marketplace Listings */}
                {!loadingRecentListings && recentListings.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase">Últimos Anuncios</h2>
                            <Link href="/marketplace" className="text-sm font-bold text-[#FFC000] hover:text-[#FFD700] transition-colors flex items-center gap-1">
                                Ver más en el Marketplace <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recentListings.map(listing => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    </div>
                )}

                {loadingRecentListings && (
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase">Últimos Anuncios</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        </div>
                    </div>
                )}

                {/* 8. Stats/Action Cards */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    {activeListings.length === 0 ? (
                        <Link href="/marketplace/create" className="block transform transition hover:scale-[1.02]">
                            <div className="text-center bg-gradient-to-br from-[#FFC000]/10 to-[#FFD700]/10 dark:from-[#FFC000]/5 dark:to-[#FFD700]/5 rounded-xl p-4 border-2 border-dashed border-[#FFC000]/50 hover:border-[#FFC000]">
                                <PlusCircle className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                                <p className="text-sm font-black text-gray-900 dark:text-white">Publica tu primer anuncio</p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/marketplace/my-listings" className="block transform transition hover:scale-[1.02]">
                            <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600">
                                <Package className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{activeListings.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Anuncios activos</p>
                            </div>
                        </Link>
                    )}

                    {profile.favorites_count === 0 ? (
                        <Link href="/marketplace" className="block transform transition hover:scale-[1.02]">
                            <div className="text-center bg-gradient-to-br from-[#FFC000]/10 to-[#FFD700]/10 dark:from-[#FFC000]/5 dark:to-[#FFD700]/5 rounded-xl p-4 border-2 border-dashed border-[#FFC000]/50 hover:border-[#FFC000]">
                                <Heart className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                                <p className="text-sm font-black text-gray-900 dark:text-white">Guarda tus favoritos</p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/favorites" className="block transform transition hover:scale-[1.02]">
                            <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600">
                                <Heart className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.favorites_count}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Favoritos</p>
                            </div>
                        </Link>
                    )}

                    <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <Star className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.rating_count}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Valoraciones</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
