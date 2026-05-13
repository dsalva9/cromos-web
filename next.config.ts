import { spawnSync } from 'node:child_process';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl plugin — must wrap outermost
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Revision for service worker precache versioning
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  images: {
    // Disable Vercel Image Optimization to stay within free tier.
    // All Supabase images are already pre-optimized (WebP, sized thumbnails).
    // next/image still handles lazy loading, layout, srcset — just skips the
    // /_next/image proxy that counts as billable transformations.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/sticker-images/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/template-images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Redirects: legacy PHP URLs → /es/ root, legacy non-prefixed URLs → /es/ prefixed
  async redirects() {
    return [
      // --- Legacy PHP redirects ---
      {
        source: '/proximamente',
        destination: '/es',
        permanent: true,
      },
      {
        source: '/parking.php',
        destination: '/es',
        permanent: true,
      },
      {
        source: '/search/tsc.php',
        destination: '/es',
        permanent: true,
      },
      {
        source: '/search/cc.php',
        destination: '/es',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(withSerwist(withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,
  // Prevent Sentry from wrapping console methods (we handle this via logger.ts)
  disableLogger: true,
})));
