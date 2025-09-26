'use client';

import { useState, useEffect } from 'react';
import { User } from '@clerk/nextjs/server';
import Link from 'next/link';

interface SystemStatus {
  memoryApi: { status: string; message?: string; stats?: any };
  blobStorage: { status: string; message?: string; url?: string };
  authentication: { status: string; user?: string };
  environment: { status: string; mode?: string };
  apiKeys: { status: string; configured?: string[] };
  errors: string[];
}

export default function AdminPanel({ user }: { user: User }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    runSystemChecks();
  }, []);

  const runSystemChecks = async () => {
    setLoading(true);
    const results: SystemStatus = {
      memoryApi: { status: 'checking' },
      blobStorage: { status: 'checking' },
      authentication: { status: 'checking' },
      environment: { status: 'checking' },
      apiKeys: { status: 'checking' },
      errors: []
    };

    try {
      // Check Memory API
      try {
        const memResponse = await fetch('/api/memory?limit=1');
        if (memResponse.ok) {
          const memData = await memResponse.json();
          results.memoryApi = {
            status: 'operational',
            stats: memData.data?.stats
          };
        } else {
          results.memoryApi = {
            status: 'error',
            message: `HTTP ${memResponse.status}`
          };
        }
      } catch (e) {
        results.memoryApi = {
          status: 'error',
          message: (e as Error).message
        };
        results.errors.push(`Memory API: ${(e as Error).message}`);
      }

      // Check Blob Storage configuration
      results.blobStorage = {
        status: process.env.NEXT_PUBLIC_BLOB_URL ? 'configured' : 'not-configured',
        url: process.env.NEXT_PUBLIC_BLOB_URL || 'https://fjxgscisvivw4piw.public.blob.vercel-storage.com'
      };

      // Check Authentication
      results.authentication = {
        status: user ? 'authenticated' : 'not-authenticated',
        user: user?.emailAddresses?.[0]?.emailAddress || user?.id
      };

      // Check Environment
      results.environment = {
        status: 'operational',
        mode: process.env.NODE_ENV || 'production'
      };

      // Check API Keys
      const configuredKeys = [];
      if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) configuredKeys.push('Clerk');
      // Note: We can't check server-side env vars from client component
      results.apiKeys = {
        status: configuredKeys.length > 0 ? 'configured' : 'missing',
        configured: configuredKeys
      };

    } catch (error) {
      results.errors.push(`System check failed: ${(error as Error).message}`);
    }

    setStatus(results);
    setLoading(false);
  };

  const runMemoryTest = async () => {
    setTestResults({ running: true });

    try {
      // Test 1: Save memory
      const saveRes = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Admin test at ${new Date().toISOString()}`,
          type: 'semantic',
          source: 'system'
        })
      });

      const saveData = await saveRes.json();

      // Test 2: Retrieve memory
      const getRes = await fetch('/api/memory?limit=5');
      const getData = await getRes.json();

      // Test 3: Search memory
      const searchRes = await fetch('/api/memory?q=test');
      const searchData = await searchRes.json();

      setTestResults({
        running: false,
        success: true,
        save: saveData.success ? 'PASS' : 'FAIL',
        retrieve: getData.success ? 'PASS' : 'FAIL',
        search: searchData.success ? 'PASS' : 'FAIL',
        totalMemories: getData.data?.memories?.length || 0,
        searchResults: searchData.data?.memories?.length || 0
      });
    } catch (error) {
      setTestResults({
        running: false,
        success: false,
        error: (error as Error).message
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-green-500',
      configured: 'bg-green-500',
      authenticated: 'bg-green-500',
      error: 'bg-red-500',
      checking: 'bg-yellow-500',
      'not-configured': 'bg-yellow-500',
      'not-authenticated': 'bg-red-500',
      missing: 'bg-red-500'
    };

    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded ${colors[status] || 'bg-gray-500'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Running system checks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/chat" className="text-blue-500 hover:underline mb-4 inline-block">
            ← Back to Chat
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Logged in as: {user.emailAddresses?.[0]?.emailAddress || user.id}
          </p>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Memory API */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Memory API</h3>
              {status && getStatusBadge(status.memoryApi.status)}
            </div>
            {status?.memoryApi.stats && (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Total Memories: {status.memoryApi.stats.count}</p>
                <p>User: {status.memoryApi.stats.bySource?.user || 0}</p>
                <p>Assistant: {status.memoryApi.stats.bySource?.assistant || 0}</p>
                <p>System: {status.memoryApi.stats.bySource?.system || 0}</p>
              </div>
            )}
            {status?.memoryApi.message && (
              <p className="text-sm text-red-500 mt-2">{status.memoryApi.message}</p>
            )}
          </div>

          {/* Blob Storage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Blob Storage</h3>
              {status && getStatusBadge(status.blobStorage.status)}
            </div>
            {status?.blobStorage.url && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="break-all">Endpoint: {status.blobStorage.url}</p>
              </div>
            )}
          </div>

          {/* Authentication */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Authentication</h3>
              {status && getStatusBadge(status.authentication.status)}
            </div>
            {status?.authentication.user && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User: {status.authentication.user}
              </p>
            )}
          </div>

          {/* Environment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Environment</h3>
              {status && getStatusBadge(status.environment.status)}
            </div>
            {status?.environment.mode && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mode: {status.environment.mode}
              </p>
            )}
          </div>

          {/* API Keys */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">API Keys</h3>
              {status && getStatusBadge(status.apiKeys.status)}
            </div>
            {status?.apiKeys.configured && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {status.apiKeys.configured.map(key => (
                  <p key={key}>✓ {key}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Test Suite */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Memory System Tests</h2>

          <button
            onClick={runMemoryTest}
            disabled={testResults?.running}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testResults?.running ? 'Running Tests...' : 'Run Test Suite'}
          </button>

          {testResults && !testResults.running && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-3 rounded ${testResults.save === 'PASS' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="font-semibold">Save Memory</p>
                  <p className={testResults.save === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                    {testResults.save || 'Not Run'}
                  </p>
                </div>
                <div className={`p-3 rounded ${testResults.retrieve === 'PASS' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="font-semibold">Retrieve Memory</p>
                  <p className={testResults.retrieve === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                    {testResults.retrieve || 'Not Run'}
                  </p>
                </div>
                <div className={`p-3 rounded ${testResults.search === 'PASS' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="font-semibold">Search Memory</p>
                  <p className={testResults.search === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                    {testResults.search || 'Not Run'}
                  </p>
                </div>
              </div>

              {testResults.totalMemories !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Total memories retrieved: {testResults.totalMemories} |
                  Search results: {testResults.searchResults}
                </p>
              )}

              {testResults.error && (
                <div className="mt-4 p-3 bg-red-100 rounded">
                  <p className="text-red-600">Error: {testResults.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Errors */}
        {status?.errors && status.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">System Errors</h3>
            <ul className="list-disc list-inside text-red-600">
              {status.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runSystemChecks}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh Status
            </button>
            <Link
              href="/test-blob"
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 inline-block"
            >
              Blob Storage Test
            </Link>
            <button
              onClick={() => window.location.href = '/api/memory'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              View Memory API
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}