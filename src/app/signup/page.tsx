'use client';


import { siteConfig } from '@/config/site';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsErrorMessage =
    'Debes aceptar los terminos del servicio para crear tu cuenta';
  const { supabase } = useSupabase();

  const handleTermsToggle = (value: boolean | 'indeterminate') => {
    const nextValue = value === true;
    setTermsAccepted(nextValue);
    if (nextValue && error === termsErrorMessage) {
      setError('');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      setError(termsErrorMessage);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
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
      setError('unexpected');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-[#FFC000] rounded-md mx-auto mb-4 flex items-center justify-center text-4xl border-2 border-black shadow-xl">
            📧
          </div>
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            ¡Revisa tu email!
          </h1>
        </div>

        {/* Success Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-2">
                Cuenta creada
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Te hemos enviado un enlace de confirmación a{' '}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
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
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
          {siteConfig.name}
        </h1>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-2">
              Crear Cuenta
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Únete a la comunidad de coleccionistas
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
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

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
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
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            <div className="rounded-md border-2 border-black bg-gray-50 dark:bg-gray-900 px-4 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={handleTermsToggle}
                  className="mt-1"
                  aria-describedby="terms-helper"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <label
                    htmlFor="terms"
                    className="font-medium text-gray-900 dark:text-white cursor-pointer select-none"
                  >
                    Acepto los terminos del servicio
                  </label>
                  <p id="terms-helper" className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    He leído y acepto los{' '}
                    <Link
                      href="/legal/terms"
                      target="_blank"
                      className="font-semibold text-[#FFC000] hover:text-yellow-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                    >
                      Términos de servicio
                    </Link>{' '}
                    y la{' '}
                    <Link
                      href="/legal/privacy"
                      target="_blank"
                      className="font-semibold text-[#FFC000] hover:text-yellow-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                    >
                      Política de privacidad
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-[#E84D4D] border-2 border-black rounded-md p-4">
                <p className="text-sm text-white font-bold">
                  {error === 'unexpected' ? 'Ocurrió un error inesperado.' : error}
                </p>
                <p className="text-sm text-white font-bold mt-2">
                  Por favor contacta con{' '}
                  <a
                    href="mailto:soporte@cambiocromos.com"
                    className="underline hover:text-gray-200"
                  >
                    soporte@cambiocromos.com
                  </a>
                </p>
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
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
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
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold hover:underline"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}



