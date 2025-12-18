'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  isAuthenticated: boolean;
}

export default function Hero({ isAuthenticated }: HeroProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center space-y-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge className="bg-[#FFC000] text-gray-900 border-2 border-black px-4 py-2 text-sm font-bold shadow-xl">
            <Zap className="mr-2 h-4 w-4" />
            Marketplace + Plantillas v1.6.0
          </Badge>
          <Badge
            variant="outline"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-black px-4 py-2 text-sm font-bold shadow-xl"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Moderación con auditoría
          </Badge>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase text-gray-900 dark:text-white leading-tight">
            Intercambia cromos con
            <br />
            <span className="text-[#FFC000]">plantillas inteligentes</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Gestiona tu colección, publica duplicados y negocia intercambios en
            un entorno seguro, optimizado y listo para escalar a futuros
            agentes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-black bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold uppercase text-gray-900 dark:text-white shadow-lg">
            Plantillas sincronizadas con el marketplace
          </div>
          <div className="rounded-lg border-2 border-black bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold uppercase text-gray-900 dark:text-white shadow-lg">
            Chats privados y reputación verificada
          </div>
          <div className="rounded-lg border-2 border-black bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold uppercase text-gray-900 dark:text-white shadow-lg">
            Moderación con registro de auditoría
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isAuthenticated ? (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-yellow-300"
              >
                <Link href="/marketplace/create">Publicar anuncio</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-gray-300"
              >
                <Link href="/mis-plantillas">Mis plantillas</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-yellow-300"
              >
                <Link href="/signup">Crear cuenta</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg px-8 py-6 border-2 border-black rounded-lg shadow-xl transition-all hover:scale-105 focus:ring-4 focus:ring-gray-300"
              >
                <Link href="/marketplace">Explorar marketplace</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
