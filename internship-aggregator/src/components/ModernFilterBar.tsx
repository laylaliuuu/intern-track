'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, X, Filter } from 'lucide-react';
import FilterButton from './FilterButton';
import { InternshipFilters } from '@/hooks/use-internships';

interface FilterOptions {
  roles: string[];
  locations: string[];
  majors: string[];
}

interface ModernFilterBarProps {
  filters: InternshipFilters;
  onChange: (filters: InternshipFilters) => void;
  onReset: () => void;
  totalResults: number;
  filterOptions: FilterOptions;
  isLoading?: boolean;
}

export default function ModernFilterBar({ filters, onChange, onReset, totalResults, filterOptions, isLoading = false }: ModernFilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleFilterToggle = (filterType: string, optionValue: string) => {
    const currentValues = filters[filterType as keyof InternshipFilters] as string[] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(value => value !== optionValue)
      : [...currentValues, optionValue];
    
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

  const handleRemoveActiveFilter = (filterType: string, optionValue: string) => {
    const currentValues = filters[filterType as keyof InternshipFilters] as string[] || [];
    const newValues = currentValues.filter(value => value !== optionValue);
    
    onChange({
      ...filters,
      [filterType]: newValues
    });
  };

  const getFilteredOptions = (filterType: string) => {
    return filterOptions[filterType as keyof FilterOptions] || [];
  };

  const renderDropdown = (filterType: string, label: string) => {
    if (activeDropdown !== filterType) return null;

    const options = getFilteredOptions(filterType);
    const selectedCount = (filters[filterType as keyof InternshipFilters] as string[])?.length || 0;

    return (
      <div 
        ref={dropdownRef}
        className="w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
        style={{ 
          minWidth: '256px',
          backgroundColor: '#ffffff',
          opacity: 1
        }}
      >
        {/* Options List */}
        <div 
          className="overflow-y-auto" 
          style={{ 
            padding: '4px',
            maxHeight: '200px',
            minHeight: '200px'
          }}
        >
          {options.map((option) => {
            const isSelected = (filters[filterType as keyof InternshipFilters] as string[])?.includes(option) || false;
            return (
              <div
                key={option}
                className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-100' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? '#f3e8ff' : 'transparent',
                  marginBottom: '4px',
                  marginLeft: '8px',
                  marginRight: '8px',
                  marginTop: '2px',
                  borderRadius: '3px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#dbeafe';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                onClick={() => handleFilterToggle(filterType, option)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleFilterToggle(filterType, option)}
                    className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  isSelected ? 'text-blue-800' : 'text-gray-700'
                }`}>
                  {option}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setActiveDropdown(null)}
              className="bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
              style={{
                backgroundColor: '#7c3aed',
                borderRadius: '5px',
                fontWeight: '500',
                color: '#ffffff',
                marginLeft: '8px',
                marginRight: '8px'
              }}
            >
              Apply
            </button>
            <div 
              className="flex items-center justify-end"
              style={{
                paddingRight: '16px',
                paddingBottom: '2px',
                paddingTop: '2px'
              }}
            >
              <button
                onClick={() => handleClearFilter(filterType)}
                className="text-sm text-purple-600 underline hover:text-purple-700 transition-colors bg-transparent border-none outline-none p-0"
                style={{
                  color: '#7c3aed',
                  textDecoration: 'underline',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0',
                  boxShadow: 'none'
                }}
              >
                Clear selected
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveFilters = () => {
    const activeFilters: Array<{type: string, value: string}> = [];
    
    if (filters) {
      Object.entries(filters).forEach(([filterType, selectedValues]) => {
        if (selectedValues && Array.isArray(selectedValues)) {
          selectedValues.forEach((value: string) => {
            activeFilters.push({
              type: filterType,
              value
            });
          });
        }
      });
    }

    if (activeFilters.length === 0) return null;

    return (
      <div 
        className="px-3 pb-2"
        style={{
          marginTop: '16px',
          paddingRight: '20px'
        }}
      >
        <div 
          className="flex items-center"
          style={{
            gap: '12px'
          }}
        >
          <div className="text-xs text-gray-600">Active filters:</div>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter, index) => (
            <div
              key={`${filter.type}-${filter.value}-${index}`}
              className="flex items-center space-x-1"
              style={{
                backgroundColor: '#f0f4ff',
                borderRadius: '5px',
                padding: '2px',
                border: '1px solid #e0e7ff'
              }}
            >
              <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>
                {filter.value}
              </span>
              <button
                onClick={() => handleRemoveActiveFilter(filter.type, filter.value)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '2px',
                  borderRadius: '50%',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="bg-gray-50" style={{ marginBottom: '20px' }}>
        {/* Filter Bar */}
        <div className="flex items-center justify-between p-3 relative">
          {/* Left Side - Filter Buttons */}
          <div 
            className="flex items-center"
            style={{
              gap: '12px'
            }}
          >
          {/* Roles */}
          <div className="relative">
            <FilterButton
              label="Roles"
              isActive={activeDropdown === 'roles'}
              onClick={() => setActiveDropdown(activeDropdown === 'roles' ? null : 'roles')}
            />
            {activeDropdown === 'roles' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('roles', 'Roles')}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="relative">
            <FilterButton
              label="Locations"
              isActive={activeDropdown === 'locations'}
              onClick={() => setActiveDropdown(activeDropdown === 'locations' ? null : 'locations')}
            />
            {activeDropdown === 'locations' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('locations', 'Locations')}
              </div>
            )}
          </div>

          {/* Majors */}
          <div className="relative">
            <FilterButton
              label="Majors"
              isActive={activeDropdown === 'majors'}
              onClick={() => setActiveDropdown(activeDropdown === 'majors' ? null : 'majors')}
            />
            {activeDropdown === 'majors' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('majors', 'Majors')}
              </div>
            )}
          </div>

          {/* Work Type */}
          <div className="relative">
            <FilterButton
              label="Work Type"
              isActive={activeDropdown === 'workType'}
              onClick={() => setActiveDropdown(activeDropdown === 'workType' ? null : 'workType')}
            />
            {activeDropdown === 'workType' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('workType', 'Work Type')}
              </div>
            )}
          </div>

          {/* Eligibility Year */}
          <div className="relative">
            <FilterButton
              label="Year Level"
              isActive={activeDropdown === 'eligibilityYear'}
              onClick={() => setActiveDropdown(activeDropdown === 'eligibilityYear' ? null : 'eligibilityYear')}
            />
            {activeDropdown === 'eligibilityYear' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('eligibilityYear', 'Year Level')}
              </div>
            )}
          </div>

        </div>

        {/* Right Side - Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '16px',
                width: '16px',
                color: '#9ca3af'
              }}
            />
            <input
              type="text"
              placeholder="Search internships..."
              value={filters.search || ''}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              style={{
                width: '224px',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '12px',
                paddingBottom: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '400',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
              }}
            />
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {renderActiveFilters()}
      
      {/* Spacer to push content down when dropdown is open */}
      {activeDropdown && (
        <div className="h-80"></div>
      )}
    </div>
  );
}
