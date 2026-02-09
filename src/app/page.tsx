import { createServerSupabaseClient } from '@/lib/supabase/server';
import LandingPage from '@/components/home/LandingPage';
import UserDashboard from '@/components/dashboard/UserDashboard';
import NativeRedirectHandler from '@/components/native/NativeRedirectHandler';

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <>
      {/* Handles Capacitor native redirects & splash screen — renders nothing */}
      <NativeRedirectHandler isAuthenticated={isAuthenticated} />

      {isAuthenticated ? <UserDashboard /> : <LandingPage />}
    </>
  );
}
