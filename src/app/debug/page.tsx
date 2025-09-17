// src/app/debug/page.tsx
'use client';

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function DebugSession() {
  const session = useSession();
  const supabase = useSupabaseClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Session debug</h1>
      <pre className="bg-gray-100 p-3 rounded">
        {JSON.stringify(session, null, 2)}
      </pre>
      <button onClick={handleSignOut}>Sign out</button>
    </main>
  );
}
