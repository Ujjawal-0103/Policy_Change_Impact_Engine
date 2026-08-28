'use client';

import React from 'react';
import type { DocumentAnalysisResponse, Priority } from '@/types';

interface DocumentAnalysisModalProps {
  analysis: DocumentAnalysisResponse | null;
  onClose: () => void;
}

export function DocumentAnalysisModal({ analysis, onClose }: DocumentAnalysisModalProps) {
  if (!analysis) return null;

  const { documentTitle, totalPagesAnalyzed, requirementsCount, requirements } = analysis;

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          borderColor: '#fecaca',
        };
      case 'HIGH':
        return {
          backgroundColor: '#fffbeb',
          color: '#92400e',
          borderColor: '#fde68a',
        };
      case 'MEDIUM':
        return {
          backgroundColor: '#eff6ff',
          color: '#1e40af',
          borderColor: '#bfdbfe',
        };
      case 'LOW':
      default:
        return {
          backgroundColor: '#f1f5f9',
          color: '#475569',
          borderColor: '#cbd5e1',
        };
    }
  };

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
          maxWidth: '900px',
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
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #bfdbfe',
                }}
              >
                ✨ AI Extraction Analysis
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                • {totalPagesAnalyzed} {totalPagesAnalyzed === 1 ? 'page' : 'pages'} analyzed
              </span>
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {documentTitle}
            </h2>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close modal"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subheader summary stats */}
        <div
          style={{
            padding: '0.875rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#475569',
          }}
        >
          <div>
            Extracted <strong>{requirementsCount}</strong> compliance {requirementsCount === 1 ? 'requirement' : 'requirements'} and action items.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Powered by Gemini AI Engine
          </div>
        </div>

        {/* Modal Body / Requirements List */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {requirements.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>
                No requirements detected in this document.
              </p>
            </div>
          ) : (
            requirements.map((req, index) => {
              const priorityStyle = getPriorityStyle(req.priority);
              const confidencePercent = Math.round(req.confidence * 100);

              return (
                <div
                  key={`${req.title}-${index}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.625rem',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Top line: Badges & Source page */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Priority Badge */}
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          border: `1px solid ${priorityStyle.borderColor}`,
                          backgroundColor: priorityStyle.backgroundColor,
                          color: priorityStyle.color,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {req.priority} PRIORITY
                      </span>

                      {/* Source Page Badge */}
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        📄 Page {req.sourcePage}
                      </span>

                      {/* Needs Review Alert if flagged or low confidence */}
                      {req.needsReview && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ⚠️ Needs Human Review
                        </span>
                      )}
                    </div>

                    {/* Confidence score */}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: req.confidence >= 0.75 ? '#16a34a' : '#d97706',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>Confidence: {confidencePercent}%</span>
                    </div>
                  </div>

                  {/* Requirement Title */}
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 0.5rem',
                      lineHeight: 1.35,
                    }}
                  >
                    {index + 1}. {req.title}
                  </h3>

                  {/* Requirement Description */}
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#334155',
                      lineHeight: 1.5,
                      margin: '0 0 1rem',
                    }}
                  >
                    {req.description}
                  </p>

                  {/* Metadata Grid (Role, Deadline, Evidence) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.375rem',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.125rem' }}>
                        Responsible Role
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a' }}>
                        {req.responsibleRole || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.125rem' }}>
                        Deadline
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a' }}>
                        {req.deadline || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.125rem' }}>
                        Evidence Needed
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a' }}>
                        {req.evidenceNeeded || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Source Text citation */}
                  {req.sourceText && (
                    <div
                      style={{
                        padding: '0.625rem 0.875rem',
                        backgroundColor: '#ffffff',
                        borderLeft: '3px solid #94a3b8',
                        borderTop: '1px solid #f1f5f9',
                        borderRight: '1px solid #f1f5f9',
                        borderBottom: '1px solid #f1f5f9',
                        borderRadius: '0 0.375rem 0.375rem 0',
                        fontSize: '0.8125rem',
                        color: '#475569',
                        fontStyle: 'italic',
                        marginBottom: req.suggestedActions && req.suggestedActions.length > 0 ? '1rem' : 0,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontStyle: 'normal', color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                        Source Text (Page {req.sourcePage}):
                      </span>
                      &quot;{req.sourceText}&quot;
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {req.suggestedActions && req.suggestedActions.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Suggested Actions ({req.suggestedActions.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {req.suggestedActions.map((action, actionIdx) => {
                          const actionPriorityStyle = getPriorityStyle(action.priority);
                          return (
                            <div
                              key={actionIdx}
                              style={{
                                padding: '0.625rem 0.875rem',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.375rem',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  marginBottom: '0.25rem',
                                }}
                              >
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                  • {action.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '0.25rem',
                                    border: `1px solid ${actionPriorityStyle.borderColor}`,
                                    backgroundColor: actionPriorityStyle.backgroundColor,
                                    color: actionPriorityStyle.color,
                                  }}
                                >
                                  {action.priority}
                                </span>
                              </div>
                              <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                {action.description}
                              </p>
                              {(action.suggestedOwner || action.deadline) && (
                                <div
                                  style={{
                                    marginTop: '0.375rem',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    fontSize: '0.6875rem',
                                    color: '#64748b',
                                  }}
                                >
                                  {action.suggestedOwner && (
                                    <span>👤 Owner: {action.suggestedOwner}</span>
                                  )}
                                  {action.deadline && (
                                    <span>📅 Target: {action.deadline}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
