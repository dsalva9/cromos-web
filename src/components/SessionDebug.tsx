'use client';
import { useSession } from '@supabase/auth-helpers-react';

export default function SessionDebug() {
  const session = useSession();
  return <pre>{JSON.stringify(session, null, 2)}</pre>;
}

