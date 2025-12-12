'use client';

import { siteConfig } from '@/config/site';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { supabase } = useSupabase();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile/reset-password`,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: 'Si el email existe, recibirás un enlace para recuperar tu contraseña.',
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage({ type: 'error', text: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
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
              Recuperar Contraseña
            </h2>
            <p className="text-gray-300 font-medium">
              Ingresa tu email y te enviaremos las instrucciones
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md bg-gray-900 border-2 border-black text-white placeholder-gray-500 focus:border-[#FFC000] focus:ring-[#FFC000]"
              />
            </div>

            {message && (
              <div
                className={`border-2 border-black rounded-md p-4 ${
                  message.type === 'success' ? 'bg-green-600' : 'bg-[#E84D4D]'
                }`}
              >
                <p className="text-sm text-white font-bold">{message.text}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-[#FFC000] hover:text-yellow-400 font-bold hover:underline"
            >
              ← Volver a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
