import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  createAgent,
  deleteAgent,
  getAgentById,
  getAgentByKey,
  getAgentByName,
  getAllAgents,
  rotateAgentKey,
  updateAgent,
} from "./agent-service";

const AGENT_KEY_PATTERN = /^spk_[0-9a-f]+$/;

// Each test run creates a fresh temp DB
describe("agent-service", () => {
  let originalDbPath: string | undefined;

  beforeAll(() => {
    originalDbPath = process.env.DB_PATH;
    const tempPath = `/tmp/betting-picks-agent-test-${randomUUID()}.db`;
    process.env.DB_PATH = tempPath;

    // Create a fresh DB
    const { Database } = require("bun:sqlite");
    const db = new Database(tempPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        last_active_at TEXT
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        agent_id TEXT,
        pick_id TEXT,
        action TEXT NOT NULL,
        details TEXT
      );
    `);
  });

  afterAll(() => {
    process.env.DB_PATH = originalDbPath;
  });

  it("creates an agent with a key", () => {
    const { agent, key } = createAgent("TestAgent");
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe("TestAgent");
    expect(agent.is_active).toBe(true);
    expect(key).toMatch(AGENT_KEY_PATTERN);
  });

  it("retrieves agent by name", () => {
    const agent = getAgentByName("TestAgent");
    expect(agent).toBeTruthy();
    expect(agent?.name).toBe("TestAgent");
  });

  it("retrieves agent by key", () => {
    const { key } = createAgent("KeyAgent");
    const agent = getAgentByKey(key);
    expect(agent).toBeTruthy();
    expect(agent?.name).toBe("KeyAgent");
  });

  it("returns null for non-existent agent", () => {
    expect(getAgentByName("NonExistent")).toBeNull();
    expect(getAgentByKey("spk_invalid")).toBeNull();
  });

  it("lists all active agents", () => {
    const agents = getAllAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);
    const names = agents.map((a) => a.name);
    expect(names).toContain("TestAgent");
    expect(names).toContain("KeyAgent");
  });

  it("updates agent name", () => {
    const { agent } = createAgent("RenameMe");
    const updated = updateAgent(agent.id, {
      name: "RenamedAgent",
    });
    expect(updated).toBeTruthy();
    expect(updated?.name).toBe("RenamedAgent");
  });

  it("updates agent is_active", () => {
    const { agent } = createAgent("ToggleAgent");
    const updated = updateAgent(agent.id, { is_active: false });
    expect(updated).toBeTruthy();
    expect(updated?.is_active).toBe(false);
  });

  it("rotates agent key", () => {
    const { agent, key } = createAgent("RotateAgent");
    const newKey = rotateAgentKey(agent.id);
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(key);
    expect(newKey).toMatch(AGENT_KEY_PATTERN);

    // Old key should not work
    expect(getAgentByKey(key)).toBeNull();

    // New key should work
    if (!newKey) {
      throw new Error("Expected rotated key");
    }
    const resolved = getAgentByKey(newKey);
    expect(resolved).toBeTruthy();
    expect(resolved?.name).toBe("RotateAgent");
  });

  it("soft-deletes agent (deactivates)", () => {
    const { agent } = createAgent("DeleteAgent");
    const success = deleteAgent(agent.id);
    expect(success).toBe(true);

    // Should not appear in active list
    const activeAgents = getAllAgents();
    expect(activeAgents.find((a) => a.id === agent.id)).toBeUndefined();

    // Should still exist in DB (soft delete)
    const stillExists = getAgentById(agent.id);
    expect(stillExists).toBeTruthy();
    expect(stillExists?.is_active).toBe(false);
  });

  it("returns null for non-existent agent operations", () => {
    const fakeId = randomUUID();
    expect(updateAgent(fakeId, { name: "Test" })).toBeNull();
    expect(rotateAgentKey(fakeId)).toBeNull();
    expect(deleteAgent(fakeId)).toBe(false);
  });
});
