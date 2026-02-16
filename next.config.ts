import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

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
  // Redirects for legacy PHP URLs
  async redirects() {
    return [
      {
        source: '/parking.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/search/tsc.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/search/cc.php',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,
  // Prevent Sentry from wrapping console methods (we handle this via logger.ts)
  disableLogger: true,
});
