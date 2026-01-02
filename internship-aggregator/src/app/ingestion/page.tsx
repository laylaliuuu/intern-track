'use client';

import { useState } from 'react';
import { Play, Database, Download, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';

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

export default function IngestionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [companies, setCompanies] = useState('Google,Microsoft,Meta,Apple,Amazon');
  const [maxResults, setMaxResults] = useState(50);
  const [dryRun, setDryRun] = useState(true);

  const handleIngestion = async (type: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      let url = '';
      let body = {};

      if (type === 'companies') {
        url = '/api/ingestion?action=companies';
        const companyList = companies.split(',').map(c => c.trim());
        url += `&companies=${companyList.join(',')}&dryRun=${dryRun}`;
      } else if (type === 'diversity') {
        url = '/api/ingestion?action=diversity';
        url += `&dryRun=${dryRun}`;
      } else if (type === 'full') {
        url = '/api/ingestion';
        body = {
          companies: companies.split(',').map(c => c.trim()),
          maxResults,
          includePrograms: true,
          dryRun,
          skipDuplicates: true,
          batchSize: 25
        };
      }

      const response = await fetch(url, {
        method: type === 'full' ? 'POST' : 'GET',
        headers: type === 'full' ? { 'Content-Type': 'application/json' } : {},
        body: type === 'full' ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ success: true, summary: data.summary });
      } else {
        setResult({ success: false, error: data.error || 'Ingestion failed' });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Data Ingestion
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Dashboard</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manually trigger data ingestion from Exa.ai and populate your database with real internship data.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center mb-6">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Companies (comma-separated)
              </label>
              <input
                type="text"
                value={companies}
                onChange={(e) => setCompanies(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Google, Microsoft, Meta, Apple, Amazon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Results
              </label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Dry Run (test without saving to database)</span>
            </label>
          </div>
        </div>

        {/* Ingestion Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Company Ingestion */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Database className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Company Data</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Fetch internships from specific companies using Exa.ai search.
            </p>
            <button
              onClick={() => handleIngestion('companies')}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Play className="w-4 h-4 mr-2" />
                  Start Company Ingestion
                </div>
              )}
            </button>
          </div>

          {/* Diversity Programs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Download className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Diversity Programs</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Fetch diversity and inclusion internship programs.
            </p>
            <button
              onClick={() => handleIngestion('diversity')}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Play className="w-4 h-4 mr-2" />
                  Start Diversity Ingestion
                </div>
              )}
            </button>
          </div>

          {/* Full Ingestion */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Database className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Full Pipeline</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Run complete ingestion pipeline with all features.
            </p>
            <button
              onClick={() => handleIngestion('full')}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Play className="w-4 h-4 mr-2" />
                  Start Full Ingestion
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center mb-6">
              {result.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 mr-3" />
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {result.success ? 'Ingestion Successful' : 'Ingestion Failed'}
              </h2>
            </div>

            {result.success && result.summary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{result.summary.fetched}</div>
                  <div className="text-sm text-gray-600">Fetched</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.normalized}</div>
                  <div className="text-sm text-gray-600">Normalized</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{result.summary.inserted}</div>
                  <div className="text-sm text-gray-600">Inserted</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.summary.executionTime}ms</div>
                  <div className="text-sm text-gray-600">Execution Time</div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Main Website
          </a>
        </div>
      </div>
    </div>
  );
}
