import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { logActivity } from "./activity-service";
import { getDb } from "./db";

export interface Agent {
  created_at: string;
  id: string;
  is_active: boolean;
  key_hash: string;
  key_prefix: string;
  last_active_at: string | null;
  name: string;
}

function generateAgentKey(): string {
  const hex = randomBytes(16).toString("hex");
  return `spk_${hex}`;
}

function hashKey(key: string): string {
  // Use scrypt for key hashing
  const salt = "better-bet-salt-v1";
  const hash = scryptSync(key, salt, 64);
  return hash.toString("hex");
}

export function createAgent(name: string): { agent: Agent; key: string } {
  const db = getDb();
  const key = generateAgentKey();
  const keyHash = hashKey(key);
  const keyPrefix = key.slice(0, 8); // spk_xxxx
  const id = randomUUID();

  db.prepare(`
    INSERT INTO agents (id, name, key_hash, key_prefix, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(id, name, keyHash, keyPrefix);

  logActivity(
    null,
    null,
    "agent.created",
    `Agent "${name}" created (${keyPrefix}...)`
  );

  const agent = getAgentByName(name);
  if (!agent) {
    throw new Error(`Failed to create agent "${name}"`);
  }

  return {
    agent,
    key,
  };
}

export function getAgentByName(name: string): Agent | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE name = ?").get(name) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return null;
  }
  return rowToAgent(row);
}

export function getAgentByKey(key: string): Agent | null {
  const db = getDb();
  const keyHash = hashKey(key);
  const row = db
    .prepare("SELECT * FROM agents WHERE key_hash = ?")
    .get(keyHash) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  // Update last_active_at
  db.prepare(
    "UPDATE agents SET last_active_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(row.id as string);

  return rowToAgent(row);
}

export function getAllAgents(includeInactive = false): Agent[] {
  const db = getDb();
  const sql = includeInactive
    ? "SELECT * FROM agents ORDER BY name"
    : "SELECT * FROM agents WHERE is_active = 1 ORDER BY name";
  const rows = db.prepare(sql).all() as Record<string, unknown>[];
  return rows.map(rowToAgent);
}

export function updateAgent(
  id: string,
  data: { name?: string; is_active?: boolean }
): Agent | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return null;
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.name !== undefined && data.name !== existing.name) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) {
    return rowToAgent(existing);
  }

  const sql = `UPDATE agents SET ${fields.join(", ")} WHERE id = ?`;
  values.push(id);
  db.prepare(sql).run(...values);

  const oldName = existing.name as string;
  if (data.name !== undefined && data.name !== oldName) {
    logActivity(
      id,
      null,
      "agent.renamed",
      `Agent renamed from "${oldName}" to "${data.name}"`
    );
  } else if (
    data.is_active !== undefined &&
    data.is_active !== ((existing.is_active as number) === 1)
  ) {
    const status = data.is_active ? "activated" : "deactivated";
    logActivity(id, null, `agent.${status}`, `Agent "${oldName}" ${status}`);
  }

  return getAgentById(id);
}

export function rotateAgentKey(id: string): string | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return null;
  }

  const newKey = generateAgentKey();
  const newHash = hashKey(newKey);
  const newPrefix = newKey.slice(0, 8);

  db.prepare("UPDATE agents SET key_hash = ?, key_prefix = ? WHERE id = ?").run(
    newHash,
    newPrefix,
    id
  );

  logActivity(
    id,
    null,
    "agent.key_rotated",
    `Agent "${existing.name}" key rotated (${newPrefix}...)`
  );

  return newKey;
}

export function deleteAgent(id: string): boolean {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return false;
  }

  const name = existing.name as string;

  // Soft delete: deactivate instead of hard delete
  db.prepare("UPDATE agents SET is_active = 0 WHERE id = ?").run(id);

  logActivity(null, null, "agent.deleted", `Agent "${name}" deactivated`);

  return true;
}

export function getAgentById(id: string): Agent | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return null;
  }
  return rowToAgent(row);
}

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    key_hash: row.key_hash as string,
    key_prefix: row.key_prefix as string,
    is_active: (row.is_active as number) === 1,
    created_at: row.created_at as string,
    last_active_at: row.last_active_at as string | null,
  };
}
