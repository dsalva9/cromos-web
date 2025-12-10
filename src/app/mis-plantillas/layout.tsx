'use client';

import AuthGuard from '@/components/AuthGuard';

export default function MisPlantillasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}

