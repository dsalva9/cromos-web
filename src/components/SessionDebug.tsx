'use client';
import { useSession } from '@/components/providers/SupabaseProvider';

export default function SessionDebug() {
  const session = useSession();
  return <pre>{JSON.stringify(session, null, 2)}</pre>;
}
