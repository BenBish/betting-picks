import { getDb } from "./db";
import { sseEmitter } from "./sse-emitter";

export interface ActivityLog {
  action: string;
  agent_id: string | null;
  created_at: string;
  details: string | null;
  id: string;
  pick_id: string | null;
}

export function logActivity(
  agentId: string | null,
  pickId: string | null,
  action: string,
  details: string | null
): void {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  db.prepare(`
    INSERT INTO activity_log (id, created_at, agent_id, pick_id, action, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    created_at,
    agentId ?? null,
    pickId ?? null,
    action,
    details ?? null
  );

  // Broadcast via SSE
  sseEmitter.emit("activity", {
    id,
    created_at,
    agent_id: agentId,
    pick_id: pickId,
    action,
    details,
  });
}

export function getActivities(filters: {
  limit?: number;
  offset?: number;
  agent_id?: string;
  action?: string;
}): ActivityLog[] {
  const db = getDb();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  let sql = "SELECT * FROM activity_log WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.agent_id) {
    sql += " AND agent_id = ?";
    params.push(filters.agent_id);
  }
  if (filters.action) {
    sql += " AND action = ?";
    params.push(filters.action);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    created_at: row.created_at as string,
    agent_id: row.agent_id as string | null,
    pick_id: row.pick_id as string | null,
    action: row.action as string,
    details: row.details as string | null,
  }));
}
