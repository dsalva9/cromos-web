'use client';


import { siteConfig } from '@/config/site';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { supabase } = useSupabase();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex flex-col items-center justify-center px-4">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-[#FFC000] rounded-md mx-auto mb-4 flex items-center justify-center text-4xl border-2 border-black shadow-xl">
            📧
          </div>
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            ¡Revisa tu email!
          </h1>
        </div>

        {/* Success Card */}
        <div className="w-full max-w-md bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-xl font-black uppercase text-white mb-2">
                Cuenta creada
              </h2>
              <p className="text-gray-300 font-medium">
                Te hemos enviado un enlace de confirmación a{' '}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">
                Haz clic en el enlace del email para activar tu cuenta y empezar
                a coleccionar cromos.
              </p>

              <Link href="/login">
                <Button className="w-full bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200">
                  Ir a iniciar sesión
                </Button>
              </Link>
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

      {/* Signup Card */}
      <div className="w-full max-w-md bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-white mb-2">
              Crear Cuenta
            </h2>
            <p className="text-gray-300 font-medium">
              Únete a la comunidad de coleccionistas
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
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

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-bold uppercase text-white"
              >
                Confirmar Contraseña
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <div className="border-t-2 border-gray-700 pt-6">
              <p className="text-sm text-gray-300 font-medium">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
                >
                  Iniciar sesión
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



