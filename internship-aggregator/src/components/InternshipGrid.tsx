'use client';

import { useState } from 'react';
import { Internship } from '../types';
import { 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Clock, 
  Building2, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  GraduationCap,
  DollarSign
} from 'lucide-react';

interface InternshipGridProps {
  internships: Internship[];
  loading: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange: (page: number) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatDeadline(dateString?: string): { text: string; isUrgent: boolean } | null {
  if (!dateString) return null;
  
  const deadline = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) return { text: 'Expired', isUrgent: true };
  if (diffInDays === 0) return { text: 'Due today', isUrgent: true };
  if (diffInDays === 1) return { text: 'Due tomorrow', isUrgent: true };
  if (diffInDays <= 7) return { text: `${diffInDays} days left`, isUrgent: true };
  return { text: deadline.toLocaleDateString(), isUrgent: false };
}

function InternshipCard({ internship }: { internship: Internship }) {
  const timeAgo = formatTimeAgo(internship.postedAt);
  const deadline = formatDeadline(internship.applicationDeadline);

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {internship.title}
          </h3>
          <div className="flex items-center text-gray-600 mb-2">
            <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="font-medium">{internship.company.name}</span>
          </div>
        </div>
        {internship.isProgramSpecific && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 ml-4 flex-shrink-0">
            Special Program
          </span>
        )}
      </div>

      {/* Role & Type */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
          <Briefcase className="h-3 w-3 mr-1" />
          {internship.normalizedRole}
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          internship.workType === 'paid' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-50 text-gray-700'
        }`}>
          <DollarSign className="h-3 w-3 mr-1" />
          {internship.workType.charAt(0).toUpperCase() + internship.workType.slice(1)}
        </span>
      </div>

      {/* Location & Remote */}
      <div className="flex items-center text-gray-600 mb-4">
        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
        {internship.isRemote ? (
          <span className="text-green-600 font-medium">Remote</span>
        ) : (
          <span>{internship.location}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
        {internship.description || 'No description available.'}
      </p>

      {/* Skills */}
      {internship.skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {internship.skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
              >
                {skill}
              </span>
            ))}
            {internship.skills.length > 4 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                +{internship.skills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Eligibility */}
      {internship.eligibilityYear.length > 0 && (
        <div className="flex items-center text-gray-600 mb-4">
          <GraduationCap className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="text-sm">{internship.eligibilityYear.join(', ')}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {timeAgo}
          </div>
          {deadline && (
            <div className={`flex items-center ${deadline.isUrgent ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {deadline.text}
            </div>
          )}
        </div>
        
        <a
          href={internship.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply
          <ExternalLink className="h-3 w-3 ml-2" />
        </a>
      </div>
    </div>
  );
}

function SortButton({ 
  field, 
  currentSort, 
  currentOrder, 
  onSort, 
  children 
}: { 
  field: string; 
  currentSort: string; 
  currentOrder: 'asc' | 'desc'; 
  onSort: (field: string, order: 'asc' | 'desc') => void;
  children: React.ReactNode;
}) {
  const isActive = currentSort === field;
  
  const handleClick = () => {
    if (isActive) {
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'desc');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-100 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span>{children}</span>
      {isActive ? (
        currentOrder === 'asc' ? (
          <ArrowUp className="h-4 w-4 ml-1" />
        ) : (
          <ArrowDown className="h-4 w-4 ml-1" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />
      )}
    </button>
  );
}

export default function InternshipGrid({
  internships,
  loading,
  pagination,
  onPageChange,
  onSortChange,
  sortBy,
  sortOrder
}: InternshipGridProps) {
  if (loading) {
    return (
      <div>
        {/* Sort Controls Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="flex space-x-2 mb-4">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20 ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (internships.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No internships found</div>
        <div className="text-gray-400">Try adjusting your filters or search terms</div>
      </div>
    );
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          {pagination ? `${pagination.total.toLocaleString()} results` : `${internships.length} results`}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 mr-2">Sort by:</span>
          <SortButton field="posted_at" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
            Date Posted
          </SortButton>
          <SortButton field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
            Title
          </SortButton>
          <SortButton field="application_deadline" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
            Deadline
          </SortButton>
        </div>
      </div>

      {/* Internship Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {internships.map((internship) => (
          <InternshipCard key={internship.id} internship={internship} />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}