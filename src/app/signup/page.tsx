'use client';

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
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex flex-col items-center justify-center px-4">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl backdrop-blur-sm border border-white/30">
            📧
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
            ¡Revisa tu email!
          </h1>
        </div>

        {/* Success Card with Glass Effect */}
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Cuenta creada
              </h2>
              <p className="text-gray-600">
                Te hemos enviado un enlace de confirmación a{' '}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Haz clic en el enlace del email para activar tu cuenta y empezar
                a coleccionar cromos.
              </p>

              <Link href="/login">
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl">
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
            className="text-white/80 hover:text-white text-sm font-medium hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl backdrop-blur-sm border border-white/30">
          ⚽
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
          CambiaCromos
        </h1>
      </div>

      {/* Signup Card with Dark Effect */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#1a1a2e',
          color: 'white',
          border: 'none',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              Crear Cuenta
            </h2>
            <p className="text-gray-300">
              Únete a la comunidad de coleccionistas
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-200"
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
                className="rounded-xl bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 focus:bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-200"
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
                className="rounded-xl bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 focus:bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-semibold text-gray-200"
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
                className="rounded-xl bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 focus:bg-gray-700"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-xl p-4">
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <div className="border-t border-gray-600 pt-6">
              <p className="text-sm text-gray-300">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
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
          className="text-white/80 hover:text-white text-sm font-medium hover:underline"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
