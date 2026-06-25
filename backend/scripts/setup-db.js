import 'dotenv/config';

import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const migrationsRoot = path.join(backendRoot, 'prisma', 'migrations');

function sqlitePathFromUrl(url) {
  const value = url || 'file:./prisma/dev.db';

  if (!value.startsWith('file:')) {
    throw new Error('Only file: SQLite DATABASE_URL values are supported.');
  }

  const filePath = value.slice('file:'.length);
  return path.resolve(backendRoot, filePath);
}

const databasePath = sqlitePathFromUrl(process.env.DATABASE_URL);
mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS "_LocalMigration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingInitialSchema = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Provider'")
  .get();
const initialTracked = db
  .prepare('SELECT id FROM "_LocalMigration" WHERE id = ?')
  .get('20260625000000_init');

if (existingInitialSchema && !initialTracked) {
  db.prepare('INSERT INTO "_LocalMigration" ("id") VALUES (?)').run('20260625000000_init');
}

const migrations = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const markMigration = db.prepare('INSERT INTO "_LocalMigration" ("id") VALUES (?)');
const hasMigration = db.prepare('SELECT id FROM "_LocalMigration" WHERE id = ?');

for (const migration of migrations) {
  if (hasMigration.get(migration)) {
    continue;
  }

  const migrationSql = readFileSync(path.join(migrationsRoot, migration, 'migration.sql'), 'utf8');
  db.transaction(() => {
    db.exec(migrationSql);
    markMigration.run(migration);
  })();
  console.log(`[db] Applied migration ${migration}`);
}

db.close();

console.log(`[db] SQLite database ready at ${databasePath}`);
