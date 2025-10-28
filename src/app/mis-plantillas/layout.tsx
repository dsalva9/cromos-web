'use client';

import AuthGuard from '@/components/AuthGuard';
import { ProfileCompletionGuard } from '@/components/profile/ProfileCompletionGuard';

export default function MisPlantillasLayout({
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

