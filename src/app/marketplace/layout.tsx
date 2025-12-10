'use client';

import AuthGuard from '@/components/AuthGuard';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}

