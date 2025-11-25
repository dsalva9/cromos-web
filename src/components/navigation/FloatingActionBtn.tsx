'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function FloatingActionBtn() {
  const pathname = usePathname();

  // Determine action based on current path
  let actionLink = null;
  let ariaLabel = '';

  if (pathname === '/marketplace' || pathname?.startsWith('/marketplace/')) {
    // Only show on main marketplace page or subpages where it makes sense?
    // User asked: "when we are in Marketplace"
    // Let's show it on /marketplace and /marketplace/my-listings, but maybe not on detail pages if they cover it?
    // For now, let's stick to /marketplace root to be safe, or just check startsWith
    actionLink = '/marketplace/create';
    ariaLabel = 'Publicar Anuncio';
  } else if (pathname === '/templates' || pathname?.startsWith('/templates/')) {
    actionLink = '/templates/create';
    ariaLabel = 'Crear Plantilla';
  }

  // If no action defined for this page, don't render
  if (!actionLink) return null;

  // Hide on desktop
  return (
    <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-40">
      <Link
        href={actionLink}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFC000]",
          "bg-[#FFC000] text-black hover:bg-[#FFD700]"
        )}
        aria-label={ariaLabel}
      >
        <Plus className="h-8 w-8" />
      </Link>
    </div>
  );
}
