import { PrismaClient } from '@prisma/client';

// TraceRoot - Supabase Managed PostgreSQL Database Client Singleton
// Utilizes Supabase Supavisor connection pooling (port 6543) for high-concurrency mobile transactions
// Migrations are routed through DIRECT_URL (port 5432) via schema.prisma directUrl configuration

declare global {
  // Prevent multiple instances of Prisma Client in development (hot reload)
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

/**
 * Gracefully disconnect Prisma PostgreSQL client on process termination
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('[PostgreSQL] Database client disconnected gracefully.');
  } catch (error) {
    console.error('[PostgreSQL] Error disconnecting database client:', error);
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
