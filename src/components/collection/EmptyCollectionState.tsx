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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl">
        <ModernCard className="bg-white border-2 border-gray-200 shadow-xl">
          <ModernCardContent className="p-12 text-center">
            <Trophy className="w-20 h-20 text-[#FFC000] mx-auto mb-6" />
            <h1 className="text-3xl font-black uppercase text-gray-900 mb-4">
              ¡Bienvenido a {siteConfig.name}!
            </h1>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Aún no sigues ninguna colección
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed font-medium">
              Para empezar a intercambiar cromos, primero necesitas seguir una
              colección. Explora las colecciones disponibles y elige la que más
              te guste.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleGoToProfile}
                size="lg"
                className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 px-8 py-3 text-lg font-black uppercase rounded-md shadow-xl border-2 border-black transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Seguir una Colección
              </Button>

              <p className="text-sm text-gray-600 font-medium">
                Ve a tu perfil para explorar las colecciones disponibles
              </p>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </div>
  );
}



