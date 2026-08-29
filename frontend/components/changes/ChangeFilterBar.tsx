'use client';

import React from 'react';

interface ChangeFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  severityFilter: string;
  onSeverityChange: (sev: string) => void;
  totalFiltered: number;
  totalChanges: number;
  onReset: () => void;
}

export function ChangeFilterBar({
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  totalFiltered,
  totalChanges,
  onReset,
}: ChangeFilterBarProps) {
  const hasActiveFilters = searchQuery.trim().length > 0 || severityFilter !== 'ALL';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        marginBottom: '1.25rem',
      }}
    >
      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 260px', position: 'relative' }}>
        <svg
          style={{ width: '1rem', height: '1rem', color: '#94a3b8', position: 'absolute', left: '0.75rem' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search changes by requirement, section, quote..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem 0.5rem 2.25rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            color: '#0f172a',
            outline: 'none',
          }}
        />
      </div>

      {/* Severity Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Severity:</span>
        <select
          value={severityFilter}
          onChange={(e) => onSeverityChange(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            outline: 'none',
          }}
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Stats and Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
          Showing <strong>{totalFiltered}</strong> of {totalChanges} changes
        </span>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
