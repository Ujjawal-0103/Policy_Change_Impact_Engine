'use client';

import React, { useMemo } from 'react';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG';
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  requirements: PasswordRequirement[];
  isComplete: boolean;
}

export function evaluatePassword(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirements: PasswordRequirement[] = [
    { id: 'length', label: 'At least 8 characters', met: hasMinLength },
    { id: 'uppercase', label: 'Uppercase letter (A-Z)', met: hasUppercase },
    { id: 'lowercase', label: 'Lowercase letter (a-z)', met: hasLowercase },
    { id: 'number', label: 'Number (0-9)', met: hasNumber },
    { id: 'special', label: 'Special character (e.g. !@#$%)', met: hasSpecial },
  ];

  const metCount = requirements.filter((r) => r.met).length;

  let score = 0;
  let label: 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG' = 'WEAK';
  let color = '#ef4444';
  let textColor = '#991b1b';
  let bgColor = '#fef2f2';
  let borderColor = '#fecaca';

  if (!password) {
    score = 0;
    label = 'WEAK';
    color = '#cbd5e1';
    textColor = '#64748b';
    bgColor = '#f8fafc';
    borderColor = '#e2e8f0';
  } else if (metCount <= 2 || !hasMinLength) {
    score = 1;
    label = 'WEAK';
    color = '#ef4444';
    textColor = '#991b1b';
    bgColor = '#fef2f2';
    borderColor = '#fecaca';
  } else if (metCount === 3) {
    score = 2;
    label = 'FAIR';
    color = '#f59e0b';
    textColor = '#92400e';
    bgColor = '#fffbeb';
    borderColor = '#fde68a';
  } else if (metCount === 4) {
    score = 3;
    label = 'GOOD';
    color = '#3b82f6';
    textColor = '#1e40af';
    bgColor = '#eff6ff';
    borderColor = '#bfdbfe';
  } else {
    score = 4;
    label = 'STRONG';
    color = '#10b981';
    textColor = '#065f46';
    bgColor = '#ecfdf5';
    borderColor = '#a7f3d0';
  }

  const isComplete = metCount === 5;

  return {
    score,
    label,
    color,
    textColor,
    bgColor,
    borderColor,
    requirements,
    isComplete,
  };
}

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  mode?: 'register' | 'login';
}

export default function PasswordStrengthMeter({
  password,
  showRequirements = true,
  mode = 'register',
}: PasswordStrengthMeterProps) {
  const strength = useMemo(() => evaluatePassword(password), [password]);

  if (!password) {
    return null;
  }

  // Compact informational mode for login
  if (mode === 'login' && !showRequirements) {
    return (
      <div style={{ marginTop: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>
            Strength (informational)
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: strength.color,
              letterSpacing: '0.02em',
            }}
          >
            {strength.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', height: '0.25rem' }}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                borderRadius: '9999px',
                backgroundColor: step <= strength.score ? strength.color : '#e2e8f0',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header with Strength Label and 4-Segment Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
          Password Strength:
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            backgroundColor: strength.bgColor,
            color: strength.textColor,
            border: `1px solid ${strength.borderColor}`,
            letterSpacing: '0.04em',
          }}
        >
          {strength.label}
        </span>
      </div>

      {/* Visual Meter Bar */}
      <div style={{ display: 'flex', gap: '0.3125rem', height: '0.375rem', marginBottom: showRequirements ? '0.625rem' : 0 }}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              flex: 1,
              borderRadius: '9999px',
              backgroundColor: step <= strength.score ? strength.color : '#e2e8f0',
              transition: 'background-color 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.25rem', paddingTop: '0.375rem', borderTop: '1px solid #edf2f7' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.125rem' }}>
            Requirements:
          </div>
          {strength.requirements.map((req) => (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.71875rem',
                color: req.met ? '#059669' : '#94a3b8',
                fontWeight: req.met ? 600 : 400,
                transition: 'color 0.15s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '0.875rem',
                  height: '0.875rem',
                  borderRadius: '50%',
                  backgroundColor: req.met ? '#d1fae5' : '#f1f5f9',
                  color: req.met ? '#059669' : '#cbd5e1',
                  fontSize: '0.5625rem',
                  fontWeight: 800,
                }}
              >
                {req.met ? '✓' : '○'}
              </span>
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
