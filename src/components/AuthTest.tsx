'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AuthTest() {
  const { supabase, user, session, loading } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Signed in successfully!');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      setMessage(`Error: ${message}`);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(`Error signing out: ${error.message}`);
    } else {
      setMessage('Signed out successfully!');
    }
  };

  if (loading) {
    return <div className="p-4">Loading auth state...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold">Auth Test</h2>

      {/* Current State */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <Badge variant={user ? 'default' : 'secondary'}>
            {user ? 'Authenticated' : 'Not authenticated'}
          </Badge>
        </div>

        {user && (
          <div className="space-y-1 text-sm">
            <p>
              <strong>User ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Email Confirmed:</strong>{' '}
              {user.email_confirmed_at ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {session && (
          <div className="text-xs text-muted-foreground">
            <p>
              <strong>Session expires:</strong>{' '}
              {new Date(session.expires_at! * 1000).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Auth Form or Sign Out */}
      {!user ? (
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full"
        >
          Sign Out
        </Button>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.includes('Error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}

