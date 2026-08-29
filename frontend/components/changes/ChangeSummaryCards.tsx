'use client';

import React from 'react';
import type { VersionComparisonSummary } from '@/types';

interface ChangeSummaryCardsProps {
  summary: VersionComparisonSummary;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export function ChangeSummaryCards({
  summary,
  selectedFilter,
  onFilterChange,
}: ChangeSummaryCardsProps) {
  const cards = [
    {
      id: 'ALL',
      label: 'Total Changes',
      count: summary.totalChanges,
      bg: '#f8fafc',
      border: '#cbd5e1',
      text: '#0f172a',
      activeBg: '#eff6ff',
      activeBorder: '#3b82f6',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'ADDED',
      label: 'Added Requirements',
      count: summary.addedCount,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#16a34a',
      activeBg: '#dcfce7',
      activeBorder: '#16a34a',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      id: 'REMOVED',
      label: 'Removed Requirements',
      count: summary.removedCount,
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626',
      activeBg: '#fee2e2',
      activeBorder: '#dc2626',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
      ),
    },
    {
      id: 'MODIFIED',
      label: 'Modified Requirements',
      count: summary.modifiedCount,
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#d97706',
      activeBg: '#fef3c7',
      activeBorder: '#d97706',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'DEADLINE',
      label: 'Deadline Changes',
      count: summary.deadlineChangesCount,
      bg: '#f0f9ff',
      border: '#bae6fd',
      text: '#0284c7',
      activeBg: '#e0f2fe',
      activeBorder: '#0284c7',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'EVIDENCE',
      label: 'Evidence Updates',
      count: summary.evidenceChangesCount,
      bg: '#faf5ff',
      border: '#e9d5ff',
      text: '#9333ea',
      activeBg: '#f3e8ff',
      activeBorder: '#9333ea',
      icon: (
        <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.875rem',
        marginBottom: '1.5rem',
      }}
    >
      {cards.map((card) => {
        const isSelected = selectedFilter === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onFilterChange(card.id)}
            style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: isSelected ? card.activeBg : card.bg,
              border: `2px solid ${isSelected ? card.activeBorder : card.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: card.text, marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{card.label}</span>
              {card.icon}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.text, lineHeight: 1 }}>
              {card.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
