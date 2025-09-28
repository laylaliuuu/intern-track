'use client';

import { useState } from 'react';

export default function TestExaPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testExa = async (type: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/test-exa?type=${type}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Exa.ai Integration Test</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={() => testExa('health')}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Health Check
        </button>
        
        <button
          onClick={() => testExa('search')}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          Test Search
        </button>
        
        <button
          onClick={() => testExa('fetch')}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 ml-2"
        >
          Test Data Fetcher
        </button>
      </div>

      {loading && (
        <div className="text-blue-600 mb-4">Loading...</div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}