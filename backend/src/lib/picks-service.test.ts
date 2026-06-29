import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import * as crypto from 'crypto';
import * as picksService from './picks-service';
import { getDb } from './db';

describe('picks-service', () => {
  let originalDbPath: string | undefined;

  beforeAll(() => {
    originalDbPath = process.env.DB_PATH;
    const tempPath = `/tmp/betting-picks-picks-test-${crypto.randomUUID()}.db`;
    process.env.DB_PATH = tempPath;

    const { Database } = require('bun:sqlite');
    const db = new Database(tempPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS picks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        created_by TEXT NOT NULL DEFAULT 'user',
        updated_by TEXT,
        source TEXT,
        match_date TEXT NOT NULL,
        competition TEXT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        market TEXT NOT NULL,
        selection TEXT NOT NULL,
        recommended_odds REAL NOT NULL,
        closing_odds REAL,
        stake REAL NOT NULL DEFAULT 1,
        result TEXT,
        profit_loss REAL,
        notes TEXT,
        raw_agent_payload TEXT,
        agent_id TEXT
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

  it('creates a pick and returns it with CLV', () => {
    const pick = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Man City',
      away_team: 'Liverpool',
      market: 'Moneyline',
      selection: 'Man City',
      recommended_odds: 1.85,
      stake: 10,
    });

    expect(pick.id).toBeTruthy();
    expect(pick.home_team).toBe('Man City');
    expect(pick.away_team).toBe('Liverpool');
    expect(pick.recommended_odds).toBe(1.85);
    expect(pick.clv_percent).toBeNull();
    expect(pick.profit_loss).toBeNull();
  });

  it('creates a pick with closing odds and calculates CLV', () => {
    const pick = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Arsenal',
      away_team: 'Chelsea',
      market: 'Moneyline',
      selection: 'Arsenal',
      recommended_odds: 2.1,
      closing_odds: 1.95,
      stake: 5,
    });

    expect(pick.closing_odds).toBe(1.95);
    expect(pick.clv_percent).toBeCloseTo(7.69);
  });

  it('creates a pick with result and calculates P&L', () => {
    const pick = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Barcelona',
      away_team: 'Real Madrid',
      market: 'Moneyline',
      selection: 'Barcelona',
      recommended_odds: 2.5,
      stake: 10,
      result: 'won',
    });

    expect(pick.result).toBe('won');
    expect(pick.profit_loss).toBe(15);
  });

  it('retrieves pick by ID', () => {
    const created = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Bayern',
      away_team: 'Dortmund',
      market: 'Moneyline',
      selection: 'Bayern',
      recommended_odds: 1.5,
      stake: 20,
    });

    const found = picksService.getPickById(created.id);
    expect(found).toBeTruthy();
    expect(found!.id).toBe(created.id);
  });

  it('returns null for non-existent pick', () => {
    expect(picksService.getPickById('non-existent')).toBeNull();
  });

  it('filters by unsettled_only', () => {
    picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'TeamA',
      away_team: 'TeamB',
      market: 'Moneyline',
      selection: 'TeamA',
      recommended_odds: 2.0,
      stake: 1,
      result: 'won',
    });

    const unsettled = picksService.getAllPicks({ unsettled_only: true });
    for (const pick of unsettled) {
      expect(pick.result).toBeNull();
    }
  });

  it('filters by team (case-insensitive)', () => {
    picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Juventus',
      away_team: 'AC Milan',
      market: 'Moneyline',
      selection: 'Juventus',
      recommended_odds: 2.0,
      stake: 1,
    });

    const results = picksService.getAllPicks({ team: 'juventus' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find((p) => p.home_team === 'Juventus');
    expect(found).toBeTruthy();
  });

  it('updates a pick', () => {
    const created = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'PSG',
      away_team: 'Marseille',
      market: 'Moneyline',
      selection: 'PSG',
      recommended_odds: 1.5,
      stake: 10,
    });

    const updated = picksService.updatePick(created.id, {
      recommended_odds: 1.6,
      notes: 'Updated odds',
    }, 'admin');

    expect(updated).toBeTruthy();
    expect(updated!.recommended_odds).toBe(1.6);
    expect(updated!.notes).toBe('Updated odds');
    expect(updated!.updated_by).toBe('admin');
  });

  it('updates closing line', () => {
    const created = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Inter',
      away_team: 'Napoli',
      market: 'Moneyline',
      selection: 'Inter',
      recommended_odds: 2.0,
      stake: 10,
    });

    const updated = picksService.updateClosingLine(created.id, 1.85, 'admin');
    expect(updated).toBeTruthy();
    expect(updated!.closing_odds).toBe(1.85);
    expect(updated!.clv_percent).toBeCloseTo(8.11);
  });

  it('settles a result and calculates P&L', () => {
    const created = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Atletico',
      away_team: 'Sevilla',
      market: 'Moneyline',
      selection: 'Atletico',
      recommended_odds: 1.9,
      stake: 10,
    });

    const settled = picksService.settleResult(created.id, 'won', 'admin');
    expect(settled).toBeTruthy();
    expect(settled!.result).toBe('won');
    expect(settled!.profit_loss).toBe(9);
  });

  it('deletes a pick', () => {
    const created = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Benfica',
      away_team: 'Porto',
      market: 'Moneyline',
      selection: 'Benfica',
      recommended_odds: 2.2,
      stake: 5,
    });

    const success = picksService.deletePick(created.id);
    expect(success).toBe(true);
    expect(picksService.getPickById(created.id)).toBeNull();
  });

  it('returns false when deleting non-existent pick', () => {
    expect(picksService.deletePick('non-existent')).toBe(false);
  });

  it('batch creates picks', () => {
    const results = picksService.batchCreatePicks([
      {
        match_date: '2026-07-01T19:00',
        home_team: 'Celtic',
        away_team: 'Rangers',
        market: 'Moneyline',
        selection: 'Celtic',
        recommended_odds: 1.7,
        stake: 10,
      },
      {
        match_date: '2026-07-01T20:00',
        home_team: 'Ajax',
        away_team: 'PSV',
        market: 'Moneyline',
        selection: 'Ajax',
        recommended_odds: 2.1,
        stake: 5,
      },
    ]);

    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[0].pick).toBeDefined();
    expect(results[0].pick?.id).toBeDefined();
    expect(results[1].success).toBe(true);
    expect(results[1].pick).toBeDefined();
    expect(results[1].pick?.id).toBeDefined();
  });

  it('batch updates closing lines', () => {
    const pick1 = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Lyon',
      away_team: 'Monaco',
      market: 'Moneyline',
      selection: 'Lyon',
      recommended_odds: 2.0,
      stake: 10,
    });

    const results = picksService.batchUpdateClosingLines([
      { id: pick1.id, closing_odds: 1.9 },
      { id: 'non-existent', closing_odds: 1.8 },
    ], 'admin');

    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
  });

  it('batch settles results', () => {
    const pick1 = picksService.createPick({
      match_date: '2026-07-01T19:00',
      home_team: 'Roma',
      away_team: 'Lazio',
      market: 'Moneyline',
      selection: 'Roma',
      recommended_odds: 2.0,
      stake: 10,
    });

    const results = picksService.batchSettleResults([
      { id: pick1.id, result: 'won' },
      { id: 'non-existent', result: 'lost' },
    ], 'admin');

    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
  });
});
