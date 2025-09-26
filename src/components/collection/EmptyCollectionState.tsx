'use client';


import { siteConfig } from '@/config/site';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Trophy, Plus } from 'lucide-react';

export default function EmptyCollectionState() {
  const router = useRouter();

  const handleGoToProfile = () => {
    router.push('/profile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl">
        <ModernCard className="bg-white/90 backdrop-blur-sm border border-white/20">
          <ModernCardContent className="p-12 text-center">
            <Trophy className="w-20 h-20 text-teal-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              ¡Bienvenido a {siteConfig.name}!
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Aún no sigues ninguna colección
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Para empezar a intercambiar cromos, primero necesitas seguir una
              colección. Explora las colecciones disponibles y elige la que más
              te guste.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleGoToProfile}
                size="lg"
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Seguir una Colección
              </Button>

              <p className="text-sm text-gray-500">
                Ve a tu perfil para explorar las colecciones disponibles
              </p>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </div>
  );
}


