'use client';

import AuthGuard from '@/components/AuthGuard';
import { ProfileCompletionGuard } from '@/components/profile/ProfileCompletionGuard';

export default function TemplatesLayout({
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

