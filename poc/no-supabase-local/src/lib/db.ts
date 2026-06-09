import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { readFileSync } from 'fs';

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/picks.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new DatabaseSync(resolvedPath);
  db.exec('PRAGMA journal_mode = WAL');

  // Run migration
  const schemaSql = readFileSync(
    path.join(process.cwd(), 'src', 'lib', 'schema.sql'),
    'utf8'
  );
  db.exec(schemaSql);

  return db;
}
