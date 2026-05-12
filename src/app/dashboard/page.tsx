import dynamic from 'next/dynamic';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Lazy-load UserDashboard — heavy client component
const UserDashboard = dynamic(() => import('@/components/dashboard/UserDashboard'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 animate-pulse p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  ),
});

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Unauthenticated users shouldn't access the dashboard
  if (!session?.user) {
    redirect('/login?redirectTo=/dashboard');
  }

  return <UserDashboard />;
}
