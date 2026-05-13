import { getMyCreatedTemplates } from '@/lib/templates/server-my-created-templates';
import { MyCreatedTemplatesContent } from '@/components/templates/MyCreatedTemplatesContent';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mis Colecciones Creadas | Cambio Cromos',
  description: 'Gestiona las colecciones que has creado, edita su contenido y controla su visibilidad.',
};

export default async function MyCreatedTemplatesPage() {
  // Fetch data and auth check on server
  const templates = await getMyCreatedTemplates();

  // Redirect if not authenticated
  if (templates === null) {
    redirect('/login?redirectTo=/templates/my-templates');
  }

  return (
    <MyCreatedTemplatesContent
      templates={templates}
      userNickname=""
    />
  );
}
