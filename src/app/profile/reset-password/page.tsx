'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const { supabase } = useSupabase();
  const router = useRouter();

  // Set recovery flag when page loads (user came from recovery link)
  useEffect(() => {
    // Check if user has a session and if they arrived here via recovery
    const checkAndSetRecoveryFlag = async () => {
      // Give Supabase a moment to process hash tokens if present
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Set the recovery flag to prevent navigation until password is changed
        sessionStorage.setItem('password_recovery_required', 'true');
        console.log('[ResetPassword] Recovery flag set - user must reset password');
      } else {
        setError('No se pudo verificar la sesión. Por favor, solicita un nuevo enlace de recuperación.');
      }

      setCheckingSession(false);
    };

    checkAndSetRecoveryFlag();
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Clear the password recovery flag
        sessionStorage.removeItem('password_recovery_required');
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
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

      {/* Card */}
      <div className="w-full max-w-md bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-white mb-2">
              Nueva Contraseña
            </h2>
            <p className="text-gray-300 font-medium">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {checkingSession ? (
            <div className="bg-gray-700 border-2 border-black rounded-md p-6 text-center">
              <p className="text-white font-bold text-lg mb-2">
                Verificando sesión...
              </p>
              <p className="text-white text-sm">
                Por favor espera un momento
              </p>
            </div>
          ) : success ? (
            <div className="bg-green-600 border-2 border-black rounded-md p-6 text-center">
              <p className="text-white font-bold text-lg mb-2">
                ✅ Contraseña actualizada
              </p>
              <p className="text-white text-sm">
                Redirigiendo a la página principal...
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-bold uppercase text-white"
                >
                  Nueva Contraseña
                </label>

                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
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
                {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          )}

          {!success && !checkingSession && (
            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
              >
                ← Volver a Iniciar Sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
