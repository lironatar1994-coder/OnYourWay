import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

function resolveSqliteUrl(url) {
  const value = url || 'file:./prisma/dev.db';

  if (!value.startsWith('file:')) {
    return value;
  }

  const filePath = value.slice('file:'.length);
  return `file:${path.resolve(backendRoot, filePath)}`;
}

const adapter = new PrismaBetterSqlite3({
  url: resolveSqliteUrl(process.env.DATABASE_URL),
});

export const prisma = new PrismaClient({ adapter });
