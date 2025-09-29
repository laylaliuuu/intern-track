'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FilterPanel from '@/components/FilterPanel';
import SearchBar from '@/components/SearchBar';
import InternshipTable from '@/components/InternshipTable';
import { Internship, FilterState } from '@/types';

interface InternshipResponse {
  success: boolean;
  data: Internship[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const DEFAULT_FILTERS: FilterState = {
  roles: [],
  majors: [],
  locations: [],
  workType: [],
  eligibilityYear: [],
  internshipCycle: [],
  postedWithin: 'month',
  showProgramSpecific: false
};

export default function InternshipDashboard() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('posted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '25',
    search,
    sortBy,
    sortOrder,
    postedWithin: filters.postedWithin,
    ...(filters.roles.length > 0 && { roles: filters.roles.join(',') }),
    ...(filters.majors.length > 0 && { majors: filters.majors.join(',') }),
    ...(filters.locations.length > 0 && { locations: filters.locations.join(',') }),
    ...(filters.workType.length > 0 && { workTypes: filters.workType.join(',') }),
    ...(filters.eligibilityYear.length > 0 && { eligibilityYears: filters.eligibilityYear.join(',') }),
    ...(filters.internshipCycle.length > 0 && { cycles: filters.internshipCycle.join(',') }),
    ...(filters.isRemote !== undefined && { isRemote: filters.isRemote.toString() }),
    ...(filters.showProgramSpecific !== undefined && { showProgramSpecific: filters.showProgramSpecific.toString() })
  });

  // Fetch internships
  const { data, isLoading, error, refetch } = useQuery<InternshipResponse>({
    queryKey: ['internships', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/internships?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch internships');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: async () => {
      const response = await fetch('/api/filters');
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page when search changes
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setPage(1);
  };

  const internships = data?.data || [];
  const pagination = data?.pagination;
  const stats = filterOptions?.data?.stats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">InternTrack</h1>
              <p className="text-sm text-gray-600">
                {stats ? `${stats.total} internships • ${stats.remote} remote • ${stats.programSpecific} program-specific` : 'Loading...'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Refresh
              </button>
              <a
                href="/admin/ingestion"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              </div>
              
              <SearchBar
                value={search}
                onChange={handleSearchChange}
                placeholder="Search internships..."
              />
              
              <div className="mt-4">
                <FilterPanel
                  filters={filters}
                  onChange={handleFilterChange}
                  options={filterOptions?.data}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border">
              {error ? (
                <div className="p-6 text-center">
                  <div className="text-red-600 mb-2">Failed to load internships</div>
                  <button
                    onClick={() => refetch()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <InternshipTable
                  internships={internships}
                  loading={isLoading}
                  pagination={pagination}
                  onPageChange={setPage}
                  onSortChange={handleSortChange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}