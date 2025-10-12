'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, X, Filter } from 'lucide-react';
import FilterButton from './FilterButton';

interface FilterState {
  companySize: string[];
  companyType: string[];
  location: string[];
  roleType: string[];
  yearLevel: string[];
  majorRequired: string[];
}

interface ModernFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export default function ModernFilterBar({ filters = { companySize: [], companyType: [], location: [], roleType: [], yearLevel: [], majorRequired: [] }, onChange, onReset, totalResults }: ModernFilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock data for filter options
  const filterOptions = {
    companySize: [
      { id: '1', label: 'Startup (1-50)' },
      { id: '2', label: 'Small (51-200)' },
      { id: '3', label: 'Medium (201-1000)' },
      { id: '4', label: 'Large (1000+)' },
      { id: '5', label: 'Fortune 500' }
    ],
    companyType: [
      { id: '1', label: 'Technology' },
      { id: '2', label: 'Finance' },
      { id: '3', label: 'Healthcare' },
      { id: '4', label: 'Consulting' },
      { id: '5', label: 'Retail' },
      { id: '6', label: 'Manufacturing' },
      { id: '7', label: 'Education' },
      { id: '8', label: 'Non-profit' },
      { id: '9', label: 'Media & Entertainment' },
      { id: '10', label: 'Real Estate' },
      { id: '11', label: 'Transportation' },
      { id: '12', label: 'Energy' },
      { id: '13', label: 'Government' },
      { id: '14', label: 'Legal' },
      { id: '15', label: 'Sports & Recreation' }
    ],
    location: [
      { id: '1', label: 'Remote' },
      { id: '2', label: 'Hybrid' },
      { id: '3', label: 'On-site' },
      { id: '4', label: 'San Francisco, CA' },
      { id: '5', label: 'New York, NY' },
      { id: '6', label: 'Seattle, WA' },
      { id: '7', label: 'Austin, TX' },
      { id: '8', label: 'Boston, MA' },
      { id: '9', label: 'Los Angeles, CA' },
      { id: '10', label: 'Chicago, IL' },
      { id: '11', label: 'Denver, CO' },
      { id: '12', label: 'Miami, FL' },
      { id: '13', label: 'Atlanta, GA' },
      { id: '14', label: 'Portland, OR' },
      { id: '15', label: 'Washington, DC' }
    ],
    roleType: [
      { id: '1', label: 'Software Engineer' },
      { id: '2', label: 'Data Analyst' },
      { id: '3', label: 'Product Manager' },
      { id: '4', label: 'UX Designer' },
      { id: '5', label: 'Marketing' },
      { id: '6', label: 'Sales' },
      { id: '7', label: 'Finance' },
      { id: '8', label: 'HR' },
      { id: '9', label: 'Operations' },
      { id: '10', label: 'Research' },
      { id: '11', label: 'Business Development' },
      { id: '12', label: 'Content Creator' },
      { id: '13', label: 'Project Manager' },
      { id: '14', label: 'Customer Success' },
      { id: '15', label: 'Legal' },
      { id: '16', label: 'Data Scientist' },
      { id: '17', label: 'Machine Learning Engineer' },
      { id: '18', label: 'Cybersecurity' },
      { id: '19', label: 'DevOps Engineer' },
      { id: '20', label: 'Frontend Developer' },
      { id: '21', label: 'Backend Developer' },
      { id: '22', label: 'Full Stack Developer' },
      { id: '23', label: 'Mobile Developer' },
      { id: '24', label: 'Game Developer' },
      { id: '25', label: 'AI/ML Research' },
      { id: '26', label: 'Investment Banking' },
      { id: '27', label: 'Financial Analyst' },
      { id: '28', label: 'Accounting' },
      { id: '29', label: 'Consulting' },
      { id: '30', label: 'Strategy' },
      { id: '31', label: 'Risk Management' },
      { id: '32', label: 'Trading' },
      { id: '33', label: 'Audit' },
      { id: '34', label: 'Tax' },
      { id: '35', label: 'Corporate Finance' }
    ],
    yearLevel: [
      { id: '1', label: 'Freshman' },
      { id: '2', label: 'Sophomore' },
      { id: '3', label: 'Junior' },
      { id: '4', label: 'Senior' }
    ],
    majorRequired: [
      { id: '1', label: 'Computer Science' },
      { id: '2', label: 'Business' },
      { id: '3', label: 'Engineering' },
      { id: '4', label: 'Mathematics' },
      { id: '5', label: 'Statistics' },
      { id: '6', label: 'Economics' },
      { id: '7', label: 'Marketing' },
      { id: '8', label: 'Liberal Arts' },
      { id: '9', label: 'Psychology' },
      { id: '10', label: 'Communications' },
      { id: '11', label: 'Biology' },
      { id: '12', label: 'Chemistry' },
      { id: '13', label: 'Physics' },
      { id: '14', label: 'Political Science' },
      { id: '15', label: 'Any Major' }
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
    return filterOptions[filterType as keyof typeof filterOptions] || [];
  };

  const renderDropdown = (filterType: string, label: string) => {
    if (activeDropdown !== filterType) return null;

    const options = getFilteredOptions(filterType);
    const selectedCount = filters[filterType as keyof FilterState]?.length || 0;

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
            const isSelected = filters[filterType as keyof FilterState]?.includes(option.id) || false;
            return (
              <div
                key={option.id}
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
                onClick={() => handleFilterToggle(filterType, option.id)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleFilterToggle(filterType, option.id)}
                    className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  isSelected ? 'text-blue-800' : 'text-gray-700'
                }`}>
                  {option.label}
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
    const activeFilters: Array<{type: string, id: string, label: string}> = [];
    
    if (filters) {
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
          <div className="text-xs text-gray-600">Active filters:    </div>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter, index) => (
            <div
              key={`${filter.type}-${filter.id}-${index}`}
              className="flex items-center space-x-1"
              style={{
                backgroundColor: '#f0f4ff',
                borderRadius: '5px',
                padding: '2px',
                border: '1px solid #e0e7ff'
              }}
            >
              <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>
                {filter.label}
              </span>
              <button
                onClick={() => handleRemoveActiveFilter(filter.type, filter.id)}
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

          {/* Company Size */}
          <div className="relative">
            <FilterButton
              label="Company size"
              isActive={activeDropdown === 'companySize'}
              onClick={() => setActiveDropdown(activeDropdown === 'companySize' ? null : 'companySize')}
            />
            {activeDropdown === 'companySize' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('companySize', 'Company size')}
              </div>
            )}
          </div>

          {/* Company Type */}
          <div className="relative">
            <FilterButton
              label="Company type"
              isActive={activeDropdown === 'companyType'}
              onClick={() => setActiveDropdown(activeDropdown === 'companyType' ? null : 'companyType')}
            />
            {activeDropdown === 'companyType' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('companyType', 'Company type')}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="relative">
            <FilterButton
              label="Location"
              isActive={activeDropdown === 'location'}
              onClick={() => setActiveDropdown(activeDropdown === 'location' ? null : 'location')}
            />
            {activeDropdown === 'location' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('location', 'Location')}
              </div>
            )}
          </div>

          {/* Role Type */}
          <div className="relative">
            <FilterButton
              label="Role type"
              isActive={activeDropdown === 'roleType'}
              onClick={() => setActiveDropdown(activeDropdown === 'roleType' ? null : 'roleType')}
            />
            {activeDropdown === 'roleType' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('roleType', 'Role type')}
              </div>
            )}
          </div>

          {/* Year Level */}
          <div className="relative">
            <FilterButton
              label="Year level"
              isActive={activeDropdown === 'yearLevel'}
              onClick={() => setActiveDropdown(activeDropdown === 'yearLevel' ? null : 'yearLevel')}
            />
            {activeDropdown === 'yearLevel' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('yearLevel', 'Year level')}
              </div>
            )}
          </div>

          {/* Major Required */}
          <div className="relative">
            <FilterButton
              label="Major required"
              isActive={activeDropdown === 'majorRequired'}
              onClick={() => setActiveDropdown(activeDropdown === 'majorRequired' ? null : 'majorRequired')}
            />
            {activeDropdown === 'majorRequired' && (
              <div className="absolute top-full left-0 mt-1 z-[9999]" style={{ backgroundColor: '#ffffff' }}>
                {renderDropdown('majorRequired', 'Major required')}
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
              placeholder="Search in table"
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
