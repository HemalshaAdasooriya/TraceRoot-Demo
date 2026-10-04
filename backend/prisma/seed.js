import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed (Supabase PostgreSQL)...');

  // Seed Admin user (demonstration)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@traceroot.lk' },
    update: {},
    create: {
      name: 'TraceRoot SuperAdmin',
      email: 'admin@traceroot.lk',
      phone: '+94770000001',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$seedhashdemonstration',
      role: 'ADMIN',
      verificationStatus: 'VERIFIED',
      admin: {
        create: {
          department: 'Platform Governance & Auditing',
        },
      },
    },
  });

  console.log(`✅ Seeded Admin User: ${adminUser.email}`);
  console.log('🌱 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
