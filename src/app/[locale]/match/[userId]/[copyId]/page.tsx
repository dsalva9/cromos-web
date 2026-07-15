'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from '@/components/ui/link';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { MatchResultView } from '@/components/qr/MatchResultView';
import { Loader2, QrCode, ArrowLeftRight, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import GooglePlayLink from '@/components/pwa/GooglePlayLink';

interface ScannerProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

/** Detect the platform from user agent */
function detectPlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Redirect Card shown to non-authenticated users
// ─────────────────────────────────────────────────────────────────────────────
function SmartRedirectCard({
  theirNickname,
  albumName,
  redirectTo,
}: {
  theirNickname: string;
  albumName: string;
  redirectTo: string;
}) {
  const platform = detectPlatform();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-100/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-gold/20 via-yellow-50 to-white dark:from-gold/10 dark:via-gray-800 dark:to-gray-800 pt-8 pb-6 px-6 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-black">
            <Image
              src="/assets/LogoBlanco.png"
              alt="CambioCromos"
              fill
              className="object-contain bg-gray-900 p-2"
            />
          </div>
          <h1 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-1">
            ¡Alguien quiere intercambiar!
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-bold text-gray-900 dark:text-white">{theirNickname}</span> quiere
            intercambiar cromos de{' '}
            <span className="font-bold text-gray-900 dark:text-white">{albumName}</span> contigo
          </p>
        </div>

        {/* CTA body */}
        <div className="px-6 pb-6 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
            <ArrowLeftRight className="w-5 h-5 text-gold shrink-0" />
            <p>Descarga CambioCromos, abre este enlace y verás instantáneamente qué cromos podéis intercambiar.</p>
          </div>

          {platform === 'android' && (
            <GooglePlayLink
              source="match_qr_guest"
              className="inline-flex items-center justify-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-xl px-5 h-[52px] transition-colors font-semibold w-full"
            >
              {/* Google Play icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#34A853"/>
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
              </svg>
              Descargar en Google Play
            </GooglePlayLink>
          )}

          {platform === 'ios' && (
            <>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-xl px-5 h-[52px] transition-colors font-semibold w-full"
              >
                <Smartphone className="w-5 h-5" />
                Instalar CambioCromos
              </Link>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Abre cambiocromos.com en Safari y pulsa{' '}
                <span className="font-bold">Compartir → Añadir a pantalla de inicio</span>
              </p>
            </>
          )}

          {platform === 'desktop' && (
            <Button asChild className="bg-gold text-black hover:bg-yellow-400 font-bold h-[52px] rounded-xl">
              <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}>
                Crear cuenta gratis
              </Link>
            </Button>
          )}

          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-center text-sm text-gray-500 hover:text-gold transition-colors"
          >
            Ya tengo cuenta — iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function MatchQRPage() {
  const params = useParams<{ userId: string; copyId: string }>();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const { user, loading: authLoading } = useUser();

  const theirUserId = params.userId;
  const copyId = parseInt(params.copyId, 10);

  // Query-param hints for fast context (shown even before DB fetch)
  const nameHint = searchParams.get('name') ?? '';
  const albumHint = searchParams.get('album') ?? '';

  const [theirProfile, setTheirProfile] = useState<ScannerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const searchParamString = searchParams.toString();
  const currentPath = `/match/${theirUserId}/${copyId}${searchParamString ? `?${searchParamString}` : ''}`;

  useEffect(() => {
    if (!theirUserId) return;
    supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', theirUserId)
      .single()
      .then(({ data }) => {
        if (data) setTheirProfile(data as ScannerProfile);
        setProfileLoading(false);
      });
  }, [theirUserId, supabase]);

  const nickname = theirProfile?.nickname ?? nameHint ?? 'Coleccionista';
  const avatarUrl = theirProfile ? resolveAvatarUrl(theirProfile.avatar_url, supabase) : null;

  // Still loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SmartRedirectCard
        theirNickname={nickname}
        albumName={albumHint || 'tu colección'}
        redirectTo={currentPath}
      />
    );
  }

  // ── Scanned own QR ───────────────────────────────────────────────────────
  if (user.id === theirUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            ¡Este es tu propio QR!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Comparte este código con otro coleccionista para que él lo escanee.
          </p>
          <Button asChild className="bg-gold text-black hover:bg-yellow-400 font-bold">
            <Link href="/intercambios/buscar">Buscar intercambios</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Logged in — show match results ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto px-4 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {profileLoading ? (
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : avatarUrl ? (
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gold shrink-0">
              <Image src={avatarUrl} alt={nickname} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-gray-400">
                {nickname.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wide">
              Intercambio con
            </p>
            <h1 className="text-xl font-black text-gray-900 dark:text-white truncate">
              {nickname}
            </h1>
            {albumHint && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{albumHint}</p>
            )}
          </div>
        </div>

        {/* Match results */}
        <MatchResultView
          theirUserId={theirUserId}
          theirNickname={nickname}
          theirAvatarUrl={avatarUrl}
          copyId={isNaN(copyId) ? undefined : copyId}
        />
      </div>
    </div>
  );
}
