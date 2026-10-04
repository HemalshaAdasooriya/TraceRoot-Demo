import app from './app.js';
import prisma, { disconnectDatabase } from './config/database.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 TraceRoot REST API Server running on port ${PORT}`);
  console.log(`📦 Runtime: Node.js (JavaScript ES Modules)`);
  console.log(`🗄️  Database: Supabase (Managed PostgreSQL 16)`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`==================================================\n`);

  try {
    await prisma.$connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');
  } catch (err) {
    console.warn('⚠️  Could not connect to database on startup. Please check DATABASE_URL in .env:', err.message);
  }
});

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
