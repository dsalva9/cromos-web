import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
    title: `Iniciar Sesión | ${siteConfig.name}`,
    description:
        'Inicia sesión en CambioCromos para gestionar tu colección de cromos, intercambiar con otros coleccionistas y acceder al marketplace.',
    alternates: {
        canonical: `${siteConfig.url}/login`,
    },
    openGraph: {
        title: `Iniciar Sesión | ${siteConfig.name}`,
        description:
            'Inicia sesión en CambioCromos para gestionar tu colección de cromos, intercambiar con otros coleccionistas y acceder al marketplace.',
        url: `${siteConfig.url}/login`,
        siteName: siteConfig.name,
        type: 'website',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
