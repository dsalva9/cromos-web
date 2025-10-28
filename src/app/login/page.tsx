'use client';

import { siteConfig } from '@/config/site';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { supabase } = useSupabase();
  const router = useRouter();

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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, postcode')
          .eq('id', userId)
          .maybeSingle();

        const nickname = profileData?.nickname?.trim() ?? '';
        const postcode = profileData?.postcode?.trim() ?? '';

        const isProfileComplete =
          !!nickname &&
          nickname.toLowerCase() !== 'sin nombre' &&
          !!postcode;

        if (profileError) {
          router.push('/profile/completar');
          return;
        }

        router.push(isProfileComplete ? '/' : '/profile/completar');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F2937] flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-[#FFC000] rounded-md mx-auto mb-4 flex items-center justify-center text-4xl border-2 border-black shadow-xl">
          ⚽
        </div>
        <h1 className="text-3xl font-black uppercase text-white mb-2">
          {siteConfig.name}
        </h1>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-white mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-300 font-medium">Accede a tu colección de cromos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-bold uppercase text-white"
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
                className="rounded-md bg-gray-900 border-2 border-black text-white placeholder-gray-500 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-bold uppercase text-white"
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
                className="rounded-md bg-gray-900 border-2 border-black text-white placeholder-gray-500 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            {error && (
              <div className="bg-[#E84D4D] border-2 border-black rounded-md p-4">
                <p className="text-sm text-white font-bold">{error}</p>
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

          <div className="mt-8 text-center space-y-4">
            <Link
              href="/forgot-password"
              className="text-sm text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <div className="border-t-2 border-gray-700 pt-4">
              <p className="text-sm text-gray-300 font-medium">
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
          className="text-gray-300 hover:text-white text-sm font-bold hover:underline"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}



