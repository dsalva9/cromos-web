import { getPublicTemplates } from '@/lib/templates/server-templates';
import { TemplatesContent } from '@/components/templates/TemplatesContent';
import { Metadata } from 'next';

// Revalidate every 60 seconds - enables ISR caching for faster page loads
// See: /docs/isr-page-caching.md for details
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Colecciones Comunitarias | Cambio Cromos',
  description: 'Descubre y copia miles de colecciones de cromos creadas por la comunidad. Inicia tu propia colección hoy.',
};

export default async function TemplatesPage() {
  // Fetch initial data on the server
  // This runs on the server and passes data to the client component
  // eliminating the initial round-trip from the client
  const initialTemplates = await getPublicTemplates({
    limit: 12,
    sortBy: 'recent'
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <TemplatesContent initialTemplates={initialTemplates} />
      </div>
    </div>
  );
}
