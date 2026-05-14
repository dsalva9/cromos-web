'use client';

import { Plus } from 'lucide-react';
import Link from '@/components/ui/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/** Strip the locale prefix from a pathname for matching. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

export function FloatingActionBtn() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);

  // Determine action based on current path
  let actionLink = null;
  let ariaLabel = '';

  if ((pathname === '/marketplace' || pathname?.startsWith('/marketplace/')) &&
    !pathname?.includes('/chat') &&
    !pathname?.endsWith('/create')) {
    actionLink = '/marketplace/create';
    ariaLabel = 'Publicar Anuncio';
  } else if (pathname === '/mis-plantillas/create' || pathname?.startsWith('/templates/create')) {
    actionLink = '/templates/create';
    ariaLabel = 'Crear Plantilla';
  } else if (pathname === '/templates' || pathname === '/mis-plantillas' || pathname?.startsWith('/templates/')) {
    // On /templates or /mis-plantillas, we point to explore templates
    actionLink = '/templates';
    ariaLabel = 'Explorar Colecciones';
  } else if (pathname?.startsWith('/mis-plantillas/') || pathname?.startsWith('/mi-coleccion/')) {
    // If inside an album, we could point to adding stickers, 
    // but for now let's show the create template as a secondary? 
    // Or maybe "Quick Entry" should be handled here if we can.
    // For now, let's just restore visibility to Marketplace and Templates.
  }

  // If no action defined for this page, don't render
  if (!actionLink) return null;

  // Hide on desktop
  return (
    <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-40">
      <Link
        href={actionLink}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold focus:ring-offset-white dark:focus:ring-offset-gray-900",
          "bg-gold text-black hover:bg-gold-light dark:hover:bg-gold-light"
        )}
        aria-label={ariaLabel}
      >
        <Plus className="h-8 w-8" />
      </Link>
    </div>
  );
}
