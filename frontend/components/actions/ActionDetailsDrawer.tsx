'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Action, ActionStatus, Priority, Evidence } from '@/types';
import { EvidenceUploadModal } from './EvidenceUploadModal';

interface ActionDetailsDrawerProps {
  actionId: string | null;
  onClose: () => void;
  onActionUpdated: (updatedAction: Action) => void;
}

export function ActionDetailsDrawer({
  actionId,
  onClose,
  onActionUpdated,
}: ActionDetailsDrawerProps) {
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusNotePrompt, setShowStatusNotePrompt] = useState<ActionStatus | null>(null);

  // Assignment edit state
  const [isEditingAssign, setIsEditingAssign] = useState(false);
  const [editDepartment, setEditDepartment] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // Evidence modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const fetchActionDetails = (id: string) => {
    setLoading(true);
    setError(null);
    api
      .get<Action>(`/actions/${id}`)
      .then((data) => {
        setAction(data);
        setEditDepartment(data.department || '');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load action details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (actionId) {
      fetchActionDetails(actionId);
    } else {
      setAction(null);
    }
  }, [actionId]);

  if (!actionId) return null;

  const handleStatusChange = async (targetStatus: ActionStatus) => {
    if (!action) return;
    setUpdatingStatus(true);
    setError(null);

    try {
      const updated = await api.patch<Action>(`/actions/${action.id}/status`, {
        status: targetStatus,
        note: statusNote.trim() || undefined,
      });

      // Refetch full action to get new history
      const fullUpdated = await api.get<Action>(`/actions/${action.id}`);
      setAction(fullUpdated);
      onActionUpdated(fullUpdated);
      setShowStatusNotePrompt(null);
      setStatusNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setSavingAssign(true);
    setError(null);

    try {
      await api.patch<Action>(`/actions/${action.id}/assign`, {
        department: editDepartment.trim() || null,
        note: `Department set to ${editDepartment.trim() || 'Unassigned'}`,
      });

      const fullUpdated = await api.get<Action>(`/actions/${action.id}`);
      setAction(fullUpdated);
      onActionUpdated(fullUpdated);
      setIsEditingAssign(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update assignment.');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleEvidenceAdded = (newEvidence: Evidence) => {
    if (!action) return;
    fetchActionDetails(action.id);
  };

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

  const formatDeadlineCountdown = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false };
    }
    return { text: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`, isOverdue: false };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '720px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          borderLeft: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #bfdbfe',
              }}
            >
              Action Details
            </span>
            {action && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                ID: {action.id}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.375rem',
              borderRadius: '0.375rem',
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading action details...
          </div>
        ) : error && !action ? (
          <div style={{ padding: '2rem', color: '#991b1b', backgroundColor: '#fef2f2' }}>
            {error}
          </div>
        ) : action ? (
          <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#f8fafc' }}>
            
            {/* Action Card Header */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {/* Priority */}
                {(() => {
                  const pStyle = getPriorityStyle(action.priority);
                  return (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: pStyle.bg,
                        color: pStyle.text,
                        border: `1px solid ${pStyle.border}`,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}
                    >
                      {action.priority} PRIORITY
                    </span>
                  );
                })()}

                {/* Status */}
                {(() => {
                  const sStyle = getStatusBadgeStyle(action.status);
                  return (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: sStyle.bg,
                        color: sStyle.text,
                        border: `1px solid ${sStyle.border}`,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}
                    >
                      ● {sStyle.label}
                    </span>
                  );
                })()}

                {/* Overdue alert if applicable */}
                {action.isOverdue && action.status !== 'COMPLETED' && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    ⚠️ OVERDUE
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                {action.title}
              </h1>

              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {action.description}
              </p>
            </div>

            {/* Quick Status Transition Bar */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                Change Status
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'OVERDUE'] as ActionStatus[]).map((st) => {
                  const isCurrent = action.status === st;
                  const sStyle = getStatusBadgeStyle(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus || isCurrent}
                      onClick={() => {
                        setShowStatusNotePrompt(st);
                        setStatusNote('');
                      }}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: `1px solid ${isCurrent ? sStyle.border : '#e2e8f0'}`,
                        backgroundColor: isCurrent ? sStyle.bg : '#ffffff',
                        color: isCurrent ? sStyle.text : '#475569',
                        cursor: isCurrent ? 'default' : 'pointer',
                        opacity: isCurrent ? 1 : 0.85,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      {isCurrent && '✓'} {sStyle.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Note Prompt if status button clicked */}
              {showStatusNotePrompt && (
                <div style={{ marginTop: '1rem', padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Optional audit note for transitioning to &quot;{showStatusNotePrompt}&quot;:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. All unit tests verified & compliance evidence attached"
                      style={{
                        flex: 1,
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                      }}
                    />
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(showStatusNotePrompt)}
                      style={{
                        padding: '0.375rem 0.875rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {updatingStatus ? 'Updating...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatusNotePrompt(null)}
                      style={{
                        padding: '0.375rem 0.625rem',
                        backgroundColor: '#ffffff',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Grid: Assignment & Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Department / Owner */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Owner & Department
                  </span>
                  {!isEditingAssign && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAssign(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingAssign ? (
                  <form onSubmit={handleSaveAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder="e.g. Information Security"
                      style={{
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        disabled={savingAssign}
                        style={{
                          padding: '0.25rem 0.625rem',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {savingAssign ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAssign(false)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                      🏢 {action.department || 'No department assigned'}
                    </div>
                    {action.assignedTo && (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                        👤 {action.assignedTo.name} ({action.assignedTo.email})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Deadline & Target
                </div>
                {action.deadline ? (
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                      📅 {new Date(action.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    {(() => {
                      const countdown = formatDeadlineCountdown(action.deadline);
                      if (!countdown) return null;
                      return (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: countdown.isOverdue ? '#b91c1c' : '#166534',
                            marginTop: '0.25rem',
                          }}
                        >
                          {countdown.text}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    No specific deadline configured
                  </div>
                )}
              </div>
            </div>

            {/* Upstream Policy Impact Context Section */}
            {action.impacts && action.impacts.length > 0 && (
              <div
                style={{
                  backgroundColor: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⚡ Impacted by Policy Change ({action.impacts.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {action.impacts.map((imp) => {
                    const sevBg = imp.severity === 'CRITICAL' ? '#fee2e2' : imp.severity === 'HIGH' ? '#ffedd5' : imp.severity === 'LOW' ? '#f1f5f9' : '#dbeafe';
                    const sevColor = imp.severity === 'CRITICAL' ? '#991b1b' : imp.severity === 'HIGH' ? '#c2410c' : imp.severity === 'LOW' ? '#475569' : '#1e40af';
                    const pc = imp.policyChange;

                    return (
                      <div
                        key={imp.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e9d5ff',
                          borderRadius: '0.375rem',
                          padding: '0.875rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem',
                              backgroundColor: sevBg,
                              color: sevColor,
                            }}
                          >
                            SEVERITY: {imp.severity}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link
                              href={`/impact?impactId=${imp.id}`}
                              style={{
                                fontSize: '0.6875rem',
                                color: '#7e22ce',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                            >
                              Open Impact ↗
                            </Link>
                            {pc?.policyId && (
                              <Link
                                href={`/changes?policyId=${pc.policyId}`}
                                style={{
                                  fontSize: '0.6875rem',
                                  color: '#2563eb',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                              >
                                Compare Versions ↗
                              </Link>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                          {imp.description}
                        </div>

                        {imp.reason && (
                          <p style={{ fontSize: '0.75rem', color: '#6b21a8', margin: '0 0 0.375rem 0', fontStyle: 'italic' }}>
                            {imp.reason}
                          </p>
                        )}

                        {pc && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.375rem 0.5rem', borderRadius: '0.25rem' }}>
                            <strong>Change:</strong> [{pc.changeType}] {pc.description}
                            {pc.affectedSection && <span> • § {pc.affectedSection}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked Requirement Section */}
            {action.requirement && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  Originating Requirement
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  {action.requirement.title}
                </h3>
                {action.requirement.policyVersion?.policy && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Policy: <strong>{action.requirement.policyVersion.policy.name}</strong> (Version {action.requirement.policyVersion.versionNumber})
                  </div>
                )}
                {action.requirement.sourcePage && (
                  <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600 }}>
                    📄 Cited on Page {action.requirement.sourcePage}
                  </div>
                )}
              </div>
            )}

            {/* Attached Evidence Section */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Compliance Evidence ({action.evidence?.length || 0})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Attach Evidence
                </button>
              </div>

              {action.evidence && action.evidence.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {action.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                          📄 {ev.title}
                        </div>
                        {ev.description && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.125rem' }}>
                            {ev.description}
                          </div>
                        )}
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          Attached on {new Date(ev.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {ev.fileUrl && (
                        <a
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.25rem 0.625rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            color: '#2563eb',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View File ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                  No evidence attached yet. Click &quot;+ Attach Evidence&quot; to upload audit proof.
                </div>
              )}
            </div>

            {/* Audit History Timeline */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                Action Audit History ({action.history?.length || 0})
              </div>

              {action.history && action.history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {action.history.map((hist) => (
                    <div
                      key={hist.id}
                      style={{
                        padding: '0.625rem 0.875rem',
                        backgroundColor: '#f8fafc',
                        borderLeft: '3px solid #3b82f6',
                        borderTop: '1px solid #e2e8f0',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0',
                        borderRadius: '0 0.375rem 0.375rem 0',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {hist.field === 'status' && hist.oldValue
                            ? `Status: ${hist.oldValue} → ${hist.newValue}`
                            : hist.field === 'status'
                            ? `Status initialized: ${hist.newValue}`
                            : hist.field === 'assignedTo'
                            ? `Owner: ${hist.oldValue} → ${hist.newValue}`
                            : hist.field === 'department'
                            ? `Department: ${hist.oldValue} → ${hist.newValue}`
                            : `Audit event: ${hist.field}`}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          {new Date(hist.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {hist.note && (
                        <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          &quot;{hist.note}&quot;
                        </div>
                      )}

                      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
                        👤 By: {hist.user?.name || 'System'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
                  No history recorded.
                </div>
              )}
            </div>

          </div>
        ) : null}

        {/* Evidence Upload Modal */}
        {action && (
          <EvidenceUploadModal
            isOpen={showEvidenceModal}
            actionId={action.id}
            actionTitle={action.title}
            onClose={() => setShowEvidenceModal(false)}
            onSuccess={handleEvidenceAdded}
          />
        )}
      </div>
    </div>
  );
}
