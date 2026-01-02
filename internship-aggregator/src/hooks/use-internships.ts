// Custom hooks for internship data fetching with React Query
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, queryClient, realtimeUpdates } from '../lib/react-query';

// Types for API responses
export interface InternshipFilters {
  roles?: string[];
  majors?: string[];
  locations?: string[];
  isRemote?: boolean;
  workType?: ('paid' | 'unpaid')[];
  eligibilityYear?: string[];
  internshipCycle?: string[];
  postedWithin?: 'day' | 'week' | 'month';
  showProgramSpecific?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InternshipListResponse {
  data: any[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface InternshipDetailResponse {
  data: any;
}

// Hook for fetching paginated internships with filters
export function useInternships(filters: InternshipFilters = {}) {
  return useQuery({
    queryKey: queryKeys.internships.list(filters),
    queryFn: async (): Promise<InternshipListResponse> => {
      const searchParams = new URLSearchParams();
      
      // Add filters to search params
      if (filters.roles?.length) {
        filters.roles.forEach(role => searchParams.append('roles', role));
      }
      if (filters.majors?.length) {
        filters.majors.forEach(major => searchParams.append('majors', major));
      }
      if (filters.locations?.length) {
        filters.locations.forEach(location => searchParams.append('locations', location));
      }
      if (filters.isRemote !== undefined) {
        searchParams.set('isRemote', filters.isRemote.toString());
      }
      if (filters.workType?.length) {
        filters.workType.forEach(type => searchParams.append('workType', type));
      }
      if (filters.eligibilityYear?.length) {
        filters.eligibilityYear.forEach(year => searchParams.append('eligibilityYear', year));
      }
      if (filters.internshipCycle?.length) {
        filters.internshipCycle.forEach(cycle => searchParams.append('internshipCycle', cycle));
      }
      if (filters.postedWithin) {
        searchParams.set('postedWithin', filters.postedWithin);
      }
      if (filters.showProgramSpecific !== undefined) {
        searchParams.set('showProgramSpecific', filters.showProgramSpecific.toString());
      }
      if (filters.search) {
        searchParams.set('search', filters.search);
      }
      if (filters.limit) {
        searchParams.set('limit', filters.limit.toString());
      }
      if (filters.offset) {
        searchParams.set('offset', filters.offset.toString());
      }

      const response = await fetch(`/api/internships?${searchParams}`);
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Failed to fetch internships: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If response isn't JSON, use status text
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      return {
        data: result.data || [],
        total: result.pagination?.total || 0,
        hasMore: result.pagination?.hasNext || false,
        nextOffset: result.pagination?.nextOffset
      };
    },
    // Shorter stale time for filtered results to keep them fresh
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Enable background refetching for active queries
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for infinite scrolling internships
export function useInfiniteInternships(filters: InternshipFilters = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.internships.list(filters), 'infinite'],
    queryFn: async ({ pageParam = 0 }): Promise<InternshipListResponse> => {
      const searchParams = new URLSearchParams();
      
      // Add filters (same as above)
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item));
        } else if (value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
      
      // Add pagination
      searchParams.set('limit', '20');
      searchParams.set('offset', pageParam.toString());

      const response = await fetch(`/api/internships?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch internships: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        data: result.data || [],
        total: result.pagination?.total || 0,
        hasMore: result.pagination?.hasNext || false,
        nextOffset: result.pagination?.nextOffset
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for fetching a single internship by ID
export function useInternship(id: string) {
  return useQuery({
    queryKey: queryKeys.internships.detail(id),
    queryFn: async (): Promise<InternshipDetailResponse> => {
      const response = await fetch(`/api/internships/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch internship: ${response.statusText}`);
      }
      
      return response.json();
    },
    // Longer stale time for individual internships
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!id, // Only run if ID is provided
  });
}

// Hook for search suggestions
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query),
    queryFn: async (): Promise<{ suggestions: string[] }> => {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: query.length >= 2, // Only search with 2+ characters
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for filter options
export function useFilterOptions() {
  const roles = useQuery({
    queryKey: queryKeys.filters.roles(),
    queryFn: async () => {
      const response = await fetch('/api/filters/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const locations = useQuery({
    queryKey: queryKeys.filters.locations(),
    queryFn: async () => {
      const response = await fetch('/api/filters/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const majors = useQuery({
    queryKey: queryKeys.filters.majors(),
    queryFn: async () => {
      const response = await fetch('/api/filters/majors');
      if (!response.ok) throw new Error('Failed to fetch majors');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    roles,
    locations,
    majors,
    isLoading: roles.isLoading || locations.isLoading || majors.isLoading,
    isError: roles.isError || locations.isError || majors.isError,
  };
}

// Mutation hooks for optimistic updates
export function useOptimisticInternshipUpdate() {
  return useMutation({
    mutationFn: async (internship: any) => {
      // This would be used for user actions like bookmarking, etc.
      const response = await fetch(`/api/internships/${internship.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(internship),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update internship');
      }
      
      return response.json();
    },
    onMutate: async (updatedInternship) => {
      // Optimistically update the cache
      realtimeUpdates.updateInternship(updatedInternship);
      
      // Return context for rollback
      return { updatedInternship };
    },
    onError: (error, variables, context) => {
      // Rollback on error by invalidating queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.lists()
      });
    },
  });
}

// Hook for real-time updates via Supabase subscriptions
export function useRealtimeInternships() {
  // This will be implemented when we add Supabase real-time subscriptions
  // For now, it's a placeholder that returns the subscription status
  return {
    isConnected: false,
    lastUpdate: null,
    subscribe: () => {},
    unsubscribe: () => {},
  };
}

// Hook for system health monitoring
export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.health.sources(),
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for company suggestions
export function useCompanySuggestions(query: string) {
  return useQuery({
    queryKey: ['company-suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const response = await fetch(`/api/companies?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company suggestions');
      }
      return response.json() as Promise<string[]>;
    },
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for similar internships (ontology-based)
export function useSimilarInternships(id: string) {
  return useQuery({
    queryKey: ['similar-internships', id],
    queryFn: async () => {
      const response = await fetch(`/api/ontology/similar?internship_id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch similar internships');
      }
      return response.json() as Promise<any[]>;
    },
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for saving internships
export function useSaveInternship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (internshipId: string) => {
      const response = await fetch('/api/internships/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internshipId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save internship');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-internships'] });
    },
  });
}

// Hook for updating application status
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      internshipId, 
      status 
    }: { 
      internshipId: string; 
      status: 'applied' | 'interview' | 'offer' | 'rejected' 
    }) => {
      const response = await fetch('/api/internships/application-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internshipId, status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update application status');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internship', variables.internshipId] });
      queryClient.invalidateQueries({ queryKey: ['saved-internships'] });
    },
  });
}

// Hook for reporting issues
export function useReportIssue() {
  return useMutation({
    mutationFn: async ({ 
      internshipId, 
      issue, 
      description 
    }: { 
      internshipId: string; 
      issue: string; 
      description: string; 
    }) => {
      const response = await fetch('/api/internships/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internshipId, issue, description }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to report issue');
      }
      
      return response.json();
    },
  });
}

// Hook for saved internships
export function useSavedInternships() {
  return useQuery({
    queryKey: ['saved-internships'],
    queryFn: async () => {
      const response = await fetch('/api/internships/saved');
      if (!response.ok) {
        throw new Error('Failed to fetch saved internships');
      }
      return response.json() as Promise<any[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for internship scores
export function useInternshipScores(internshipId: string) {
  return useQuery({
    queryKey: ['internship-scores', internshipId],
    queryFn: async () => {
      const response = await fetch(`/api/scoring?internship_id=${internshipId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch internship scores');
      }
      return response.json() as Promise<{
        quality_score: number;
        competitiveness_score: number;
        learning_score: number;
        brand_value_score: number;
        compensation_score: number;
      }>;
    },
    enabled: !!internshipId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for company relationships
export function useCompanyRelationships(companyId: string) {
  return useQuery({
    queryKey: ['company-relationships', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/ontology/relationships?company_id=${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company relationships');
      }
      return response.json() as Promise<any[]>;
    },
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for skill recommendations
export function useSkillRecommendations(currentSkills: string[]) {
  return useQuery({
    queryKey: ['skill-recommendations', currentSkills],
    queryFn: async () => {
      if (currentSkills.length === 0) return [];
      
      const response = await fetch(`/api/ontology/skills?skills=${currentSkills.join(',')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch skill recommendations');
      }
      return response.json() as Promise<any[]>;
    },
    enabled: currentSkills.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}