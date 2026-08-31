import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = 'default-org';
const DEMO_ADMIN_EMAIL = 'admin@policyengine.local';
const DEMO_COMPLIANCE_EMAIL = 'sarah.compliance@policyengine.local';
const DEMO_POLICY_NAME = 'Information Security & Data Protection Standard';

async function main() {
  console.log('--- Starting PoliTrace Sprint 8 Demo Data Seeding ---');

  // 1. Ensure Default Demo Organization exists
  let org = await prisma.organization.findFirst({
    where: { slug: DEMO_ORG_SLUG },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Enterprise Solutions',
        slug: DEMO_ORG_SLUG,
      },
    });
    console.log(`Created Organization: ${org.name} (${org.id})`);
  } else {
    console.log(`Using existing Organization: ${org.name} (${org.id})`);
  }

  // 2. Hash demo password securely with bcrypt
  const demoHashedPassword = await bcrypt.hash('admin123', 10);

  // 3. Ensure Demo Admin User exists with valid bcrypt password
  let adminUser = await prisma.user.findFirst({
    where: { email: DEMO_ADMIN_EMAIL },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: 'Alex Vance (Lead Auditor)',
        email: DEMO_ADMIN_EMAIL,
        password: demoHashedPassword,
        orgId: org.id,
      },
    });
    console.log(`Created Demo Admin: ${adminUser.email}`);
  } else {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        name: 'Alex Vance (Lead Auditor)',
        password: demoHashedPassword,
        orgId: org.id,
      },
    });
    console.log(`Updated Demo Admin credentials: ${adminUser.email}`);
  }

  // Ensure Demo Compliance Officer user exists
  let complianceUser = await prisma.user.findFirst({
    where: { email: DEMO_COMPLIANCE_EMAIL },
  });

  if (!complianceUser) {
    complianceUser = await prisma.user.create({
      data: {
        name: 'Sarah Chen (SecOps Lead)',
        email: DEMO_COMPLIANCE_EMAIL,
        password: demoHashedPassword,
        orgId: org.id,
      },
    });
    console.log(`Created Demo User: ${complianceUser.email}`);
  } else {
    complianceUser = await prisma.user.update({
      where: { id: complianceUser.id },
      data: {
        name: 'Sarah Chen (SecOps Lead)',
        password: demoHashedPassword,
        orgId: org.id,
      },
    });
  }

  // 4. Safely clean up previous demo policy dataset to guarantee clean idempotent state
  const existingPolicies = await prisma.policy.findMany({
    where: {
      orgId: org.id,
      name: DEMO_POLICY_NAME,
    },
    select: { id: true },
  });

  const existingPolicyIds = existingPolicies.map((p) => p.id);

  if (existingPolicyIds.length > 0) {
    console.log(`Clearing ${existingPolicyIds.length} existing demo policy instances for clean idempotency...`);
    const versions = await prisma.policyVersion.findMany({
      where: { policyId: { in: existingPolicyIds } },
      select: { id: true },
    });
    const versionIds = versions.map((v) => v.id);

    if (versionIds.length > 0) {
      // Find impacts to delete
      await prisma.impact.deleteMany({
        where: {
          policyChange: {
            OR: [
              { fromVersionId: { in: versionIds } },
              { toVersionId: { in: versionIds } },
            ],
          },
        },
      });

      // Find requirements and their actions
      const reqs = await prisma.requirement.findMany({
        where: { policyVersionId: { in: versionIds } },
        select: { id: true },
      });
      const reqIds = reqs.map((r) => r.id);

      if (reqIds.length > 0) {
        const actions = await prisma.action.findMany({
          where: { requirementId: { in: reqIds } },
          select: { id: true },
        });
        const actionIds = actions.map((a) => a.id);

        if (actionIds.length > 0) {
          await prisma.actionDependency.deleteMany({
            where: {
              OR: [
                { actionId: { in: actionIds } },
                { dependsOnId: { in: actionIds } },
              ],
            },
          });
          await prisma.evidence.deleteMany({
            where: { actionId: { in: actionIds } },
          });
          await prisma.actionHistory.deleteMany({
            where: { actionId: { in: actionIds } },
          });
          await prisma.action.deleteMany({
            where: { id: { in: actionIds } },
          });
        }

        await prisma.requirement.deleteMany({
          where: { id: { in: reqIds } },
        });
      }

      await prisma.policyChange.deleteMany({
        where: {
          OR: [
            { fromVersionId: { in: versionIds } },
            { toVersionId: { in: versionIds } },
          ],
        },
      });

      await prisma.policyVersion.deleteMany({
        where: { id: { in: versionIds } },
      });
    }

    await prisma.policy.deleteMany({
      where: { id: { in: existingPolicyIds } },
    });
  }

  // 5. Seed Documents for Version 1 and Version 2
  const doc1 = await prisma.document.create({
    data: {
      title: 'InfoSec Policy - 2025 Baseline Standard',
      originalName: 'infosec_standard_2025_baseline.pdf',
      mimeType: 'application/pdf',
      storageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_policy_2025.pdf',
      uploadedById: adminUser.id,
      orgId: org.id,
      pages: {
        create: [
          {
            pageNumber: 1,
            content:
              'Section 4.1: Password Policy. All employee passwords must be at least 8 characters long. Remote access is permitted via single-factor password authentication.',
          },
          {
            pageNumber: 2,
            content:
              'Section 9.2: Audit Logging. Security audit logs should be retained for 30 days. Annual internal self-assessments are recommended for compliance.',
          },
        ],
      },
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      title: 'InfoSec Policy - 2026 Enhanced Standard',
      originalName: 'infosec_standard_2026_enhanced.pdf',
      mimeType: 'application/pdf',
      storageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_policy_2026.pdf',
      uploadedById: adminUser.id,
      orgId: org.id,
      pages: {
        create: [
          {
            pageNumber: 1,
            content:
              'Section 4.1: Password Policy & MFA. All employee passwords must be at least 14 characters long and require FIDO2 hardware MFA tokens. Single-factor password-only access is strictly prohibited across all endpoints.',
          },
          {
            pageNumber: 2,
            content:
              'Section 9.2: Immutable Audit Logging. Security audit logs must be retained for 365 days with immutable cloud backup storage. Independent SOC2 Type II audits are mandatory by 2026-12-31.',
          },
          {
            pageNumber: 3,
            content:
              'Section 12.0: Penetration Testing. Mandatory quarterly penetration testing must be conducted by certified third-party ethical hackers, with executive reports delivered within 14 days.',
          },
        ],
      },
    },
  });

  console.log(`Created Document V1 (${doc1.title}) and Document V2 (${doc2.title})`);

  // 6. Create Policy
  const policy = await prisma.policy.create({
    data: {
      name: DEMO_POLICY_NAME,
      description:
        'Enterprise cybersecurity governance standard defining mandatory access control, cryptographic verification, immutable audit retention, and continuous vulnerability assessment mandates.',
      orgId: org.id,
    },
  });

  // 7. Create Policy Version 1 (Baseline - ARCHIVED)
  const v1 = await prisma.policyVersion.create({
    data: {
      policyId: policy.id,
      versionNumber: 1,
      documentId: doc1.id,
      status: 'ARCHIVED',
    },
  });

  const req1_v1 = await prisma.requirement.create({
    data: {
      policyVersionId: v1.id,
      title: 'Legacy Password Length (8 Characters)',
      description: 'All employee passwords must be at least 8 characters in length.',
      priority: 'MEDIUM',
      category: 'Access Control',
      responsibleRole: 'IT Helpdesk',
      evidenceNeeded: 'Active Directory domain password policy screenshot',
      sourcePage: 1,
      sourceText: 'All employee passwords must be at least 8 characters long.',
    },
  });

  const req2_v1 = await prisma.requirement.create({
    data: {
      policyVersionId: v1.id,
      title: 'Legacy 30-Day Audit Log Retention',
      description: 'Security audit logs should be retained for at least 30 days.',
      priority: 'LOW',
      category: 'Audit & Logging',
      responsibleRole: 'SecOps Team',
      evidenceNeeded: 'SIEM log archive configuration export',
      sourcePage: 2,
      sourceText: 'Security audit logs should be retained for 30 days.',
    },
  });

  // 8. Create Policy Version 2 (Enhanced - ACTIVE)
  const v2 = await prisma.policyVersion.create({
    data: {
      policyId: policy.id,
      versionNumber: 2,
      documentId: doc2.id,
      status: 'ACTIVE',
    },
  });

  const req1_v2 = await prisma.requirement.create({
    data: {
      policyVersionId: v2.id,
      title: 'Mandatory 14-Character Passwords & Hardware MFA',
      description:
        'All employee passwords must be at least 14 characters long and enforce FIDO2 hardware MFA tokens. Single-factor access is prohibited.',
      priority: 'HIGH',
      category: 'Access Control',
      deadline: new Date('2026-06-30T23:59:59Z'),
      responsibleRole: 'IT Security Engineering',
      evidenceNeeded: 'Okta Adaptive MFA enforcement policy export & IAM auth logs',
      sourcePage: 1,
      sourceText:
        'All employee passwords must be at least 14 characters long and require FIDO2 hardware MFA tokens.',
    },
  });

  const req2_v2 = await prisma.requirement.create({
    data: {
      policyVersionId: v2.id,
      title: '365-Day Immutable Cloud Audit Log Retention',
      description:
        'Security audit logs must be retained for 365 days in immutable cloud backups with WORM compliance.',
      priority: 'HIGH',
      category: 'Audit & Logging',
      deadline: new Date('2026-09-30T23:59:59Z'),
      responsibleRole: 'SecOps Infrastructure Team',
      evidenceNeeded: 'AWS S3 Glacier Object Lock configuration policy & retention receipts',
      sourcePage: 2,
      sourceText:
        'Security audit logs must be retained for 365 days with immutable cloud backup storage.',
    },
  });

  const req3_v2 = await prisma.requirement.create({
    data: {
      policyVersionId: v2.id,
      title: 'Mandatory Quarterly Third-Party Penetration Testing',
      description:
        'Quarterly penetration testing must be conducted by certified third-party ethical hackers with remediation within 14 days.',
      priority: 'CRITICAL',
      category: 'Vulnerability Management',
      deadline: new Date('2026-12-31T23:59:59Z'),
      responsibleRole: 'CISO Office',
      evidenceNeeded:
        'Certified Penetration Test Executive Summary, Scope Letter & Vulnerability Remediation Matrix',
      sourcePage: 3,
      sourceText:
        'Mandatory quarterly penetration testing must be conducted by certified third-party ethical hackers.',
    },
  });

  console.log(`Created Policy Versions & Requirements for ${policy.name}`);

  // 9. Seed Policy Changes (v1 -> v2)
  const change1 = await prisma.policyChange.create({
    data: {
      policyId: policy.id,
      fromVersionId: v1.id,
      toVersionId: v2.id,
      changeType: 'MODIFIED',
      fieldChanged: 'REQUIREMENT',
      description:
        'Increased minimum password length from 8 to 14 characters and introduced mandatory FIDO2 hardware token enforcement.',
      affectedSection: 'Section 4.1 Access Control',
      oldValue: 'All employee passwords must be at least 8 characters long.',
      newValue:
        'All employee passwords must be at least 14 characters long and require FIDO2 hardware MFA tokens.',
      sourceReference: 'Section 4.1, Page 1',
      confidence: 0.98,
    },
  });

  const change2 = await prisma.policyChange.create({
    data: {
      policyId: policy.id,
      fromVersionId: v1.id,
      toVersionId: v2.id,
      changeType: 'MODIFIED',
      fieldChanged: 'DEADLINE',
      description:
        'Extended security audit log retention from 30 days to 365 days with mandatory immutable cloud storage protection.',
      affectedSection: 'Section 9.2 Audit Logging',
      oldValue: 'Security audit logs should be retained for 30 days.',
      newValue:
        'Security audit logs must be retained for 365 days with immutable cloud backup storage.',
      sourceReference: 'Section 9.2, Page 2',
      confidence: 0.95,
    },
  });

  const change3 = await prisma.policyChange.create({
    data: {
      policyId: policy.id,
      fromVersionId: v1.id,
      toVersionId: v2.id,
      changeType: 'ADDED',
      fieldChanged: 'REQUIREMENT',
      description:
        'Added new requirement mandating quarterly third-party penetration tests with 14-day executive reporting.',
      affectedSection: 'Section 12.0 Penetration Testing',
      oldValue: null,
      newValue:
        'Mandatory quarterly penetration testing must be conducted by certified third-party ethical hackers.',
      sourceReference: 'Section 12.0, Page 3',
      confidence: 0.99,
    },
  });

  console.log('Created Policy Changes (v1 -> v2)');

  // 10. Seed Actions across diverse lifecycle statuses
  // Action 1: COMPLETED (Hardware MFA Rollout)
  const action1 = await prisma.action.create({
    data: {
      requirementId: req1_v2.id,
      title: 'Procure & Distribute YubiKey 5C NFC Tokens to All Administrators',
      description:
        'Distribute hardware MFA security keys to all privileged system administrators and configure Okta WebAuthn authentication policy.',
      status: 'COMPLETED',
      priority: 'CRITICAL',
      department: 'IT Security Engineering',
      assignedToId: adminUser.id,
      deadline: new Date('2026-06-30T23:59:59Z'),
      evidence: {
        create: [
          {
            title: 'Okta WebAuthn FIDO2 Enrollment Report',
            description: '100% of privileged administrator accounts enrolled with hardware tokens.',
            fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/okta_mfa_audit_log.pdf',
          },
        ],
      },
      history: {
        create: [
          {
            userId: adminUser.id,
            field: 'status',
            oldValue: 'PENDING',
            newValue: 'IN_PROGRESS',
            note: 'Hardware tokens received from vendor; beginning IT rollout.',
          },
          {
            userId: adminUser.id,
            field: 'status',
            oldValue: 'IN_PROGRESS',
            newValue: 'COMPLETED',
            note: 'All 45 privileged accounts successfully validated hardware MFA.',
          },
        ],
      },
    },
  });

  // Action 2: IN_PROGRESS (AWS S3 Glacier WORM)
  const action2 = await prisma.action.create({
    data: {
      requirementId: req2_v2.id,
      title: 'Configure AWS S3 Glacier Object Lock for 365-Day Log Immutability',
      description:
        'Deploy Terraform module enabling Compliance Mode WORM storage on central SIEM S3 audit buckets with 365-day retention lock.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      department: 'SecOps Infrastructure Team',
      assignedToId: complianceUser.id,
      deadline: new Date('2026-09-30T23:59:59Z'),
      history: {
        create: [
          {
            userId: adminUser.id,
            field: 'assignedToId',
            oldValue: null,
            newValue: complianceUser.id,
            note: 'Assigned to SecOps lead for infrastructure deployment.',
          },
          {
            userId: complianceUser.id,
            field: 'status',
            oldValue: 'PENDING',
            newValue: 'IN_PROGRESS',
            note: 'Terraform script submitted for architectural peer review.',
          },
        ],
      },
    },
  });

  // Action 3: PENDING (Penetration Testing Vendor RFP)
  const action3 = await prisma.action.create({
    data: {
      requirementId: req3_v2.id,
      title: 'Issue RFP & Select CREST-Certified Vendor for Q4 Penetration Test',
      description:
        'Solicit competitive proposals from CREST/OSCP certified cybersecurity testing firms and finalize engagement terms for annual audit.',
      status: 'PENDING',
      priority: 'HIGH',
      department: 'CISO Office',
      assignedToId: adminUser.id,
      deadline: new Date('2026-11-15T23:59:59Z'),
      history: {
        create: [
          {
            userId: adminUser.id,
            field: 'status',
            oldValue: null,
            newValue: 'PENDING',
            note: 'Action created following Policy V2 baseline publication.',
          },
        ],
      },
    },
  });

  // Action 4: OVERDUE (Audit Legacy Active Directory Accounts)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14); // 14 days overdue

  const action4 = await prisma.action.create({
    data: {
      requirementId: req1_v2.id,
      title: 'Audit Legacy AD Service Accounts & Enforce 14-Character Entropy',
      description:
        'Scan legacy Active Directory service accounts and revoke expired credentials below 14 characters.',
      status: 'OVERDUE',
      priority: 'HIGH',
      department: 'IT Infrastructure',
      assignedToId: adminUser.id,
      deadline: pastDate,
      history: {
        create: [
          {
            userId: adminUser.id,
            field: 'status',
            oldValue: 'PENDING',
            newValue: 'OVERDUE',
            note: 'Audit target date elapsed before completion.',
          },
        ],
      },
    },
  });

  // Action 5: BLOCKED (Inactivity Suspension API Sync)
  const action5 = await prisma.action.create({
    data: {
      requirementId: req1_v2.id,
      title: 'Automate 90-Day Account Inactivity Lockout via HR API Sync',
      description:
        'Connect Workday HR API with Okta SCIM directory to auto-suspend accounts idle for more than 90 days.',
      status: 'BLOCKED',
      priority: 'MEDIUM',
      department: 'Enterprise Applications',
      assignedToId: complianceUser.id,
      deadline: new Date('2026-10-31T23:59:59Z'),
      history: {
        create: [
          {
            userId: complianceUser.id,
            field: 'status',
            oldValue: 'IN_PROGRESS',
            newValue: 'BLOCKED',
            note: 'Blocked: Workday SCIM API endpoint upgrade pending HR vendor maintenance.',
          },
        ],
      },
    },
  });

  // 11. Create Action Dependency (Action 3 depends on Action 1)
  await prisma.actionDependency.create({
    data: {
      actionId: action3.id,
      dependsOnId: action1.id,
    },
  });

  console.log('Created Actions across all statuses (COMPLETED, IN_PROGRESS, PENDING, OVERDUE, BLOCKED)');

  // 12. Seed Impacts linked to Policy Changes and Actions
  await prisma.impact.create({
    data: {
      policyChangeId: change1.id,
      requirementId: req1_v2.id,
      actionId: action1.id,
      description:
        'Hardware token distribution required across all privileged systems; non-compliance risks immediate administrative lockout.',
      reason:
        'Mandatory transition from single-factor to FIDO2 hardware tokens directly affects all system administrators.',
      severity: 'CRITICAL',
      status: 'MITIGATED',
    },
  });

  await prisma.impact.create({
    data: {
      policyChangeId: change2.id,
      requirementId: req2_v2.id,
      actionId: action2.id,
      description:
        'SIEM data storage volume must expand 12-fold to support 365-day retention with WORM compliance locks.',
      reason:
        'Extending retention from 30 to 365 days significantly increases storage infrastructure footprint and architectural demands.',
      severity: 'HIGH',
      status: 'ASSESSED',
    },
  });

  await prisma.impact.create({
    data: {
      policyChangeId: change3.id,
      requirementId: req3_v2.id,
      actionId: action3.id,
      description:
        'Budget allocation and executive vendor contracting required for certified third-party ethical hacking engagement.',
      reason:
        'New annual compliance audit mandate requires independent verification before year-end.',
      severity: 'HIGH',
      status: 'IDENTIFIED',
    },
  });

  console.log('Created Traceable Impacts with Severity & Status mappings');
  console.log('--- PoliTrace Sprint 8 Demo Data Seeding Completed Successfully! ---');
  console.log(`Demo Credentials:`);
  console.log(`  Email:    ${DEMO_ADMIN_EMAIL}`);
  console.log(`  Password: admin123`);
  console.log(`  Organization: ${org.name}`);
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
