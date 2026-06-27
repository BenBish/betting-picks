import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/picks.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.exec('PRAGMA journal_mode = WAL');

  runMigrations(db);

  return db;
}

export function initializeDb(): Database {
  return getDb();
}

function runMigrations(database: Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // Get already applied migrations
  const applied = database
    .prepare('SELECT name FROM schema_migrations ORDER BY name')
    .all() as { name: string }[];

  const appliedNames = new Set(applied.map((r) => r.name));

  // Find migration files
  const migrationsDir = path.join(import.meta.dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const name = file.replace('.sql', '');
    if (!appliedNames.has(name)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
      console.log(`Applied migration: ${name}`);
    }
  }
}
