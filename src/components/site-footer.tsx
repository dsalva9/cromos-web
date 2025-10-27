'use client';

import { siteConfig } from '@/config/site';

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 border-t-2 border-black py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">
          {/* Brand */}
          <div className="text-center">
            <p className="text-white font-black text-base uppercase tracking-wide">{siteConfig.name}</p>
            <p className="text-gray-400 text-xs mt-1 font-medium">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
