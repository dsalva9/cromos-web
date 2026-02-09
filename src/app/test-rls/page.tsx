'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestRLSPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '✅';
    setResults(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      addResult(`Error getting current user: ${error.message}`, true);
      return null;
    }
    if (!user) {
      addResult('No user is currently logged in', true);
      return null;
    }
    addResult(`Current user: ${user.email} (ID: ${user.id})`);
    return user;
  };

  const testUpdateOwnProfile = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const newNickname = `TestUser_${Date.now()}`;
      addResult(`Attempting to update own profile (${user.id}) with nickname: ${newNickname}`);

      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname: newNickname })
        .eq('id', user.id)
        .select();

      if (error) {
        addResult(`FAILED: ${error.message}`, true);
        addResult('This SHOULD have succeeded - RLS may be blocking own updates!', true);
      } else {
        addResult(`SUCCESS: Updated own profile. New data: ${JSON.stringify(data)}`);
        addResult('This is EXPECTED - users should be able to update their own profile');
      }
    } catch (err) {
      addResult(`Exception: ${err}`, true);
    } finally {
      setLoading(false);
    }
  };

  const testUpdateOtherProfile = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Prompt for the other user's ID
      const otherUserId = prompt('Enter the UUID of the other user (User B) to test:');
      if (!otherUserId) {
        addResult('Test cancelled - no user ID provided', true);
        setLoading(false);
        return;
      }

      addResult(`Attempting to update OTHER user's profile (${otherUserId})`);

      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname: 'HACKED_BY_RLS_TEST' })
        .eq('id', otherUserId)
        .select();

      if (error) {
        addResult(`BLOCKED by error: ${error.message}`);
        addResult('This is EXPECTED - RLS should prevent updating other users');
      } else if (!data || data.length === 0) {
        addResult(`BLOCKED by RLS: No rows were updated (returned empty array)`);
        addResult('This is EXPECTED - RLS silently filtered out unauthorized rows ✅');
      } else {
        addResult(`SECURITY ISSUE: Successfully updated other user's profile!`, true);
        addResult(`Data returned: ${JSON.stringify(data)}`, true);
        addResult('This is a SECURITY VULNERABILITY - RLS is NOT working!', true);
      }
    } catch (err) {
      addResult(`Exception: ${err}`, true);
    } finally {
      setLoading(false);
    }
  };

  const testReadOtherProfile = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const otherUserId = prompt('Enter the UUID of another user to read:');
      if (!otherUserId) {
        addResult('Test cancelled - no user ID provided', true);
        setLoading(false);
        return;
      }

      addResult(`Attempting to read OTHER user's profile (${otherUserId})`);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      if (error) {
        addResult(`Error reading profile: ${error.message}`, true);
      } else {
        addResult(`SUCCESS: Can read other user's profile (this is expected)`);
        addResult(`Nickname: ${data?.nickname}, Location: ${data?.postcode}`);
      }
    } catch (err) {
      addResult(`Exception: ${err}`, true);
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    clearResults();
    addResult('=== Starting Full RLS Test Suite ===');

    await testUpdateOwnProfile();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between tests

    await testUpdateOtherProfile();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testReadOtherProfile();

    addResult('=== Test Suite Complete ===');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RLS Security Test Page</h1>
        <p className="text-gray-600 mb-6">
          Test Row Level Security policies on the profiles table
        </p>

        <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-6">
          <h2 className="text-yellow-700 font-bold mb-2">⚠️ Instructions:</h2>
          <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
            <li>Make sure you are logged in as User A</li>
            <li>Have User B&apos;s UUID ready (86b9dca5-e9ed-4c54-8aff-99cb84c3f51c)</li>
            <li>Click &quot;Run Full Test&quot; or run individual tests</li>
            <li>Expected: Own updates succeed, other updates fail</li>
          </ol>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={runFullTest}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded"
          >
            {loading ? 'Running Tests...' : 'Run Full Test Suite'}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={testUpdateOwnProfile}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded"
            >
              Test: Update Own
            </button>
            <button
              onClick={testUpdateOtherProfile}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded"
            >
              Test: Update Other
            </button>
            <button
              onClick={testReadOtherProfile}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded"
            >
              Test: Read Other
            </button>
          </div>

          <button
            onClick={clearResults}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded"
          >
            Clear Results
          </button>
        </div>

        <div className="bg-gray-100 rounded p-4">
          <h2 className="text-gray-900 font-bold mb-2">Test Results:</h2>
          <div className="bg-gray-50 rounded p-3 font-mono text-sm h-96 overflow-y-auto border border-gray-200">
            {results.length === 0 ? (
              <p className="text-gray-500">No tests run yet...</p>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className={`mb-1 ${result.includes('❌') ? 'text-red-400' : 'text-green-400'
                    }`}
                >
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-gray-100 rounded p-4">
          <h3 className="text-gray-900 font-bold mb-2">Quick Reference:</h3>
          <div className="text-gray-700 text-sm space-y-1">
            <p><strong>User B ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded">86b9dca5-e9ed-4c54-8aff-99cb84c3f51c</code></p>
            <p><strong>Test ID:</strong> CP-F01-02D</p>
          </div>
        </div>
      </div>
    </div>
  );
}
