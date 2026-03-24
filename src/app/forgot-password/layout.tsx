import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
    title: 'Recuperar Contraseña',
    description:
        'Recupera tu contraseña de CambioCromos para volver a acceder a tu cuenta y seguir intercambiando cromos.',
    alternates: {
        canonical: `${siteConfig.url}/forgot-password`,
    },
    openGraph: {
        title: 'Recuperar Contraseña',
        description:
            'Recupera tu contraseña de CambioCromos para volver a acceder a tu cuenta y seguir intercambiando cromos.',
        url: `${siteConfig.url}/forgot-password`,
        siteName: siteConfig.name,
        type: 'website',
    },
};

export default function ForgotPasswordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
