'use client';

import { FilterState, InternshipRole, WorkType, EligibilityYear } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  options?: {
    roles: FilterOption[];
    majors: FilterOption[];
    locations: FilterOption[];
    workTypes: FilterOption[];
    eligibilityYears: FilterOption[];
    cycles: FilterOption[];
    companies: FilterOption[];
    stats: {
      total: number;
      remote: number;
      programSpecific: number;
      paid: number;
      unpaid: number;
    };
  };
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

interface CheckboxGroupProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxVisible?: number;
}

function CheckboxGroup({ options, selected, onChange, maxVisible = 5 }: CheckboxGroupProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? options : options.slice(0, maxVisible);
  const hasMore = options.length > maxVisible;

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      {visibleOptions.map((option) => (
        <label key={option.value} className="flex items-center py-1 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => handleToggle(option.value)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-3 text-sm text-gray-700 flex-1">
            {option.label}
            {option.count !== undefined && (
              <span className="text-gray-400 ml-2">({option.count})</span>
            )}
          </span>
        </label>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
        >
          {showAll ? 'Show less' : `Show ${options.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

export default function FilterPanel({ filters, onChange, options }: FilterPanelProps) {
  if (!options) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posted Within */}
      <FilterSection title="Posted Within">
        <div className="space-y-2">
          {[
            { value: 'day', label: 'Last 24 hours' },
            { value: 'week', label: 'Last week' },
            { value: 'month', label: 'Last month' }
          ].map((option) => (
            <label key={option.value} className="flex items-center py-1 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
              <input
                type="radio"
                name="postedWithin"
                value={option.value}
                checked={filters.postedWithin === option.value}
                onChange={(e) => onChange({ postedWithin: e.target.value as 'day' | 'week' | 'month' })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Roles */}
      <FilterSection title="Roles">
        <CheckboxGroup
          options={options.roles}
          selected={filters.roles as string[]}
          onChange={(roles) => onChange({ roles: roles as InternshipRole[] })}
        />
      </FilterSection>

      {/* Work Type */}
      <FilterSection title="Work Type">
        <CheckboxGroup
          options={options.workTypes}
          selected={filters.workType as string[]}
          onChange={(workType) => onChange({ workType: workType as WorkType[] })}
        />
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location">
        <div className="mb-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.isRemote === true}
              onChange={(e) => onChange({ isRemote: e.target.checked ? true : undefined })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Remote only ({options.stats.remote})
            </span>
          </label>
        </div>
        <CheckboxGroup
          options={options.locations}
          selected={filters.locations}
          onChange={(locations) => onChange({ locations })}
        />
      </FilterSection>

      {/* Eligibility Year */}
      <FilterSection title="Eligibility Year">
        <CheckboxGroup
          options={options.eligibilityYears}
          selected={filters.eligibilityYear as string[]}
          onChange={(eligibilityYear) => onChange({ eligibilityYear: eligibilityYear as EligibilityYear[] })}
        />
      </FilterSection>

      {/* Majors */}
      <FilterSection title="Relevant Majors" defaultOpen={false}>
        <CheckboxGroup
          options={options.majors}
          selected={filters.majors as string[]}
          onChange={(majors) => onChange({ majors: majors as any[] })}
          maxVisible={8}
        />
      </FilterSection>

      {/* Internship Cycle */}
      <FilterSection title="Internship Cycle" defaultOpen={false}>
        <CheckboxGroup
          options={options.cycles}
          selected={filters.internshipCycle}
          onChange={(internshipCycle) => onChange({ internshipCycle })}
        />
      </FilterSection>

      {/* Program Specific */}
      <FilterSection title="Special Programs" defaultOpen={false}>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showProgramSpecific === true}
            onChange={(e) => onChange({ showProgramSpecific: e.target.checked ? true : undefined })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            Program-specific only ({options.stats.programSpecific})
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          STEP, Explore, diversity programs, etc.
        </p>
      </FilterSection>
    </div>
  );
}