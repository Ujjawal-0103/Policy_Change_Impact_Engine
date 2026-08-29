'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Action, ActionStats, ActionStatus, Priority } from '@/types';
import { CreateActionModal } from '@/components/actions/CreateActionModal';
import { ActionDetailsDrawer } from '@/components/actions/ActionDetailsDrawer';

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [stats, setStats] = useState<ActionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const fetchActionsAndStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [actionsData, statsData] = await Promise.all([
        api.get<Action[]>('/actions'),
        api.get<ActionStats>('/actions/stats'),
      ]);

      setActions(actionsData || []);
      setStats(statsData || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load actions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionsAndStats();
  }, [fetchActionsAndStats]);

  const handleQuickStatusChange = async (
    e: React.MouseEvent,
    action: Action,
    newStatus: ActionStatus,
  ) => {
    e.stopPropagation();
    if (action.status === newStatus) return;

    try {
      await api.patch<Action>(`/actions/${action.id}/status`, {
        status: newStatus,
        note: `Quick status update to ${newStatus}`,
      });
      fetchActionsAndStats();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const filteredActions = actions.filter((act) => {
    // Status filter
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'OVERDUE') {
        if (!act.isOverdue && act.status !== 'OVERDUE') return false;
      } else if (act.status !== selectedStatus) {
        return false;
      }
    }

    // Priority filter
    if (selectedPriority !== 'ALL' && act.priority !== selectedPriority) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchDesc = act.description?.toLowerCase().includes(q);
      const matchDept = act.department?.toLowerCase().includes(q);
      const matchReq = act.requirement?.title.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchDept && !matchReq) return false;
    }

    return true;
  });

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      case 'HIGH':
        return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' };
      case 'MEDIUM':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'LOW':
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const getStatusBadgeStyle = (status: ActionStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', label: 'Completed' };
      case 'IN_PROGRESS':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'In Progress' };
      case 'OVERDUE':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Overdue' };
      case 'BLOCKED':
        return { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', label: 'Blocked' };
      case 'PENDING':
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: 'Pending' };
    }
  };

  return (
    <>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 className="page-title">Action & Compliance Engine</h1>
          <p className="page-subtitle">
            Track organizational compliance tasks, assign department owners, manage deadlines, and audit evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Action
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Actions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
            {stats ? stats.totalActions : '—'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
            Total Actions
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            All compliance tasks
          </div>
        </div>

        {/* Pending */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#475569', lineHeight: 1 }}>
            {stats ? stats.pending : '—'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
            Pending
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Awaiting initiation
          </div>
        </div>

        {/* In Progress */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>
            {stats ? stats.inProgress : '—'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
            In Progress
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Actively being worked
          </div>
        </div>

        {/* Completed */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>
            {stats ? stats.completed : '—'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
            Completed
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Fulfilled & substantiated
          </div>
        </div>

        {/* Overdue */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: stats && stats.overdue > 0 ? '#fef2f2' : '#ffffff',
            borderColor: stats && stats.overdue > 0 ? '#fecaca' : 'var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              color: stats && stats.overdue > 0 ? '#b91c1c' : '#475569',
              lineHeight: 1,
            }}
          >
            {stats ? stats.overdue : '—'}
          </div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: stats && stats.overdue > 0 ? '#991b1b' : '#334155',
              marginTop: '0.5rem',
            }}
          >
            ⚠️ Overdue
          </div>
          <div style={{ fontSize: '0.75rem', color: stats && stats.overdue > 0 ? '#b91c1c' : '#64748b', marginTop: '0.25rem' }}>
            Past target deadline
          </div>
        </div>

        {/* Blocked */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#be123c', lineHeight: 1 }}>
            {stats ? stats.blocked : '—'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
            Blocked
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Hindered by dependencies
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Search bar */}
        <div style={{ flex: '1 1 260px', maxWidth: '380px', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, department, requirement..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />
          <svg
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              color: '#94a3b8',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'BLOCKED', label: 'Blocked' },
          ].map((st) => {
            const isActive = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: `1px solid ${isActive ? '#2563eb' : '#cbd5e1'}`,
                  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#2563eb' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.8125rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Actions Table / List */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading compliance actions...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', color: '#991b1b', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          {error}
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="placeholder-state card">
          <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="placeholder-title">No actions found</p>
          <p className="placeholder-desc">
            {actions.length === 0
              ? 'No compliance actions have been created yet. Click "+ Create Action" or extract requirements from uploaded policy documents.'
              : 'No actions match the active status or search filters.'}
          </p>
          {actions.length === 0 && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create First Action
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Action Title
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Department / Owner
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Priority
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Deadline
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.map((action) => {
                  const priorityStyle = getPriorityStyle(action.priority);
                  const statusStyle = getStatusBadgeStyle(action.status);

                  return (
                    <tr
                      key={action.id}
                      onClick={() => setSelectedActionId(action.id)}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* Action Title & Requirement */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                          {action.title}
                        </div>
                        {action.requirement && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>Mandate:</span>
                            <span style={{ color: '#2563eb', fontWeight: 500 }}>
                              {action.requirement.title}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Department / Owner */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: '#0f172a', fontWeight: 500 }}>
                          🏢 {action.department || 'Unassigned'}
                        </div>
                        {action.assignedTo && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                            👤 {action.assignedTo.name}
                          </div>
                        )}
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: `1px solid ${priorityStyle.border}`,
                            backgroundColor: priorityStyle.bg,
                            color: priorityStyle.text,
                            letterSpacing: '0.03em',
                          }}
                        >
                          {action.priority}
                        </span>
                      </td>

                      {/* Deadline */}
                      <td style={{ padding: '1rem' }}>
                        {action.deadline ? (
                          <div>
                            <div style={{ color: '#0f172a', fontWeight: 500 }}>
                              {new Date(action.deadline).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            {action.isOverdue && action.status !== 'COMPLETED' && (
                              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.125rem' }}>
                                ⚠️ OVERDUE
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </td>

                      {/* Interactive Status Selector */}
                      <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={action.status}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              e as any,
                              action,
                              e.target.value as ActionStatus,
                            )
                          }
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: `1px solid ${statusStyle.border}`,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </td>

                      {/* Evidence */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: (action.evidence?.length || 0) > 0 ? '#166534' : '#94a3b8',
                            backgroundColor: (action.evidence?.length || 0) > 0 ? '#f0fdf4' : '#f8fafc',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: `1px solid ${(action.evidence?.length || 0) > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                          }}
                        >
                          📎 {action.evidence?.length || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Action Modal */}
      <CreateActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchActionsAndStats()}
      />

      {/* Action Details Drawer */}
      <ActionDetailsDrawer
        actionId={selectedActionId}
        onClose={() => setSelectedActionId(null)}
        onActionUpdated={() => fetchActionsAndStats()}
      />
    </>
  );
}
