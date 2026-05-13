import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';

/**
 * Auth callback layout — minimal provider wrapper.
 * The auth callback lives outside [locale] (OAuth redirects from Supabase
 * don't include locale prefixes), but it needs SupabaseProvider and
 * QueryProvider for session exchange logic.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupabaseProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </SupabaseProvider>
  );
}
