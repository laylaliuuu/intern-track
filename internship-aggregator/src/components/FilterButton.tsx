'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export default function FilterButton({ label, isActive, onClick, icon }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-6 py-4 rounded-md text-base transition-all duration-200"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        color: 'black',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        minWidth: 'fit-content',
        whiteSpace: 'nowrap',
        fontWeight: '500',
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '12px 16px',
        borderRadius: '12px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }}
    >
      {icon && <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>{icon}</span>}
      <span>{label}</span>
      {isActive ? (
        <ChevronUp className="h-3 w-3" style={{ color: '#374151', marginLeft: '6px' }} />
      ) : (
        <ChevronDown className="h-3 w-3" style={{ color: '#374151', marginLeft: '6px' }} />
      )}
    </button>
  );
}
