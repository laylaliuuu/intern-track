'use client';

import { useState } from 'react';
import { Internship } from '@/types';
import { 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Clock, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface InternshipTableProps {
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

interface InternshipRowProps {
  internship: Internship;
  isExpanded: boolean;
  onToggle: () => void;
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

function formatDeadline(dateString?: string): string | null {
  if (!dateString) return null;
  
  const deadline = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) return 'Expired';
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Tomorrow';
  if (diffInDays <= 7) return `${diffInDays} days left`;
  return deadline.toLocaleDateString();
}

function InternshipRow({ internship, isExpanded, onToggle }: InternshipRowProps) {
  const timeAgo = formatTimeAgo(internship.postedAt);
  const deadline = formatDeadline(internship.applicationDeadline);
  const isUrgent = deadline && (deadline === 'Today' || deadline === 'Tomorrow' || deadline.includes('days left'));

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-gray-200">
        <td className="px-6 py-4">
          <button
            onClick={onToggle}
            className="flex items-center space-x-3 text-left w-full"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {internship.title}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Building2 className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">{internship.company.name}</span>
                {internship.isProgramSpecific && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Program
                  </span>
                )}
              </div>
            </div>
          </button>
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-900">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {internship.normalizedRole}
          </span>
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-500">
          <div className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {internship.isRemote ? (
              <span className="text-green-600 font-medium">Remote</span>
            ) : (
              internship.location
            )}
          </div>
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-500">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            internship.workType === 'paid' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {internship.workType.charAt(0).toUpperCase() + internship.workType.slice(1)}
          </span>
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {timeAgo}
          </div>
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-500">
          {deadline && (
            <div className={`flex items-center ${isUrgent ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {deadline}
            </div>
          )}
        </td>
        
        <td className="px-6 py-4 text-sm text-gray-500">
          <a
            href={internship.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            Apply
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {internship.description || 'No description available.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Details</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Cycle:</dt>
                      <dd className="text-gray-900">{internship.internshipCycle}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Source:</dt>
                      <dd className="text-gray-900">{internship.source.name}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Eligibility:</dt>
                      <dd className="text-gray-900">{internship.eligibilityYear.join(', ')}</dd>
                    </div>
                  </dl>
                </div>
                
                {/* Skills & Majors */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements</h4>
                  {internship.skills.length > 0 && (
                    <div className="mb-2">
                      <dt className="text-xs text-gray-500 mb-1">Skills:</dt>
                      <div className="flex flex-wrap gap-1">
                        {internship.skills.slice(0, 6).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {internship.skills.length > 6 && (
                          <span className="text-xs text-gray-500">
                            +{internship.skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {internship.relevantMajors.length > 0 && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Relevant Majors:</dt>
                      <dd className="text-sm text-gray-700">
                        {internship.relevantMajors.join(', ')}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-700"
    >
      <span>{children}</span>
      {isActive ? (
        currentOrder === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );
}

export default function InternshipTable({
  internships,
  loading,
  pagination,
  onPageChange,
  onSortChange,
  sortBy,
  sortOrder
}: InternshipTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (internships.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 mb-2">No internships found</div>
        <div className="text-sm text-gray-400">Try adjusting your filters or search terms</div>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                  Position
                </SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="posted_at" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                  Posted
                </SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="application_deadline" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                  Deadline
                </SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {internships.map((internship) => (
              <InternshipRow
                key={internship.id}
                internship={internship}
                isExpanded={expandedRows.has(internship.id)}
                onToggle={() => toggleRow(internship.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`px-3 py-1 text-sm border rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
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
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}