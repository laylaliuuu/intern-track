// React Query configuration and client setup
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache internship data for 5 minutes since it updates frequently
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep data in cache for 30 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to avoid excessive API calls
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // Internship-related queries
  internships: {
    all: ['internships'] as const,
    lists: () => [...queryKeys.internships.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.internships.lists(), filters] as const,
    details: () => [...queryKeys.internships.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.internships.details(), id] as const,
  },
  
  // Filter-related queries
  filters: {
    all: ['filters'] as const,
    roles: () => [...queryKeys.filters.all, 'roles'] as const,
    locations: () => [...queryKeys.filters.all, 'locations'] as const,
    majors: () => [...queryKeys.filters.all, 'majors'] as const,
  },
  
  // Search-related queries
  search: {
    all: ['search'] as const,
    suggestions: (query: string) => [...queryKeys.search.all, 'suggestions', query] as const,
  },
  
  // System health and monitoring
  health: {
    all: ['health'] as const,
    sources: () => [...queryKeys.health.all, 'sources'] as const,
    ingestion: () => [...queryKeys.health.all, 'ingestion'] as const,
  },
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all internship data (use after new ingestion)
  allInternships: () => queryClient.invalidateQueries({ 
    queryKey: queryKeys.internships.all 
  }),
  
  // Invalidate specific internship list (use after filters change)
  internshipList: (filters: Record<string, any>) => queryClient.invalidateQueries({ 
    queryKey: queryKeys.internships.list(filters) 
  }),
  
  // Invalidate all filter options (use after data schema changes)
  allFilters: () => queryClient.invalidateQueries({ 
    queryKey: queryKeys.filters.all 
  }),
  
  // Invalidate search results (use after search index updates)
  allSearch: () => queryClient.invalidateQueries({ 
    queryKey: queryKeys.search.all 
  }),
};

// Prefetch helpers for better UX
export const prefetchQueries = {
  // Prefetch popular filter combinations
  popularFilters: async () => {
    const popularCombinations = [
      { roles: 'Software Engineering', cycle: 'Summer 2025' },
      { roles: 'Product Management', cycle: 'Summer 2025' },
      { roles: 'Data Science', cycle: 'Summer 2025' },
      { locations: 'Remote', cycle: 'Summer 2025' },
    ];

    return Promise.all(
      popularCombinations.map(filters =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.internships.list(filters),
          queryFn: () => fetch(`/api/internships?${new URLSearchParams(filters)}`).then(res => res.json()),
          staleTime: 10 * 60 * 1000, // 10 minutes for prefetched data
        })
      )
    );
  },
  
  // Prefetch filter options on app load
  filterOptions: async () => {
    return Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.filters.roles(),
        queryFn: () => fetch('/api/filters/roles').then(res => res.json()),
        staleTime: 60 * 60 * 1000, // 1 hour
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.filters.locations(),
        queryFn: () => fetch('/api/filters/locations').then(res => res.json()),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
    ]);
  },
};

// Real-time update helpers
export const realtimeUpdates = {
  // Add new internship to cache optimistically
  addInternship: (newInternship: any) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.internships.lists() },
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: [newInternship, ...oldData.data],
          total: oldData.total + 1,
        };
      }
    );
  },
  
  // Update existing internship in cache
  updateInternship: (updatedInternship: any) => {
    // Update in lists
    queryClient.setQueriesData(
      { queryKey: queryKeys.internships.lists() },
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((item: any) =>
            item.id === updatedInternship.id ? updatedInternship : item
          ),
        };
      }
    );
    
    // Update in detail cache
    queryClient.setQueryData(
      queryKeys.internships.detail(updatedInternship.id),
      updatedInternship
    );
  },
  
  // Remove internship from cache
  removeInternship: (internshipId: string) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.internships.lists() },
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.filter((item: any) => item.id !== internshipId),
          total: oldData.total - 1,
        };
      }
    );
    
    // Remove from detail cache
    queryClient.removeQueries({
      queryKey: queryKeys.internships.detail(internshipId)
    });
  },
};