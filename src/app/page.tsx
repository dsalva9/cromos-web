'use client';


import { siteConfig } from '@/config/site';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Trophy, Users, MessageCircle, Star } from 'lucide-react';

export default function Home() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    // Landing page for non-authenticated users
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          {/* Hero Character */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-green-400 rounded-3xl mx-auto flex items-center justify-center text-6xl shadow-lg transform rotate-3">
              ⚽
            </div>
          </div>

          {/* App Title */}
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            {siteConfig.name}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-white/90 mb-12 max-w-md leading-relaxed">
            Intercambia cromos deportivos con coleccionistas de todo el mundo
          </p>

          {/* Auth Buttons */}
          <div className="space-y-4 w-full max-w-sm">
            <Button
              asChild
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg border-0 text-lg"
            >
              <Link href="/login">Iniciar Sesión</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 font-semibold py-4 rounded-2xl shadow-lg text-lg backdrop-blur-sm"
            >
              <Link href="/signup">Crear Cuenta</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            ¡Hola!
          </h1>
          <p className="text-white/90 text-lg">¿Qué quieres hacer hoy?</p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid gap-6 max-w-md mx-auto">
          {/* My Collection Card */}
          <Link href="/mi-coleccion">
            <ModernCard className="bg-gradient-to-r from-orange-400 to-orange-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <ModernCardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Mi Colección
                </h2>
                <p className="text-white/90 text-sm">Gestiona tus cromos</p>
              </ModernCardContent>
            </ModernCard>
          </Link>

          {/* Find Trades Card */}
          <Link href="/trades/find">
            <ModernCard className="bg-gradient-to-r from-teal-400 to-teal-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <ModernCardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Buscar Intercambios
                </h2>
                <p className="text-white/90 text-sm">
                  Encuentra otros coleccionistas
                </p>
              </ModernCardContent>
            </ModernCard>
          </Link>

          {/* Messages Card */}
          <Link href="/messages">
            <ModernCard className="bg-gradient-to-r from-green-400 to-green-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <ModernCardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Mensajes</h2>
                <p className="text-white/90 text-sm">
                  Chatea con otros usuarios
                </p>
              </ModernCardContent>
            </ModernCard>
          </Link>
        </div>

        {/* Stats or Additional Content */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <Star className="w-5 h-5 text-yellow-300 fill-current" />
            <span className="text-white font-medium">
              ¡Empieza tu colección!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


