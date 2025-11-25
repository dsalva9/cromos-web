'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Store, FilePlus, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function FloatingActionBtn() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Hide on desktop
  return (
    <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-40" ref={menuRef}>
      {/* Menu Items */}
      <div className={cn(
        "absolute bottom-full right-0 mb-4 flex flex-col items-end space-y-4 transition-all duration-200",
        isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <Link
          href="/templates/create"
          className="flex items-center gap-3 group"
        >
          <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Crear Plantilla
          </span>
          <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
            <FilePlus className="h-6 w-6" />
          </div>
        </Link>

        <Link
          href="/marketplace/create"
          className="flex items-center gap-3 group"
        >
          <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Publicar Anuncio
          </span>
          <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
            <Store className="h-6 w-6" />
          </div>
        </Link>
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFC000]",
          isOpen ? "bg-gray-900 text-white rotate-45" : "bg-[#FFC000] text-black rotate-0"
        )}
        aria-label="Crear nuevo"
      >
        <Plus className="h-8 w-8" />
      </button>
    </div>
  );
}
