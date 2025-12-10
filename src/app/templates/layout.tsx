'use client';

import AuthGuard from '@/components/AuthGuard';

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}

