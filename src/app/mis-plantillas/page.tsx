import { getMyTemplateCopies } from '@/lib/templates/server-my-templates';
import { MyTemplatesContent } from '@/components/templates/MyTemplatesContent';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

// Force dynamic rendering - page requires authentication
// See: /docs/isr-page-caching.md for details
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis Álbumes | Cambio Cromos',
  description: 'Gestiona tus colecciones de cromos, revisa tu progreso y organiza tus álbumes.',
};

export default async function MyTemplatesPage() {
  // Fetch data on server
  const copies = await getMyTemplateCopies();

  // Redirect if not authenticated
  if (copies === null) {
    redirect('/login?redirectTo=/mis-plantillas');
  }

  return (
    <MyTemplatesContent copies={copies} />
  );
}
