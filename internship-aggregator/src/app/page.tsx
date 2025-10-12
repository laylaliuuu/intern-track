'use client';

import { useState } from 'react';
import ModernFilterBar from '@/components/ModernFilterBar';
import InternshipTableTemplate from '@/components/InternshipTableTemplate';

interface FilterState {
  status: string[];
  responsiblePerson: string[];
  employeesInvolved: string[];
  moreFilters: string[];
}

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    responsiblePerson: [],
    employeesInvolved: [],
    moreFilters: []
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Internship</h1>
          <p className="text-gray-600">Discover and track internship opportunities from top companies. Filter by role, location, major, and more.</p>
        </div>

        <ModernFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({
            status: [],
            responsiblePerson: [],
            employeesInvolved: [],
            moreFilters: []
          })}
          totalResults={573}
        />

        {/* Table */}
        <div className="mt-8">
          <InternshipTableTemplate internships={[]} isLoading={false} />
        </div>
      </div>
    </div>
  );
}