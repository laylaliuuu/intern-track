'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, X, Filter } from 'lucide-react';

interface FilterState {
  status: string[];
  responsiblePerson: string[];
  employeesInvolved: string[];
  moreFilters: string[];
}

interface ModernFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export default function ModernFilterBar({ filters, onChange, onReset, totalResults }: ModernFilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock data for filter options
  const filterOptions = {
    status: [
      { id: '1', label: 'Applied' },
      { id: '2', label: 'In Review' },
      { id: '3', label: 'Rejected' },
      { id: '4', label: 'Accepted' },
      { id: '5', label: 'Pending' }
    ],
    responsiblePerson: [
      { id: '1', label: 'John Smith' },
      { id: '2', label: 'Sarah Johnson' },
      { id: '3', label: 'Mike Davis' },
      { id: '4', label: 'Lisa Wilson' },
      { id: '5', label: 'Tom Brown' }
    ],
    employeesInvolved: [
      { id: '1', label: 'Kristin Watson' },
      { id: '2', label: 'Jerome Bell' },
      { id: '3', label: 'Leslie Alexander' },
      { id: '4', label: 'Dianne Russell' },
      { id: '5', label: 'Courtney Henry' },
      { id: '6', label: 'Maciej Kuropatwa' }
    ],
    moreFilters: [
      { id: '1', label: 'Remote' },
      { id: '2', label: 'On-site' },
      { id: '3', label: 'Hybrid' },
      { id: '4', label: 'Full-time' },
      { id: '5', label: 'Part-time' }
    ]
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterToggle = (filterType: string, optionId: string) => {
    const currentValues = filters[filterType as keyof FilterState] || [];
    const newValues = currentValues.includes(optionId)
      ? currentValues.filter(id => id !== optionId)
      : [...currentValues, optionId];
    
    onChange({
      ...filters,
      [filterType]: newValues
    });
  };

  const handleClearFilter = (filterType: string) => {
    onChange({
      ...filters,
      [filterType]: []
    });
  };

  const handleRemoveActiveFilter = (filterType: string, optionId: string) => {
    const currentValues = filters[filterType as keyof FilterState] || [];
    const newValues = currentValues.filter(id => id !== optionId);
    
    onChange({
      ...filters,
      [filterType]: newValues
    });
  };

  const getFilteredOptions = (filterType: string) => {
    const searchTerm = searchTerms[filterType] || '';
    const options = filterOptions[filterType as keyof typeof filterOptions] || [];
    
    if (!searchTerm) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderDropdown = (filterType: string, label: string) => {
    if (activeDropdown !== filterType) return null;

    const options = getFilteredOptions(filterType);
    const selectedCount = filters[filterType as keyof FilterState]?.length || 0;

    return (
      <div 
        ref={dropdownRef}
        className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50"
        style={{ minWidth: '256px' }}
      >
        {/* Search Bar */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search values"
              value={searchTerms[filterType] || ''}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, [filterType]: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Options List */}
        <div className="max-h-40 overflow-y-auto">
          {options.map((option) => {
            const isSelected = filters[filterType as keyof FilterState]?.includes(option.id) || false;
            return (
              <div
                key={option.id}
                className="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleFilterToggle(filterType, option.id)}
              >
                <div className={`w-3.5 h-3.5 border rounded mr-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-purple-600 border-purple-600' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Selected: {selectedCount}</span>
            <button
              onClick={() => handleClearFilter(filterType)}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear selected
            </button>
          </div>
          <button
            onClick={() => setActiveDropdown(null)}
            className="w-full bg-purple-600 text-white py-1.5 px-3 rounded text-xs font-medium hover:bg-purple-700 transition-colors duration-200"
          >
            Apply
          </button>
        </div>
      </div>
    );
  };

  const renderActiveFilters = () => {
    const activeFilters: Array<{type: string, id: string, label: string}> = [];
    
    Object.entries(filters).forEach(([filterType, selectedIds]) => {
      if (selectedIds && Array.isArray(selectedIds)) {
        selectedIds.forEach((id: string) => {
          const option = filterOptions[filterType as keyof typeof filterOptions]?.find(opt => opt.id === id);
          if (option) {
            activeFilters.push({
              type: filterType,
              id,
              label: option.label
            });
          }
        });
      }
    });

    if (activeFilters.length === 0) return null;

    return (
      <div className="mt-2 px-3 pb-2">
        <div className="text-xs text-gray-600 mb-1.5">Active filters:</div>
        <div className="flex flex-wrap gap-1">
          {activeFilters.map((filter, index) => (
            <div
              key={`${filter.type}-${filter.id}-${index}`}
              className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs flex items-center space-x-1"
            >
              <span>{filter.type}: {filter.label}</span>
              <button
                onClick={() => handleRemoveActiveFilter(filter.type, filter.id)}
                className="hover:bg-blue-700 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg">
      {/* Filter Bar */}
      <div className="flex items-center justify-between p-3">
        {/* Left Side - Filter Buttons */}
        <div className="flex items-center space-x-1">
          {/* Status */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-all duration-200 ${
                activeDropdown === 'status'
                  ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Status</span>
              {activeDropdown === 'status' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {renderDropdown('status', 'Status')}
          </div>

          {/* Responsible Person */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'responsiblePerson' ? null : 'responsiblePerson')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-all duration-200 ${
                activeDropdown === 'responsiblePerson'
                  ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Responsible person</span>
              {activeDropdown === 'responsiblePerson' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {renderDropdown('responsiblePerson', 'Responsible person')}
          </div>

          {/* Employees Involved */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'employeesInvolved' ? null : 'employeesInvolved')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-all duration-200 ${
                activeDropdown === 'employeesInvolved'
                  ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Employees involved</span>
              {activeDropdown === 'employeesInvolved' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {renderDropdown('employeesInvolved', 'Employees involved')}
          </div>

          {/* More Filters */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'moreFilters' ? null : 'moreFilters')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-all duration-200 ${
                activeDropdown === 'moreFilters'
                  ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>More filters</span>
              {activeDropdown === 'moreFilters' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {renderDropdown('moreFilters', 'More filters')}
          </div>
        </div>

        {/* Right Side - Search Bar */}
        <div className="flex items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search in table"
              className="w-48 pl-7 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {renderActiveFilters()}
    </div>
  );
}
