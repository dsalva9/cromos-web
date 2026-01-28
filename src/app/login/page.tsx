'use client';

import { siteConfig } from '@/config/site';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GoogleIcon } from '@/components/ui/google-icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { supabase } = useSupabase();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };

    checkAuth();
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        const userId = data?.user?.id;

        if (!userId) {
          router.push('/');
          return;
        }

        // Check if user is suspended
        // Note: We need to check immediately before SupabaseProvider signs them out
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, postcode, avatar_url, is_suspended')
          .eq('id', userId)
          .maybeSingle();

        console.log('Profile data:', profileData, 'Error:', profileError);

        // If no profile data returned (null), user might have been signed out or doesn't exist
        if (!profileData && !profileError) {
          console.log('No profile data, user may be suspended and already signed out');
          await supabase.auth.signOut();
          setLoading(false);
          setError('suspended');
          return;
        }

        // If profile query failed, it might be because user is suspended and can't access data
        if (profileError) {
          console.log('Profile error detected, signing out');
          await supabase.auth.signOut();
          setLoading(false);
          setError('suspended');
          return;
        }

        // If user is suspended, sign them out and show error
        if (profileData?.is_suspended) {
          console.log('User is suspended, signing out');
          await supabase.auth.signOut();
          setLoading(false);
          setError('suspended');
          return;
        }

        const nickname = profileData?.nickname?.trim() ?? '';
        const postcode = profileData?.postcode?.trim() ?? '';
        const avatarUrl = profileData?.avatar_url?.trim() ?? '';

        const nicknameLower = nickname.toLowerCase();
        const postcodeLower = postcode.toLowerCase();

        const hasPlaceholderNickname =
          nicknameLower === 'sin nombre' || nicknameLower.startsWith('pending_');
        const hasPlaceholderPostcode = postcodeLower === 'pending';

        const isProfileComplete =
          !!nickname &&
          !!postcode &&
          !!avatarUrl &&
          !hasPlaceholderNickname &&
          !hasPlaceholderPostcode;

        router.push(isProfileComplete ? '/' : '/profile/completar');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch {
      setError('An unexpected error occurred during Google Sign In');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <div className="relative w-48 h-48 mx-auto mb-4">
          <Image
            src="/assets/LogoBlanco.png"
            alt="Logo"
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
      </div>
      <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
        {siteConfig.name}
      </h1>


      {/* Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Accede a tu colección de cromos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
              >
                Email
              </label>

              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
              >
                Contraseña
              </label>

              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            {error && (
              <div className="bg-[#E84D4D] border-2 border-black rounded-md p-4">
                <p className="text-sm text-white font-bold">
                  {error === 'suspended' ? (
                    <>
                      Tu cuenta está suspendida, por favor contacta con{' '}
                      <a
                        href="mailto:admin@cambiocromos.com"
                        className="underline hover:text-gray-200"
                      >
                        admin@cambiocromos.com
                      </a>
                    </>
                  ) : (
                    <>
                      {error}
                      <br />
                      <br />
                      Por favor contacta con{' '}
                      <a
                        href="mailto:soporte@cambiocromos.com"
                        className="underline hover:text-gray-200"
                      >
                        soporte@cambiocromos.com
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-gray-200 dark:border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-white dark:bg-gray-800 px-4 text-gray-500 font-bold">O</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-md shadow-lg border-2 border-black flex items-center justify-center gap-3 transition-all duration-200"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleIcon className="w-5 h-5" />
            <span>Continuar con Google</span>
          </Button>

          <div className="mt-8 text-center space-y-4">
            <Link
              href="/forgot-password"
              className="text-sm text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                ¿No tienes cuenta?{' '}
                <Link
                  href="/signup"
                  className="text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
                >
                  Crear cuenta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8">
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold hover:underline"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div >
  );
}



