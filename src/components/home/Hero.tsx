'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Zap } from 'lucide-react';

interface HeroProps {
  isAuthenticated: boolean;
}

export default function Hero({ isAuthenticated }: HeroProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center">
        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Badge
            variant="outline"
            className="bg-gray-800 text-white border-2 border-black px-4 py-2 text-sm font-bold shadow-xl"
          >
            <Lock className="w-4 h-4 mr-2" />
            Login Requerido
          </Badge>
          <Badge
            variant="outline"
            className="bg-[#FFC000] text-gray-900 border-2 border-black px-4 py-2 text-sm font-bold shadow-xl"
          >
            <Zap className="w-4 h-4 mr-2" />
            Gratis
          </Badge>
        </div>

        {/* Hero headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase text-white mb-6 leading-tight">
          Intercambia Cromos
          <br />
          <span className="text-[#FFC000]">Sin Límites</span>
        </h1>

        {/* Subcopy */}
        <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Conecta con coleccionistas de todo el mundo. Completa tu álbum,
          intercambia duplicados y encuentra los cromos que te faltan.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isAuthenticated ? (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-yellow-300"
              >
                <Link href="/mi-coleccion">Mi Colección</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-gray-500"
              >
                <Link href="/trades/find">Buscar Intercambios</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-yellow-300"
              >
                <Link href="/signup">Crear Cuenta</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-gray-500"
              >
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
