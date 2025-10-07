'use client';

import Link from 'next/link';
import { siteConfig } from '@/config/site';

const footerLinks = [
  { href: '/mi-coleccion', label: 'Mi Colección' },
  { href: '/trades/find', label: 'Intercambios' },
  { href: '/trades/proposals', label: 'Mis Propuestas' },
  { href: '/profile', label: 'Perfil' },
];

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 border-t-2 border-black py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <p className="text-white font-black text-base uppercase tracking-wide">{siteConfig.name}</p>
            <p className="text-gray-400 text-xs mt-1 font-medium">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>

          {/* Navigation links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-3 md:gap-4">
            {footerLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-[#FFC000] text-sm font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md px-3 py-2 border-2 border-transparent hover:border-[#FFC000]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
