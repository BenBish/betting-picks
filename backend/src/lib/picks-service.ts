import { getDb } from './db';
import { calculateClvPercent, calculateProfitLoss } from './calculations';

export interface PickRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  source: string | null;
  match_date: string;
  competition: string | null;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  recommended_odds: number;
  closing_odds: number | null;
  stake: number;
  result: string | null;
  profit_loss: number | null;
  notes: string | null;
  raw_agent_payload: string | null;
  agent_id: string | null;
}

export interface PickWithClv extends PickRow {
  clv_percent: number | null;
}

function rowToPick(row: Record<string, unknown>): PickWithClv {
  const pick: PickRow = {
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string,
    updated_by: row.updated_by as string | null,
    source: row.source as string | null,
    match_date: row.match_date as string,
    competition: row.competition as string | null,
    home_team: row.home_team as string,
    away_team: row.away_team as string,
    market: row.market as string,
    selection: row.selection as string,
    recommended_odds: Number(row.recommended_odds),
    closing_odds: row.closing_odds ? Number(row.closing_odds) : null,
    stake: Number(row.stake),
    result: row.result as string | null,
    profit_loss: row.profit_loss !== null && row.profit_loss !== undefined
      ? Number(row.profit_loss)
      : null,
    notes: row.notes as string | null,
    raw_agent_payload: row.raw_agent_payload as string | null,
    agent_id: row.agent_id as string | null,
  };

  const clvPercent =
    pick.closing_odds !== null
      ? calculateClvPercent(pick.recommended_odds, pick.closing_odds)
      : null;

  return { ...pick, clv_percent: clvPercent };
}

function recalculateProfitLoss(result: string | null, stake: number, recommendedOdds: number): number | null {
  if (!result) return null;
  return calculateProfitLoss(result, stake, recommendedOdds);
}

export function createPick(data: {
  source?: string;
  match_date: string;
  competition?: string;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  recommended_odds: number;
  closing_odds?: number;
  stake: number;
  notes?: string;
  result?: string;
  created_by?: string;
  raw_agent_payload?: string;
  agent_id?: string;
}): PickWithClv {
  const db = getDb();

  const profit_loss = data.result
    ? calculateProfitLoss(data.result, data.stake, data.recommended_odds)
    : null;

  const insert = db.prepare(`
    INSERT INTO picks (
      source, match_date, competition, home_team, away_team,
      market, selection, recommended_odds, closing_odds, stake,
      result, profit_loss, notes, created_by, raw_agent_payload, agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    data.source ?? null,
    data.match_date,
    data.competition ?? null,
    data.home_team,
    data.away_team,
    data.market,
    data.selection,
    data.recommended_odds,
    data.closing_odds ?? null,
    data.stake,
    data.result ?? null,
    profit_loss,
    data.notes ?? null,
    data.created_by ?? 'user',
    data.raw_agent_payload ?? null,
    data.agent_id ?? null
  );

  // Fetch the newly inserted pick - use the latest created_at as fallback
  const rows = db
    .prepare('SELECT * FROM picks ORDER BY created_at DESC, id DESC LIMIT 1')
    .all() as Record<string, unknown>[];

  return rowToPick(rows[0]);
}

export function getPickById(id: string): PickWithClv | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM picks WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  if (!row) return null;
  return rowToPick(row);
}

export function getAllPicks(filters: {
  source?: string;
  competition?: string;
  result?: string;
  team?: string;
  date_from?: string;
  date_to?: string;
  unsettled_only?: boolean;
  agent_id?: string;
}): PickWithClv[] {
  const db = getDb();
  let sql = 'SELECT * FROM picks WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters.source) {
    sql += ' AND source = ?';
    params.push(filters.source);
  }
  if (filters.competition) {
    sql += ' AND competition = ?';
    params.push(filters.competition);
  }
  if (filters.result) {
    sql += ' AND result = ?';
    params.push(filters.result);
  }
  if (filters.unsettled_only) {
    sql += ' AND result IS NULL';
  }
  if (filters.team) {
    const teamLower = filters.team.toLowerCase();
    sql += ' AND (LOWER(home_team) LIKE ? OR LOWER(away_team) LIKE ?)';
    params.push(`%${teamLower}%`, `%${teamLower}%`);
  }
  if (filters.date_from) {
    sql += ' AND match_date >= ?';
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    sql += ' AND match_date <= ?';
    params.push(filters.date_to);
  }
  if (filters.agent_id) {
    sql += ' AND agent_id = ?';
    params.push(filters.agent_id);
  }

  sql += ' ORDER BY match_date DESC';

  const rows = db
    .prepare(sql)
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToPick);
}

export function updatePick(
  id: string,
  data: {
    source?: string;
    match_date?: string;
    competition?: string;
    home_team?: string;
    away_team?: string;
    market?: string;
    selection?: string;
    recommended_odds?: number;
    closing_odds?: number | null;
    stake?: number;
    notes?: string;
  },
  updatedBy: string
): PickWithClv | null {
  const db = getDb();
  const existing = getPickById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const upsert = (key: string, val: unknown) => {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val == null ? null : (val as string | number));
    }
  };

  upsert('source', data.source);
  upsert('match_date', data.match_date);
  upsert('competition', data.competition);
  upsert('home_team', data.home_team);
  upsert('away_team', data.away_team);
  upsert('market', data.market);
  upsert('selection', data.selection);
  upsert('recommended_odds', data.recommended_odds);
  upsert('closing_odds', data.closing_odds === undefined ? undefined : (data.closing_odds ?? null));
  upsert('stake', data.stake);
  upsert('notes', data.notes);

  // Recalculate profit_loss if result exists and relevant fields changed
  if (existing.result && (data.recommended_odds !== undefined || data.stake !== undefined)) {
    const newOdds = data.recommended_odds ?? existing.recommended_odds;
    const newStake = data.stake ?? existing.stake;
    upsert('profit_loss', recalculateProfitLoss(existing.result, newStake, newOdds));
  }

  if (fields.length === 0) return existing;

  values.push(updatedBy);
  fields.push('updated_by = ?');
  fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");

  const sql = `UPDATE picks SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  db.prepare(sql).run(...values);

  return getPickById(id);
}

export function updateClosingLine(
  id: string,
  closingOdds: number,
  updatedBy: string
): PickWithClv | null {
  const db = getDb();
  const existing = getPickById(id);
  if (!existing) return null;

  // Recalculate P&L if already settled
  let profitLoss = existing.profit_loss;
  if (existing.result) {
    profitLoss = calculateProfitLoss(existing.result, existing.stake, existing.recommended_odds);
  }

  db.prepare(`
    UPDATE picks SET closing_odds = ?, profit_loss = ?, updated_by = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
  `).run(closingOdds, profitLoss, updatedBy, id);

  return getPickById(id);
}

export function settleResult(
  id: string,
  result: string,
  updatedBy: string
): PickWithClv | null {
  const db = getDb();
  const existing = getPickById(id);
  if (!existing) return null;

  const profitLoss = calculateProfitLoss(
    result,
    existing.stake,
    existing.recommended_odds
  );

  db.prepare(`
    UPDATE picks SET result = ?, profit_loss = ?, updated_by = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
  `).run(result, profitLoss, updatedBy, id);

  return getPickById(id);
}

export function deletePick(id: string): boolean {
  const db = getDb();
  const existing = getPickById(id);
  if (!existing) return false;

  db.prepare('DELETE FROM picks WHERE id = ?').run(id);
  return true;
}

export function batchCreatePicks(picks: Array<{
  source?: string;
  match_date: string;
  competition?: string;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  recommended_odds: number;
  closing_odds?: number;
  stake: number;
  notes?: string;
  result?: string;
  created_by?: string;
  raw_agent_payload?: string;
  agent_id?: string;
}>): Array<{ success: boolean; pick?: PickWithClv; error?: string }> {
  const db = getDb();
  const results: Array<{ success: boolean; pick?: PickWithClv; error?: string }> = [];

  // Use a transaction for batch inserts
  db.prepare('BEGIN TRANSACTION').run();

  try {
    for (const pickData of picks) {
      try {
        const profit_loss = pickData.result
          ? calculateProfitLoss(pickData.result, pickData.stake, pickData.recommended_odds)
          : null;

        db.prepare(`
          INSERT INTO picks (
            source, match_date, competition, home_team, away_team,
            market, selection, recommended_odds, closing_odds, stake,
            result, profit_loss, notes, created_by, raw_agent_payload, agent_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          pickData.source ?? null,
          pickData.match_date,
          pickData.competition ?? null,
          pickData.home_team,
          pickData.away_team,
          pickData.market,
          pickData.selection,
          pickData.recommended_odds,
          pickData.closing_odds ?? null,
          pickData.stake,
          pickData.result ?? null,
          profit_loss,
          pickData.notes ?? null,
          pickData.created_by ?? 'user',
          pickData.raw_agent_payload ?? null,
          pickData.agent_id ?? null
        );

        results.push({ success: true });
      } catch (err) {
        results.push({ success: false, error: String(err) });
      }
    }

    db.prepare('COMMIT').run();
  } catch (err) {
    db.prepare('ROLLBACK').run();
    // If transaction fails, mark all as failed
    results.length = 0;
    results.push({ success: false, error: `Transaction failed: ${err}` });
  }

  return results;
}

export function batchUpdateClosingLines(
  updates: Array<{ id: string; closing_odds: number }>,
  updatedBy: string
): Array<{ success: boolean; error?: string }> {
  const db = getDb();
  const results: Array<{ success: boolean; error?: string }> = [];

  for (const update of updates) {
    const existing = getPickById(update.id);
    if (!existing) {
      results.push({ success: false, error: `Pick ${update.id} not found` });
      continue;
    }

    let profitLoss = existing.profit_loss;
    if (existing.result) {
      profitLoss = calculateProfitLoss(existing.result, existing.stake, existing.recommended_odds);
    }

    try {
      db.prepare(`
        UPDATE picks SET closing_odds = ?, profit_loss = ?, updated_by = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
      `).run(update.closing_odds, profitLoss, updatedBy, update.id);
      results.push({ success: true });
    } catch (err) {
      results.push({ success: false, error: String(err) });
    }
  }

  return results;
}

export function batchSettleResults(
  updates: Array<{ id: string; result: string }>,
  updatedBy: string
): Array<{ success: boolean; error?: string }> {
  const db = getDb();
  const results: Array<{ success: boolean; error?: string }> = [];

  for (const update of updates) {
    const existing = getPickById(update.id);
    if (!existing) {
      results.push({ success: false, error: `Pick ${update.id} not found` });
      continue;
    }

    const profitLoss = calculateProfitLoss(update.result, existing.stake, existing.recommended_odds);

    try {
      db.prepare(`
        UPDATE picks SET result = ?, profit_loss = ?, updated_by = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
      `).run(update.result, profitLoss, updatedBy, update.id);
      results.push({ success: true });
    } catch (err) {
      results.push({ success: false, error: String(err) });
    }
  }

  return results;
}
