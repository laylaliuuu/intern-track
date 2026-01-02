'use client';

import { useState, useEffect } from 'react';
import { useInternships, useFilterOptions } from '@/hooks/use-internships';
import { useRealtime } from '@/components/RealtimeProvider';
import ModernFilterBar from '@/components/ModernFilterBar';
import InternshipTableTemplate from '@/components/InternshipTableTemplate';
import { HiddenGemsSection } from '@/components/HiddenGemsSection';
import { InternshipFilters } from '@/hooks/use-internships';

export default function HomePage() {
  const [filters, setFilters] = useState<InternshipFilters>({
    roles: [],
    majors: [],
    locations: [],
    isRemote: undefined,
    workType: [],
    eligibilityYear: [],
    internshipCycle: [],
    postedWithin: undefined,
    showProgramSpecific: undefined,
    search: undefined,
    limit: 200, // Increased from 50 to 200
    offset: 0
  });

  // Get realtime functionality
  const { isConnected, subscribeToInternships, unsubscribeFromInternships } = useRealtime();

  // Fetch internships with React Query
  const { data: internshipsData, isLoading, error } = useInternships(filters);
  const { roles, locations, majors, isLoading: filtersLoading } = useFilterOptions();

  // Subscribe to real-time updates when component mounts
  useEffect(() => {
    if (isConnected) {
      console.log('Subscribing to real-time internship updates...');
      subscribeToInternships(filters);
    }

    return () => {
      console.log('Unsubscribing from real-time updates...');
      unsubscribeFromInternships();
    };
  }, [isConnected, subscribeToInternships, unsubscribeFromInternships, filters]);

  const handleFilterChange = (newFilters: InternshipFilters) => {
    setFilters(newFilters);
  };

  const handleRowClick = (internship: any) => {
    // Handle row click - could open detail modal, navigate to detail page, etc.
    console.log('Clicked internship:', internship);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your Perfect 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Internship</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover and track internship opportunities from top companies. 
            <span className="font-semibold text-gray-800">Filter by role, location, major, and more.</span>
          </p>
          
          {/* Real-time Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live updates enabled' : 'Connecting to live updates...'}
            </span>
          </div>
        </div>

        <ModernFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => setFilters({
            roles: [],
            majors: [],
            locations: [],
            isRemote: undefined,
            workType: [],
            eligibilityYear: [],
            internshipCycle: [],
            postedWithin: undefined,
            showProgramSpecific: undefined,
            search: undefined,
            limit: 50,
            offset: 0
          })}
          totalResults={internshipsData?.total || 0}
          filterOptions={{
            roles: roles.data || [],
            locations: locations.data || [],
            majors: majors.data || []
          }}
          isLoading={filtersLoading}
        />

        {/* Error State */}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error loading internships</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error.message || 'Something went wrong. Please try again.'}
                </div>
                {process.env.NODE_ENV === 'development' && error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">Technical details</summary>
                    <pre className="mt-2 text-xs text-red-500 overflow-auto">{error.stack}</pre>
                  </details>
                )}
                <div className="mt-3 text-xs text-red-600">
                  <p>Common fixes:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check that Supabase environment variables are set in Vercel</li>
                    <li>Verify database connection and table permissions</li>
                    <li>Check Vercel function logs for more details</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <InternshipTableTemplate 
              internships={internshipsData?.data || []} 
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Hidden Gems Section */}
        <div className="mt-16">
          <HiddenGemsSection />
        </div>
      </div>
    </div>
  );
}