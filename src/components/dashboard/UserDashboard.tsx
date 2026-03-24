'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { useRouter } from '@/hooks/use-router';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useUserProfile } from '@/hooks/social/useUserProfile';
import { ProfileBadgesSimple } from '@/components/badges/ProfileBadgesSimple';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, User, Trophy, LayoutGrid, Check, X, ArrowRight, Package, Heart, Store, PlusCircle, MessageCircle, Lightbulb, ShoppingBag, Sparkles } from 'lucide-react';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { useMarketplaceAvailabilityCounts } from '@/hooks/marketplace/useMarketplaceAvailability';

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



    // --- Fetch Templates ---
    useEffect(() => {
        let cancelled = false;

        async function fetchCopies() {
            if (!user) return;
            try {
                setLoadingCopies(true);
                const { data, error } = await supabase.rpc('get_my_template_copies');

                if (cancelled) return;
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
            } catch (error: any) {
                // Ignore fetch aborts caused by navigating away from the page
                const message = error?.message || error?.details || '';
                if (cancelled || message.includes('Failed to fetch') || message.includes('AbortError')) {
                    return;
                }
                logger.error('Error fetching copies:', error);
            } finally {
                if (!cancelled) {
                    setLoadingCopies(false);
                }
            }
        }
        fetchCopies();

        return () => { cancelled = true; };
    }, [user, supabase]);



    const activeListings = useMemo(() => listings.filter(l => l.status === 'active'), [listings]);

    // Marketplace availability counts per album
    const { counts: availabilityCounts } = useMarketplaceAvailabilityCounts();

    // Build a lookup: copy_id → missing_in_marketplace count
    const availabilityMap = useMemo(() => {
        const map = new Map<number, number>();
        for (const entry of availabilityCounts) {
            map.set(entry.copy_id, entry.missing_in_marketplace);
        }
        return map;
    }, [availabilityCounts]);

    // Albums with marketplace availability, sorted by count descending
    const albumsWithAvailability = useMemo(() => {
        return copies
            .filter(c => {
                const count = availabilityMap.get(Number(c.copy_id)) ?? 0;
                return count > 0 && c.completion_percentage < 100;
            })
            .sort((a, b) => {
                const aCount = availabilityMap.get(Number(a.copy_id)) ?? 0;
                const bCount = availabilityMap.get(Number(b.copy_id)) ?? 0;
                return bCount - aCount;
            });
    }, [copies, availabilityMap]);

    // Rotation state for CTA banner
    const [ctaIndex, setCtaIndex] = useState(0);
    useEffect(() => {
        if (albumsWithAvailability.length <= 1) return;
        const interval = setInterval(() => {
            setCtaIndex(prev => (prev + 1) % albumsWithAvailability.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [albumsWithAvailability.length]);

    const ctaAlbum = albumsWithAvailability[ctaIndex % Math.max(albumsWithAvailability.length, 1)] ?? null;
    const ctaCount = ctaAlbum ? (availabilityMap.get(Number(ctaAlbum.copy_id)) ?? 0) : 0;

    // Fallback: album with most missing stickers (for when no marketplace data)
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

                {/* 1. Profile Header — gradient accent with gold shimmer */}
                <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    {/* Subtle gold gradient strip at the top */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
                    <div className="p-6 pt-7">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="flex-shrink-0 relative">
                                    {displayAvatarUrl ? (
                                        <Image src={displayAvatarUrl} alt={profile.nickname || 'Avatar'} width={64} height={64} className="rounded-full border-2 border-gold/30 object-cover shadow-sm bg-gray-50 dark:bg-gray-800" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gold/30 flex items-center justify-center">
                                            <User className="h-8 w-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <h1 className="text-2xl font-black text-gray-900 dark:text-white truncate">{profile.nickname}</h1>
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={`h-4 w-4 transition-colors ${star <= Math.round(profile.rating_avg) ? 'fill-gold text-gold' : 'text-gray-200 dark:text-gray-600'}`} />
                                            ))}
                                            {profile.rating_count > 0 && (
                                                <span className="ml-1 text-xs text-gray-400">({profile.rating_count})</span>
                                            )}
                                        </div>
                                    </div>
                                    {profile.is_admin && (
                                        <Badge className="bg-red-50 text-red-600 border-red-100 mt-2">Administrador</Badge>
                                    )}
                                </div>
                            </div>
                            <Link href={`/users/${user?.id}`} className="text-sm font-bold text-gold hover:text-gold-light transition-colors flex-shrink-0">
                                Editar Perfil
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. Quick Actions Bar — with subtle hover glow */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { href: '/marketplace', icon: Store, label: 'Explorar Marketplace' },
                        { href: '/marketplace/create', icon: PlusCircle, label: 'Publicar Anuncio' },
                        { href: '/templates', icon: LayoutGrid, label: 'Descubrir Colecciones' },
                        { href: '/chats', icon: MessageCircle, label: 'Mis Chats' },
                    ].map(({ href, icon: Icon, label }) => (
                        <Link key={href} href={href} className="group">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all duration-200 hover:border-gold hover:shadow-[0_0_0_1px_var(--gold),0_4px_12px_rgba(0,0,0,0.08)]">
                                <Icon className="h-6 w-6 text-gold mb-2 transition-transform duration-200 group-hover:scale-110" />
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* 3. Contextual Tip */}
                <ContextualTip
                    tipId="tip-dashboard"
                    icon={Lightbulb}
                    title="Cómo empezar"
                    description={
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Visita el Marketplace para encontrar esos cromos que te faltan.</li>
                            <li>Explora las Colecciones para copiar un Álbum y empezar a seguir tus cromos.</li>
                            <li>Cuando tengas repetidos, publícalos en el Marketplace para intercambiar con otros coleccionistas.</li>
                        </ul>
                    }
                />

                {/* 4. Complete Your Collection CTA Banner */}
                {ctaAlbum && ctaCount > 0 ? (
                    <div className="relative bg-gradient-to-r from-gold/10 via-gold-light/5 to-gold/10 dark:from-gold/5 dark:via-gold-light/3 dark:to-gold/5 border-2 border-gold rounded-2xl p-6 transition-all duration-500 overflow-hidden">
                        {/* Decorative sparkle */}
                        <Sparkles className="absolute top-4 right-4 w-5 h-5 text-gold/30 hidden md:block" />
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase mb-1 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-gold" />
                                    Disponible en Marketplace
                                </p>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    {ctaCount} {ctaCount === 1 ? 'cromo' : 'cromos'} de {ctaAlbum.title} disponibles
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Te faltan {ctaAlbum.total_slots - ctaAlbum.completed_slots} cromos en total
                                </p>
                            </div>
                            <Link href={`/marketplace?collection=${ctaAlbum.copy_id}`}>
                                <Button className="bg-gold text-black hover:bg-gold-light font-black whitespace-nowrap shadow-sm hover:shadow-md transition-all">
                                    Ver en Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                        {albumsWithAvailability.length > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {albumsWithAvailability.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCtaIndex(i)}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            i === ctaIndex
                                                ? "bg-gold w-4"
                                                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                                        )}
                                        aria-label={`Ver álbum ${i + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : mostIncompleteAlbum && mostIncompleteAlbum.completion_percentage < 100 ? (
                    <div className="bg-gradient-to-r from-gold/10 to-gold-light/10 dark:from-gold/5 dark:to-gold-light/5 border-2 border-gold rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Completa tu colección</p>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    Te faltan {mostIncompleteAlbum.total_slots - mostIncompleteAlbum.completed_slots} cromos de {mostIncompleteAlbum.title}
                                </h3>
                            </div>
                            <Link href="/marketplace">
                                <Button className="bg-gold text-black hover:bg-gold-light font-black whitespace-nowrap shadow-sm hover:shadow-md transition-all">
                                    Buscar en el Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : copies.length === 0 ? (
                    <div className="bg-gradient-to-r from-gold/10 to-gold-light/10 dark:from-gold/5 dark:to-gold-light/5 border-2 border-gold rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Empieza a coleccionar</p>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    Comienza tu primera colección
                                </h3>
                            </div>
                            <Link href="/templates">
                                <Button className="bg-gold text-black hover:bg-gold-light font-black whitespace-nowrap shadow-sm hover:shadow-md transition-all">
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
                                <Button className="bg-gold text-black hover:bg-gold-light font-bold">
                                    Explorar Colecciones
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {copies.map(copy => {
                                const percentage = copy.completion_percentage;
                                const isComplete = percentage === 100;
                                const missing = copy.total_slots - copy.completed_slots;

                                return (
                                    <Link key={copy.copy_id} href={`/mis-plantillas/${copy.copy_id}`} className="block">
                                        <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-200 hover:border-gold hover:shadow-[0_0_0_1px_var(--gold),0_4px_16px_rgba(0,0,0,0.08)] p-4">
                                            {/* Completion trophy indicator */}
                                            {isComplete && (
                                                <div className="absolute top-3 right-3">
                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-1.5">
                                                        <Trophy className="w-4 h-4 text-green-500" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-gold transition-colors line-clamp-1 pr-8">{copy.title}</h3>

                                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        <User className="w-3 h-3" />
                                                        <span>por {copy.original_author_nickname}</span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold uppercase">
                                                            <span>Progreso</span>
                                                            <span className={isComplete ? "text-green-600" : "text-gold"}>{percentage}%</span>
                                                        </div>
                                                        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-gold to-gold-light'}`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-right text-gray-400">{copy.completed_slots} / {copy.total_slots} cromos</p>
                                                    </div>

                                                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/10 px-2.5 py-1 rounded-md text-xs font-bold text-green-700 dark:text-green-400">
                                                            <Check className="w-3 h-3" />
                                                            <span>TENGO {copy.completed_slots}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/10 px-2.5 py-1 rounded-md text-xs font-bold text-red-700 dark:text-red-400">
                                                            <X className="w-3 h-3" />
                                                            <span>FALTAN {missing}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-end text-xs font-black uppercase text-gray-400 group-hover:text-gold transition-colors">
                                                <span>Gestionar Colección</span>
                                                <ArrowRight className="w-3 h-3 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
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



                {/* 8. Stats/Action Cards — enhanced with micro-interactions */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    {activeListings.length === 0 ? (
                        <Link href="/marketplace/create" className="group block h-full">
                            <div className="flex flex-col items-center justify-center h-full text-center bg-gradient-to-br from-gold/10 to-gold-light/10 dark:from-gold/5 dark:to-gold-light/5 rounded-xl p-4 border-2 border-dashed border-gold/50 group-hover:border-gold transition-all duration-200 group-hover:shadow-sm group-active:scale-[0.98]">
                                <PlusCircle className="h-6 w-6 mb-2 text-gold transition-transform duration-200 group-hover:scale-110" />
                                <p className="text-sm font-black text-gray-900 dark:text-white">Publica tu primer anuncio</p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/marketplace/my-listings" className="group block h-full">
                            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 group-hover:border-gold/50 transition-all duration-200 group-hover:shadow-sm group-active:scale-[0.98]">
                                <Package className="h-6 w-6 mb-2 text-gold" />
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{activeListings.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Anuncios activos</p>
                            </div>
                        </Link>
                    )}

                    {profile.favorites_count === 0 ? (
                        <Link href="/marketplace" className="group block h-full">
                            <div className="flex flex-col items-center justify-center h-full text-center bg-gradient-to-br from-gold/10 to-gold-light/10 dark:from-gold/5 dark:to-gold-light/5 rounded-xl p-4 border-2 border-dashed border-gold/50 group-hover:border-gold transition-all duration-200 group-hover:shadow-sm group-active:scale-[0.98]">
                                <Heart className="h-6 w-6 mb-2 text-gold transition-transform duration-200 group-hover:scale-110" />
                                <p className="text-sm font-black text-gray-900 dark:text-white">Guarda tus favoritos</p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/favorites" className="group block h-full">
                            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 group-hover:border-gold/50 transition-all duration-200 group-hover:shadow-sm group-active:scale-[0.98]">
                                <Heart className="h-6 w-6 mb-2 text-gold" />
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{profile.favorites_count}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Favoritos</p>
                            </div>
                        </Link>
                    )}

                    <Link href={`/users/${user?.id}#valoraciones`} className="group block h-full">
                        <div className="flex flex-col items-center justify-center h-full text-center bg-gradient-to-br from-gold/10 to-gold-light/10 dark:from-gold/5 dark:to-gold-light/5 rounded-xl p-4 border-2 border-dashed border-gold/50 group-hover:border-gold transition-all duration-200 group-hover:shadow-sm group-active:scale-[0.98]">
                            <Star className="h-6 w-6 mb-2 text-gold transition-transform duration-200 group-hover:scale-110" />
                            <p className="text-sm font-black text-gray-900 dark:text-white">
                                {profile.rating_count} {profile.rating_count === 1 ? 'Valoración' : 'Valoraciones'}
                            </p>
                        </div>
                    </Link>
                </div>

            </div>
        </div>
    );
}
