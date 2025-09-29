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
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">InternTrack</h1>
              </div>
              <div className="hidden md:block ml-6">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {stats && (
                    <>
                      <span>{stats.total.toLocaleString()} internships</span>
                      <span>•</span>
                      <span>{stats.remote} remote</span>
                      <span>•</span>
                      <span>{stats.programSpecific} programs</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh
              </button>
              <a
                href="/admin/ingestion"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-lg">
            <SearchBar
              value={search}
              onChange={handleSearchChange}
              placeholder="Search internships by title, company, or description..."
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Compact Sidebar - Filters */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-900">Filters</h2>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              
              <div className="p-4">
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
            {error ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-red-600 mb-2">Failed to load internships</div>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
  );
}