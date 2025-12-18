'use client';

import { siteConfig } from '@/config/site';

export default function SiteFooter() {
  return (
    <footer className="bg-gray-50 border-t-2 border-gray-200 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">
          {/* Brand */}
          <div className="text-center">
            <p className="text-gray-900 font-black text-base uppercase tracking-wide">{siteConfig.name}</p>
            <p className="text-gray-600 text-xs mt-1 font-medium">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
