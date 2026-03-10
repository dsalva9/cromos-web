export const siteConfig = {
  name: 'CambioCromos',
  description:
    'CambioCromos es la plataforma para coleccionar e intercambiar cromos deportivos con otros coleccionistas como tú.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://cambiocromos.com',
};

export type SiteConfig = typeof siteConfig;

