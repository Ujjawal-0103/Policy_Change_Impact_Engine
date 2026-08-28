'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Priority, ActionStatus, Action } from '@/types';

interface RequirementOption {
  id: string;
  title: string;
  priority: Priority;
  deadline: string | null;
  policyVersion?: {
    id: string;
    versionNumber: number;
    policy?: { name: string };
  };
}

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAction: Action) => void;
  initialRequirementId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialPriority?: Priority;
  initialDepartment?: string;
  initialDeadline?: string;
}

export function CreateActionModal({
  isOpen,
  onClose,
  onSuccess,
  initialRequirementId = '',
  initialTitle = '',
  initialDescription = '',
  initialPriority = 'MEDIUM',
  initialDepartment = '',
  initialDeadline = '',
}: CreateActionModalProps) {
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  const [requirementId, setRequirementId] = useState(initialRequirementId);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [department, setDepartment] = useState(initialDepartment);
  const [deadline, setDeadline] = useState(initialDeadline);
  const [status, setStatus] = useState<ActionStatus>('PENDING');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRequirementId(initialRequirementId);
      setTitle(initialTitle);
      setDescription(initialDescription);
      setPriority(initialPriority);
      setDepartment(initialDepartment);
      setDeadline(initialDeadline);
      setStatus('PENDING');
      setNote('');
      setError(null);

      // Fetch requirements list for dropdown
      setLoadingRequirements(true);
      api
        .get<RequirementOption[]>('/requirements')
        .then((data) => {
          setRequirements(data || []);
          if (!initialRequirementId && data && data.length > 0) {
            setRequirementId(data[0].id);
            if (!initialTitle) {
              setTitle(`Satisfy: ${data[0].title}`);
              setPriority(data[0].priority || 'MEDIUM');
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load requirements:', err);
        })
        .finally(() => setLoadingRequirements(false));
    }
  }, [isOpen, initialRequirementId, initialTitle, initialDescription, initialPriority, initialDepartment, initialDeadline]);

  const handleRequirementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setRequirementId(selectedId);
    const req = requirements.find((r) => r.id === selectedId);
    if (req) {
      if (!title || title.startsWith('Satisfy:')) {
        setTitle(`Satisfy: ${req.title}`);
      }
      if (req.priority) setPriority(req.priority);
      if (req.deadline && !deadline) {
        setDeadline(req.deadline.split('T')[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementId) {
      setError('Please select an associated Requirement.');
      return;
    }
    if (!title.trim()) {
      setError('Action title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        requirementId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        priority,
        department: department.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        status,
        note: note.trim() || undefined,
      };

      const created = await api.post<Action>('/actions', payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create action.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
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
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Create Compliance Action
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
              Assign an organizational action linked to a compliance requirement.
            </p>
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
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                padding: '0.75rem 1rem',
                color: '#991b1b',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Linked Requirement */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Linked Requirement *
            </label>
            {loadingRequirements ? (
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Loading requirements...</div>
            ) : requirements.length > 0 ? (
              <select
                value={requirementId}
                onChange={handleRequirementChange}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {requirements.map((req) => (
                  <option key={req.id} value={req.id}>
                    [{req.priority}] {req.title}
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <input
                  type="text"
                  value={requirementId}
                  onChange={(e) => setRequirementId(e.target.value)}
                  placeholder="Enter Requirement ID"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                  No stored requirements found. Upload a policy document first or specify a valid ID.
                </p>
              </div>
            )}
          </div>

          {/* Action Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Action Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement multi-factor authentication for all remote users"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Action Description / Implementation Steps
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the operational mandate and evidence required to complete this action..."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Grid: Priority, Department, Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Department / Owner
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Information Security, Legal, HR"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Deadline */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Initial Note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Creation Note (Audit Log)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Generated from Q3 Cybersecurity Policy extraction"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Footer buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1.25rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating Action...' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
