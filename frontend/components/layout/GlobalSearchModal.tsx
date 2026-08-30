'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Policy, Document, Action, Impact } from '@/types';

export interface SearchResultItem {
  id: string;
  type: 'POLICY' | 'IMPACT' | 'ACTION' | 'DOCUMENT' | 'CHANGE' | 'REQUIREMENT';
  title: string;
  subtitle: string;
  badge: string;
  targetUrl: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cached data for instant search
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);

  // Fetch tenant datasets when modal opens
  const fetchAllSearchData = useCallback(async () => {
    setLoading(true);
    try {
      const [polData, docData, actData, impData] = await Promise.all([
        api.get<Policy[]>('/policies').catch(() => []),
        api.get<Document[]>('/documents').catch(() => []),
        api.get<Action[]>('/actions').catch(() => []),
        api.get<Impact[]>('/impact').catch(() => []),
      ]);
      setPolicies(polData);
      setDocuments(docData);
      setActions(actData);
      setImpacts(impData);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      fetchAllSearchData();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, fetchAllSearchData]);

  // Aggregate and filter search results
  const results = useMemo<SearchResultItem[]>(() => {
    if (!query.trim()) {
      // Return top recent items if query is empty
      const initial: SearchResultItem[] = [];
      policies.slice(0, 3).forEach((p) =>
        initial.push({
          id: `pol-${p.id}`,
          type: 'POLICY',
          title: p.name,
          subtitle: p.description || `${p.versions?.length || 0} versions recorded`,
          badge: 'POLICY',
          targetUrl: `/policies?policyId=${p.id}`,
        }),
      );
      actions.slice(0, 3).forEach((a) =>
        initial.push({
          id: `act-${a.id}`,
          type: 'ACTION',
          title: a.title,
          subtitle: `${a.status} • Assigned: ${a.assignedTo?.name || a.department || 'Unassigned'}`,
          badge: 'ACTION',
          targetUrl: `/actions?actionId=${a.id}`,
        }),
      );
      impacts.slice(0, 3).forEach((i) =>
        initial.push({
          id: `imp-${i.id}`,
          type: 'IMPACT',
          title: i.description,
          subtitle: `Severity: ${i.severity} • Status: ${i.status}`,
          badge: 'IMPACT',
          targetUrl: `/impact?impactId=${i.id}`,
        }),
      );
      return initial;
    }

    const q = query.toLowerCase().trim();
    const matches: SearchResultItem[] = [];

    // Search Policies
    policies.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))) {
        matches.push({
          id: `pol-${p.id}`,
          type: 'POLICY',
          title: p.name,
          subtitle: p.description || 'Policy record',
          badge: 'POLICY',
          targetUrl: `/policies?policyId=${p.id}`,
        });
      }
    });

    // Search Documents
    documents.forEach((d) => {
      if (d.title.toLowerCase().includes(q) || d.originalName.toLowerCase().includes(q)) {
        matches.push({
          id: `doc-${d.id}`,
          type: 'DOCUMENT',
          title: d.title,
          subtitle: `File: ${d.originalName} • ${d.pageCount || 1} pages`,
          badge: 'DOCUMENT',
          targetUrl: `/documents/${d.id}`,
        });
      }
    });

    // Search Actions
    actions.forEach((a) => {
      if (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.assignedTo?.name && a.assignedTo.name.toLowerCase().includes(q))
      ) {
        matches.push({
          id: `act-${a.id}`,
          type: 'ACTION',
          title: a.title,
          subtitle: `Status: ${a.status} • ${a.department || 'No department'}`,
          badge: 'ACTION',
          targetUrl: `/actions?actionId=${a.id}`,
        });
      }
    });

    // Search Impacts
    impacts.forEach((i) => {
      if (
        i.description.toLowerCase().includes(q) ||
        (i.reason && i.reason.toLowerCase().includes(q)) ||
        i.severity.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `imp-${i.id}`,
          type: 'IMPACT',
          title: i.description,
          subtitle: `Severity: ${i.severity} • Reason: ${i.reason || 'Impact calculation'}`,
          badge: 'IMPACT',
          targetUrl: `/impact?impactId=${i.id}`,
        });
      }
    });

    return matches.slice(0, 20); // Cap results to 20
  }, [query, policies, documents, actions, impacts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    onClose();
    router.push(item.targetUrl);
  };

  const getTypeBadgeStyle = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'POLICY':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'IMPACT':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      case 'ACTION':
        return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
      case 'DOCUMENT':
        return { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe' };
      default:
        return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 70,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.25rem', color: '#64748b' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search policies, impacts, actions, documents... (ESC to close)"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: '#0f172a',
              fontWeight: 500,
            }}
          />
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '0.2rem 0.4rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '0.25rem',
              color: '#64748b',
              fontWeight: 700,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              Searching workspace...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>No results found for &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Try searching for a policy title, requirement, action owner, or impact keyword.
              </div>
            </div>
          )}

          {!loading &&
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const badgeStyle = getTypeBadgeStyle(item.type);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        border: `1px solid ${badgeStyle.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: isSelected ? '#2563eb' : '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                    Select ➔
                  </span>
                </div>
              );
            })}
        </div>

        {/* Footer Shortcut Legend */}
        <div
          style={{
            padding: '0.625rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.6875rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span><kbd style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>↑</kbd> <kbd style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>↓</kbd> Navigate</span>
            <span><kbd style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>Enter</kbd> Open</span>
            <span><kbd style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>ESC</kbd> Close</span>
          </div>
          <span>Authenticated Organization Scope</span>
        </div>
      </div>
    </div>
  );
}
