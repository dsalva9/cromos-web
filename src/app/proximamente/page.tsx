import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Próximamente - ${siteConfig.name}`,
  description: 'CambioCromos estará disponible muy pronto.',
};

export default function ProximamentePage() {
  return (
    <div className="min-h-screen bg-[#1F2937] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            CambioCromos
          </h1>
          <div className="h-1 w-24 bg-[#FFC000] mx-auto rounded-full"></div>
        </div>

        {/* Coming Soon Message */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#FFC000]">
            Próximamente
          </h2>
          <p className="text-xl md:text-2xl text-gray-300">
            Estamos preparando algo especial para ti
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            La plataforma definitiva para coleccionar e intercambiar cromos deportivos
            estará disponible muy pronto.
          </p>
        </div>

        {/* Visual Element */}
        <div className="pt-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FFC000] rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-[#FFC000] rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-[#FFC000] rounded-full animate-pulse delay-200"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} CambioCromos. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
