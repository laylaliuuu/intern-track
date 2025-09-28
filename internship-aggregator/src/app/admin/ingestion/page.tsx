'use client';

import { useState, useEffect } from 'react';
import { INGESTION_CONFIG, getEnabledSchedules } from '../../../lib/ingestion-config';

interface IngestionResult {
  success: boolean;
  summary?: {
    fetched: number;
    normalized: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
    executionTime: number;
  };
  error?: string;
}

export default function IngestionDashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/ingestion?action=health');
      const data = await response.json();
      setHealth(data.health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const runIngestion = async (type: string, companies?: string[]) => {
    setLoading(true);
    setResult(null);

    try {
      const body: any = {
        maxResults: 20, // Limit for manual testing
        includePrograms: true,
        dryRun: false,
        skipDuplicates: true
      };

      if (companies) {
        body.companies = companies;
      }

      const response = await fetch('/api/ingestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const runScheduledIngestion = async (type: 'companies' | 'diversity') => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/ingestion?action=${type}&dryRun=false`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const enabledSchedules = getEnabledSchedules();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Ingestion Dashboard</h1>

      {/* Health Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="bg-gray-100 p-4 rounded">
          {health ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-3 rounded ${health.overall ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="font-medium">Overall Status</div>
                <div className={health.overall ? 'text-green-600' : 'text-red-600'}>
                  {health.overall ? '✅ Healthy' : '❌ Issues Detected'}
                </div>
              </div>
              <div className={`p-3 rounded ${health.database ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="font-medium">Database</div>
                <div className={health.database ? 'text-green-600' : 'text-red-600'}>
                  {health.database ? '✅ Connected' : '❌ Connection Failed'}
                </div>
              </div>
              <div className={`p-3 rounded ${health.dataFetcher?.exa ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="font-medium">Exa.ai API</div>
                <div className={health.dataFetcher?.exa ? 'text-green-600' : 'text-red-600'}>
                  {health.dataFetcher?.exa ? '✅ Available' : '❌ Unavailable'}
                </div>
              </div>
            </div>
          ) : (
            <div>Loading health status...</div>
          )}
        </div>
      </div>

      {/* Manual Ingestion Controls */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Manual Ingestion</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runIngestion('full')}
            disabled={loading}
            className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <div className="font-medium">Full Ingestion</div>
            <div className="text-sm opacity-90">All sources & companies</div>
          </button>

          <button
            onClick={() => runScheduledIngestion('companies')}
            disabled={loading}
            className="bg-green-500 text-white p-4 rounded hover:bg-green-600 disabled:opacity-50"
          >
            <div className="font-medium">Top Companies</div>
            <div className="text-sm opacity-90">Google, Microsoft, Meta, etc.</div>
          </button>

          <button
            onClick={() => runScheduledIngestion('diversity')}
            disabled={loading}
            className="bg-purple-500 text-white p-4 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            <div className="font-medium">Diversity Programs</div>
            <div className="text-sm opacity-90">STEP, Explore, etc.</div>
          </button>

          <button
            onClick={() => runIngestion('tier1', INGESTION_CONFIG.companies.tier1)}
            disabled={loading}
            className="bg-orange-500 text-white p-4 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            <div className="font-medium">Tier 1 Companies</div>
            <div className="text-sm opacity-90">{INGESTION_CONFIG.companies.tier1.length} companies</div>
          </button>

          <button
            onClick={() => runIngestion('tier2', INGESTION_CONFIG.companies.tier2)}
            disabled={loading}
            className="bg-indigo-500 text-white p-4 rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            <div className="font-medium">Tier 2 Companies</div>
            <div className="text-sm opacity-90">{INGESTION_CONFIG.companies.tier2.length} companies</div>
          </button>

          <button
            onClick={() => runIngestion('tier3', INGESTION_CONFIG.companies.tier3)}
            disabled={loading}
            className="bg-gray-500 text-white p-4 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <div className="font-medium">Tier 3 Companies</div>
            <div className="text-sm opacity-90">{INGESTION_CONFIG.companies.tier3.length} companies</div>
          </button>
        </div>
      </div>

      {/* Scheduled Jobs Configuration */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Scheduled Jobs</h2>
        <div className="bg-gray-50 p-4 rounded">
          <div className="grid gap-4">
            {enabledSchedules.map((schedule, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{schedule.name}</div>
                    <div className="text-sm text-gray-600">{schedule.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Cron: {schedule.cron} | Max Results: {schedule.maxResults}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    schedule.enabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {schedule.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-8">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              Running ingestion... This may take a few minutes.
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Last Ingestion Result</h2>
          <div className={`p-4 rounded border ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {result.success ? (
              <div>
                <div className="font-medium text-green-800 mb-2">✅ Ingestion Successful</div>
                {result.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Fetched</div>
                      <div>{result.summary.fetched}</div>
                    </div>
                    <div>
                      <div className="font-medium">Normalized</div>
                      <div>{result.summary.normalized}</div>
                    </div>
                    <div>
                      <div className="font-medium">Inserted</div>
                      <div className="text-green-600">{result.summary.inserted}</div>
                    </div>
                    <div>
                      <div className="font-medium">Updated</div>
                      <div className="text-blue-600">{result.summary.updated}</div>
                    </div>
                    <div>
                      <div className="font-medium">Skipped</div>
                      <div className="text-gray-600">{result.summary.skipped}</div>
                    </div>
                    <div>
                      <div className="font-medium">Errors</div>
                      <div className="text-red-600">{result.summary.errors}</div>
                    </div>
                    <div>
                      <div className="font-medium">Time</div>
                      <div>{(result.summary.executionTime / 1000).toFixed(1)}s</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="font-medium text-red-800 mb-2">❌ Ingestion Failed</div>
                <div className="text-red-700">{result.error}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-medium mb-2">Instructions</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use manual ingestion buttons to test the system or get fresh data</li>
          <li>• Scheduled jobs run automatically based on the cron expressions</li>
          <li>• Check system health before running ingestion</li>
          <li>• Results are limited to 20 items for manual testing</li>
          <li>• Production scheduled jobs will process larger batches</li>
        </ul>
      </div>
    </div>
  );
}