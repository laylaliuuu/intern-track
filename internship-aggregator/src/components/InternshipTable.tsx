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
  ArrowDown,
  User,
  Briefcase,
  DollarSign
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === internships.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(internships.map(i => i.id)));
    }
  };

  if (loading) {
    return (
      <div className="bg-white">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
          {/* Rows skeleton */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (internships.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No internships found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search terms</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Excel-style table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.size === internships.length && internships.length > 0}
                  onChange={toggleAllRows}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <SortButton field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                    Position
                  </SortButton>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <Building2 className="h-3 w-3" />
                  <span>Company</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3 w-3" />
                  <span>Role</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Location</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Type</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <SortButton field="posted_at" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                    Posted
                  </SortButton>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <SortButton field="application_deadline" currentSort={sortBy} currentOrder={sortOrder} onSort={onSortChange}>
                    Deadline
                  </SortButton>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <ExternalLink className="h-3 w-3" />
              </th>
            </tr>
          </thead>
          
          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-100">
            {internships.map((internship, index) => {
              const isSelected = selectedRows.has(internship.id);
              const timeAgo = formatTimeAgo(internship.postedAt);
              const deadline = formatDeadline(internship.applicationDeadline);
              const isUrgent = deadline && (deadline === 'Today' || deadline === 'Tomorrow' || deadline.includes('days left'));

              return (
                <tr 
                  key={internship.id} 
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-4 border-r border-gray-100">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(internship.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  
                  {/* Position */}
                  <td className="px-4 py-4 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {internship.company.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {internship.title}
                        </div>
                        {internship.isProgramSpecific && (
                          <div className="text-xs text-purple-600 font-medium">Special Program</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Company */}
                  <td className="px-4 py-4 text-sm text-gray-900 border-r border-gray-100">
                    <div className="font-medium">{internship.company.name}</div>
                    <div className="text-xs text-gray-500">{internship.source.name}</div>
                  </td>
                  
                  {/* Role */}
                  <td className="px-4 py-4 border-r border-gray-100">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {internship.normalizedRole}
                    </span>
                  </td>
                  
                  {/* Location */}
                  <td className="px-4 py-4 text-sm text-gray-900 border-r border-gray-100">
                    <div className="flex items-center">
                      {internship.isRemote ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Remote
                        </span>
                      ) : (
                        <span className="text-gray-700">{internship.location}</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Type */}
                  <td className="px-4 py-4 border-r border-gray-100">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      internship.workType === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {internship.workType.charAt(0).toUpperCase() + internship.workType.slice(1)}
                    </span>
                  </td>
                  
                  {/* Posted */}
                  <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-100">
                    {timeAgo}
                  </td>
                  
                  {/* Deadline */}
                  <td className="px-4 py-4 text-sm border-r border-gray-100">
                    {deadline && (
                      <span className={`${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {deadline}
                      </span>
                    )}
                  </td>
                  
                  {/* Action */}
                  <td className="px-4 py-4">
                    <a
                      href={internship.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Apply
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
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