import { PrismaClient } from '@prisma/client';

// TraceRoot - Supabase Managed PostgreSQL Database Client Singleton (JavaScript ES Modules)
// Utilizes Supabase Supavisor connection pooling (port 6543) for high-concurrency mobile transactions
// Migrations are routed through DIRECT_URL (port 5432) via schema.prisma directUrl configuration

const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Gracefully disconnect Prisma PostgreSQL client on process termination
 */
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('[Supabase / PostgreSQL] Database client disconnected gracefully.');
  } catch (error) {
    console.error('[Supabase / PostgreSQL] Error disconnecting database client:', error);
  }
};

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export default prisma;
