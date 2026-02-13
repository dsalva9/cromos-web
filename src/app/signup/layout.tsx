import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
    title: `Crear Cuenta | ${siteConfig.name}`,
    description:
        'Crea tu cuenta en CambioCromos y empieza a coleccionar e intercambiar cromos deportivos con la comunidad.',
    alternates: {
        canonical: `${siteConfig.url}/signup`,
    },
    openGraph: {
        title: `Crear Cuenta | ${siteConfig.name}`,
        description:
            'Crea tu cuenta en CambioCromos y empieza a coleccionar e intercambiar cromos deportivos con la comunidad.',
        url: `${siteConfig.url}/signup`,
        siteName: siteConfig.name,
        type: 'website',
    },
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
