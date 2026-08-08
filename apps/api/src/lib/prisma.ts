import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error(
    'Invalid or missing DATABASE_URL. Set apps/api/.env with a postgres connection string such as postgresql://user:password@localhost:5432/dbname'
  );
}

// Singleton pattern — one shared connection pool for the entire app.
// connection_limit=5 caps PostgreSQL connections for this service (server shares DB with other apps).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=10',
    },
  },
});

export default prisma;
