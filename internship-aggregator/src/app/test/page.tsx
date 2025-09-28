'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('Testing Supabase connection...');
        
        // Test basic connection
        const { data: internships, error: internshipsError } = await supabase
          .from('internships')
          .select('*')
          .limit(3);

        if (internshipsError) {
          console.error('Internships error:', internshipsError);
          setError(internshipsError.message);
        } else {
          console.log('Internships data:', internships);
          setData(internships);
        }

        // Test companies table
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .limit(3);

        if (companiesError) {
          console.error('Companies error:', companiesError);
        } else {
          console.log('Companies data:', companies);
        }

        // Test sources table
        const { data: sources, error: sourcesError } = await supabase
          .from('sources')
          .select('*')
          .limit(3);

        if (sourcesError) {
          console.error('Sources error:', sourcesError);
        } else {
          console.log('Sources data:', sources);
        }

      } catch (err) {
        console.error('Connection test failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Database Connection...</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      ) : (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Success!</strong> Database connection is working.
        </div>
      )}

      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Sample Internships:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Check your browser's console (F12 → Console tab) for detailed logs.</p>
      </div>
    </div>
  );
}