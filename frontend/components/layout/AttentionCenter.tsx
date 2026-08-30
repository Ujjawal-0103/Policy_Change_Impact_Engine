'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Action, Impact } from '@/types';

export interface AttentionItem {
  id: string;
  type: 'IMPACT' | 'ACTION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  subtitle: string;
  reason: string;
  targetUrl: string;
  dueDate?: string | null;
  isOverdue?: boolean;
}

interface AttentionCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function AttentionCenter({ isOpen, onClose, onCountChange }: AttentionCenterProps) {
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'OVERDUE' | 'DUE_SOON' | 'MISSING_EVIDENCE'>('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [actionsData, impactsData] = await Promise.all([
        api.get<Action[]>('/actions').catch(() => []),
        api.get<Impact[]>('/impact').catch(() => []),
      ]);
      setActions(actionsData);
      setImpacts(impactsData);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Compute dynamic attention queue
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // 1. Critical & High Unresolved Impacts
    impacts.forEach((imp) => {
      if (imp.status !== 'MITIGATED' && imp.status !== 'ACCEPTED') {
        if (imp.severity === 'CRITICAL') {
          items.push({
            id: `imp-${imp.id}`,
            type: 'IMPACT',
            severity: 'CRITICAL',
            title: `Critical Impact: ${imp.policyChange?.policy?.name || 'Policy Change'}`,
            subtitle: imp.description,
            reason: imp.reason || 'Unmitigated critical policy change requiring urgent review',
            targetUrl: `/impact?impactId=${imp.id}`,
          });
        } else if (imp.severity === 'HIGH') {
          items.push({
            id: `imp-${imp.id}`,
            type: 'IMPACT',
            severity: 'HIGH',
            title: `High Impact: ${imp.policyChange?.policy?.name || 'Policy Change'}`,
            subtitle: imp.description,
            reason: imp.reason || 'High impact modification on mandatory compliance requirement',
            targetUrl: `/impact?impactId=${imp.id}`,
          });
        }
      }
    });

    // 2. Overdue & Due-Soon Actions
    actions.forEach((act) => {
      if (act.status !== 'COMPLETED') {
        if (act.deadline) {
          const due = new Date(act.deadline);
          if (due < now || act.status === 'OVERDUE' || act.isOverdue) {
            items.push({
              id: `act-overdue-${act.id}`,
              type: 'ACTION',
              severity: 'CRITICAL',
              title: `Overdue Action: ${act.title}`,
              subtitle: `Assigned: ${act.assignedTo?.name || act.department || 'Unassigned'}`,
              reason: `Deadline was ${due.toLocaleDateString()} — immediate follow-up needed`,
              targetUrl: `/actions?actionId=${act.id}`,
              dueDate: act.deadline,
              isOverdue: true,
            });
          } else if (due <= sevenDaysFromNow) {
            const daysLeft = Math.max(1, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            items.push({
              id: `act-soon-${act.id}`,
              type: 'ACTION',
              severity: 'HIGH',
              title: `Due Soon (${daysLeft}d): ${act.title}`,
              subtitle: `Assigned: ${act.assignedTo?.name || act.department || 'Unassigned'}`,
              reason: `Compliance deadline approaching on ${due.toLocaleDateString()}`,
              targetUrl: `/actions?actionId=${act.id}`,
              dueDate: act.deadline,
            });
          }
        }

        // Missing evidence check
        if (act.requirement?.evidenceNeeded && (!act.evidence || act.evidence.length === 0)) {
          // Avoid duplicate entry if already added
          const alreadyAdded = items.some((it) => it.id.includes(act.id));
          if (!alreadyAdded) {
            items.push({
              id: `act-evidence-${act.id}`,
              type: 'ACTION',
              severity: 'MEDIUM',
              title: `Missing Evidence: ${act.title}`,
              subtitle: `Requirement: ${act.requirement.title}`,
              reason: `Mandatory evidence "${act.requirement.evidenceNeeded}" has not been uploaded`,
              targetUrl: `/actions?actionId=${act.id}`,
            });
          }
        }
      }
    });

    return items;
  }, [actions, impacts]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(attentionItems.length);
    }
  }, [attentionItems.length, onCountChange]);

  const filteredItems = useMemo(() => {
    if (filter === 'CRITICAL') return attentionItems.filter((i) => i.severity === 'CRITICAL');
    if (filter === 'OVERDUE') return attentionItems.filter((i) => i.isOverdue);
    if (filter === 'DUE_SOON') return attentionItems.filter((i) => !i.isOverdue && i.dueDate);
    if (filter === 'MISSING_EVIDENCE') return attentionItems.filter((i) => i.title.startsWith('Missing Evidence'));
    return attentionItems;
  }, [attentionItems, filter]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            color: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.125rem' }}>🔔</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Attention Center
              </h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
              {attentionItems.length} active item{attentionItems.length === 1 ? '' : 's'} require organizational action
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', gap: '0.375rem', overflowX: 'auto' }}>
          {[
            { key: 'ALL', label: `All (${attentionItems.length})` },
            { key: 'CRITICAL', label: 'Critical' },
            { key: 'OVERDUE', label: 'Overdue' },
            { key: 'DUE_SOON', label: 'Due Soon' },
            { key: 'MISSING_EVIDENCE', label: 'Missing Evidence' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filter === tab.key ? '#2563eb' : '#cbd5e1',
                backgroundColor: filter === tab.key ? '#2563eb' : '#ffffff',
                color: filter === tab.key ? '#ffffff' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              Scanning compliance status...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
                All clear!
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                No urgent compliance actions or critical impacts matching this filter.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const badgeStyle =
                item.severity === 'CRITICAL'
                  ? { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
                  : item.severity === 'HIGH'
                    ? { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' }
                    : { bg: '#fefce8', text: '#854d0e', border: '#fef08a' };

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    router.push(item.targetUrl);
                  }}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${badgeStyle.border}`,
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = badgeStyle.bg;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        border: `1px solid ${badgeStyle.border}`,
                      }}
                    >
                      {item.severity}
                    </span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>
                      {item.type} ➔
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem', lineHeight: 1.3 }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.375rem', lineHeight: 1.4 }}>
                    {item.subtitle}
                  </p>
                  <div style={{ fontSize: '0.6875rem', color: badgeStyle.text, fontWeight: 600 }}>
                    💡 {item.reason}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
