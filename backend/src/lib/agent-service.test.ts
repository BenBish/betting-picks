import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import * as crypto from 'crypto';
import * as agentService from './agent-service';
import { getDb } from './db';

// Each test run creates a fresh temp DB
describe('agent-service', () => {
  let originalDbPath: string | undefined;

  beforeAll(() => {
    originalDbPath = process.env.DB_PATH;
    const tempPath = `/tmp/betting-picks-agent-test-${crypto.randomUUID()}.db`;
    process.env.DB_PATH = tempPath;

    // Create a fresh DB
    const { Database } = require('bun:sqlite');
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

  it('creates an agent with a key', () => {
    const { agent, key } = agentService.createAgent('TestAgent');
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe('TestAgent');
    expect(agent.is_active).toBe(true);
    expect(key).toMatch(/^spk_[0-9a-f]+$/);
  });

  it('retrieves agent by name', () => {
    const agent = agentService.getAgentByName('TestAgent');
    expect(agent).toBeTruthy();
    expect(agent!.name).toBe('TestAgent');
  });

  it('retrieves agent by key', () => {
    const { key } = agentService.createAgent('KeyAgent');
    const agent = agentService.getAgentByKey(key);
    expect(agent).toBeTruthy();
    expect(agent!.name).toBe('KeyAgent');
  });

  it('returns null for non-existent agent', () => {
    expect(agentService.getAgentByName('NonExistent')).toBeNull();
    expect(agentService.getAgentByKey('spk_invalid')).toBeNull();
  });

  it('lists all active agents', () => {
    const agents = agentService.getAllAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);
    const names = agents.map((a) => a.name);
    expect(names).toContain('TestAgent');
    expect(names).toContain('KeyAgent');
  });

  it('updates agent name', () => {
    const { agent } = agentService.createAgent('RenameMe');
    const updated = agentService.updateAgent(agent.id, { name: 'RenamedAgent' });
    expect(updated).toBeTruthy();
    expect(updated!.name).toBe('RenamedAgent');
  });

  it('updates agent is_active', () => {
    const { agent } = agentService.createAgent('ToggleAgent');
    const updated = agentService.updateAgent(agent.id, { is_active: false });
    expect(updated).toBeTruthy();
    expect(updated!.is_active).toBe(false);
  });

  it('rotates agent key', () => {
    const { agent, key } = agentService.createAgent('RotateAgent');
    const newKey = agentService.rotateAgentKey(agent.id);
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(key);
    expect(newKey).toMatch(/^spk_[0-9a-f]+$/);

    // Old key should not work
    expect(agentService.getAgentByKey(key)).toBeNull();

    // New key should work
    const resolved = agentService.getAgentByKey(newKey!);
    expect(resolved).toBeTruthy();
    expect(resolved!.name).toBe('RotateAgent');
  });

  it('soft-deletes agent (deactivates)', () => {
    const { agent } = agentService.createAgent('DeleteAgent');
    const success = agentService.deleteAgent(agent.id);
    expect(success).toBe(true);

    // Should not appear in active list
    const activeAgents = agentService.getAllAgents();
    expect(activeAgents.find((a) => a.id === agent.id)).toBeUndefined();

    // Should still exist in DB (soft delete)
    const stillExists = agentService.getAgentById(agent.id);
    expect(stillExists).toBeTruthy();
    expect(stillExists!.is_active).toBe(false);
  });

  it('returns null for non-existent agent operations', () => {
    const fakeId = crypto.randomUUID();
    expect(agentService.updateAgent(fakeId, { name: 'Test' })).toBeNull();
    expect(agentService.rotateAgentKey(fakeId)).toBeNull();
    expect(agentService.deleteAgent(fakeId)).toBe(false);
  });
});
