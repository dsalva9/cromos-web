'use client';

import AuthGuard from '@/components/AuthGuard';
import { ProfileCompletionGuard } from '@/components/profile/ProfileCompletionGuard';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProfileCompletionGuard>{children}</ProfileCompletionGuard>
    </AuthGuard>
  );
}

