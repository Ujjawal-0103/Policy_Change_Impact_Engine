import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up 16 leftover E2E test policies...');

  // 1. Delete leftover E2E policies in dependency-safe order
  const testPolicies = await prisma.policy.findMany({
    where: { name: 'Actions E2E Security Policy' },
    select: { id: true },
  });

  const testPolicyIds = testPolicies.map((p) => p.id);

  if (testPolicyIds.length > 0) {
    const testVersions = await prisma.policyVersion.findMany({
      where: { policyId: { in: testPolicyIds } },
      select: { id: true },
    });

    const testVersionIds = testVersions.map((v) => v.id);

    if (testVersionIds.length > 0) {
      await prisma.impact.deleteMany({
        where: {
          policyChange: {
            OR: [
              { fromVersionId: { in: testVersionIds } },
              { toVersionId: { in: testVersionIds } },
            ],
          },
        },
      });

      await prisma.policyChange.deleteMany({
        where: {
          OR: [
            { fromVersionId: { in: testVersionIds } },
            { toVersionId: { in: testVersionIds } },
          ],
        },
      });

      await prisma.requirement.deleteMany({
        where: { policyVersionId: { in: testVersionIds } },
      });

      await prisma.policyVersion.deleteMany({
        where: { id: { in: testVersionIds } },
      });
    }

    const deletedPolicies = await prisma.policy.deleteMany({
      where: { id: { in: testPolicyIds } },
    });

    console.log(`Deleted ${deletedPolicies.count} test policies.`);
  } else {
    console.log('No leftover E2E test policies found.');
  }

  // 2. Delete test organization and test users if any
  await prisma.organization.deleteMany({
    where: { slug: 'test-actions-org' },
  });
  await prisma.user.deleteMany({
    where: { email: 'actions-test@policyengine.local' },
  });

  // 3. Ensure Default Organization exists
  let org = await prisma.organization.findFirst({
    where: { slug: 'default-org' },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Enterprise',
        slug: 'default-org',
      },
    });
  }

  // 4. Ensure Default Admin User exists
  let user = await prisma.user.findFirst({
    where: { email: 'admin@policyengine.local' },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@policyengine.local',
        password: 'system_default_password_hash',
        orgId: org.id,
      },
    });
  }

  // 5. Check if sample policy already exists
  let policy = await prisma.policy.findFirst({
    where: { name: 'Information Security & Data Protection Policy' },
  });

  if (!policy) {
    // Create Document for Version 1
    const doc1 = await prisma.document.create({
      data: {
        title: 'Information Security Policy - 2025 Baseline',
        originalName: 'infosec_policy_2025.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        uploadedById: user.id,
        orgId: org.id,
        pages: {
          create: [
            {
              pageNumber: 1,
              content:
                'All employee passwords must be at least 8 characters long. Remote access is permitted via standard password authentication.',
            },
            {
              pageNumber: 2,
              content:
                'Security audit logs should be retained for 30 days. Annual internal audits are recommended.',
            },
          ],
        },
      },
    });

    // Create Document for Version 2
    const doc2 = await prisma.document.create({
      data: {
        title: 'Information Security Policy - 2026 Enhanced',
        originalName: 'infosec_policy_2026.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        uploadedById: user.id,
        orgId: org.id,
        pages: {
          create: [
            {
              pageNumber: 1,
              content:
                'All employee passwords must be at least 14 characters long and require hardware MFA tokens. Password-only remote access is strictly prohibited.',
            },
            {
              pageNumber: 2,
              content:
                'Security audit logs must be retained for 365 days with immutable cloud backups. Third-party SOC2 Type II audits are mandatory by 2026-12-31.',
            },
            {
              pageNumber: 3,
              content:
                'Mandatory quarterly penetration testing must be conducted by certified ethical hackers.',
            },
          ],
        },
      },
    });

    // Create 1 Policy with Version 1 and Version 2
    policy = await prisma.policy.create({
      data: {
        name: 'Information Security & Data Protection Policy',
        description:
          'Governing cybersecurity standards, access control rules, and compliance audit mandates.',
        orgId: org.id,
      },
    });

    // Version 1 (Baseline)
    const v1 = await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 1,
        documentId: doc1.id,
        status: 'ARCHIVED',
      },
    });

    await prisma.requirement.createMany({
      data: [
        {
          policyVersionId: v1.id,
          title: 'Password Length & Complexity',
          description: 'Passwords must be at least 8 characters in length.',
          priority: 'MEDIUM',
          deadline: null,
          responsibleRole: 'IT Support',
          evidenceNeeded: 'Active Directory configuration',
          sourcePage: 1,
          sourceText: 'All employee passwords must be at least 8 characters long.',
        },
        {
          policyVersionId: v1.id,
          title: 'Audit Log Retention',
          description: 'Security audit logs should be retained for 30 days.',
          priority: 'LOW',
          deadline: null,
          responsibleRole: 'SecOps Team',
          evidenceNeeded: 'SIEM retention settings',
          sourcePage: 2,
          sourceText: 'Security audit logs should be retained for 30 days.',
        },
      ],
    });

    // Version 2 (Revised)
    const v2 = await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 2,
        documentId: doc2.id,
        status: 'ACTIVE',
      },
    });

    await prisma.requirement.createMany({
      data: [
        {
          policyVersionId: v2.id,
          title: 'Password Length & Hardware MFA',
          description:
            'Passwords must be at least 14 characters in length and require hardware MFA tokens.',
          priority: 'HIGH',
          deadline: new Date('2026-06-30'),
          responsibleRole: 'IT Security',
          evidenceNeeded: 'Okta MFA enforcement report and IAM logs',
          sourcePage: 1,
          sourceText:
            'All employee passwords must be at least 14 characters long and require hardware MFA.',
        },
        {
          policyVersionId: v2.id,
          title: 'Audit Log Retention & Immutability',
          description:
            'Security audit logs must be retained for 365 days with immutable cloud backups.',
          priority: 'HIGH',
          deadline: new Date('2026-09-30'),
          responsibleRole: 'SecOps Team',
          evidenceNeeded: 'AWS S3 Glacier Object Lock policy export',
          sourcePage: 2,
          sourceText:
            'Security audit logs must be retained for 365 days with immutable cloud backups.',
        },
        {
          policyVersionId: v2.id,
          title: 'Quarterly Penetration Testing',
          description:
            'Mandatory quarterly penetration testing conducted by certified ethical hackers.',
          priority: 'CRITICAL',
          deadline: new Date('2026-12-31'),
          responsibleRole: 'CISO Office',
          evidenceNeeded:
            'Third-party Penetration Test Executive Summary & Remediation Plan',
          sourcePage: 3,
          sourceText:
            'Mandatory quarterly penetration testing must be conducted by certified ethical hackers.',
        },
      ],
    });

    console.log(`Created multi-version policy "${policy.name}" with Version 1 and Version 2.`);
  } else {
    console.log(`Policy "${policy.name}" already exists.`);
  }

  console.log('Database is now clean and synchronized for Sprint 5!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
