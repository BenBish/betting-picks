import { getDb } from './db';

export interface AnalyticsResult {
  total_picks: number;
  settled_picks: number;
  won_picks: number;
  lost_picks: number;
  push_picks: number;
  void_picks: number;
  win_rate: number;
  total_stake: number;
  total_profit_loss: number;
  roi: number;
  avg_clv_percent: number | null;
  picks_with_clv: number;
}

export interface AnalyticsByAgent {
  agent_id: string | null;
  agent_name: string;
  total_picks: number;
  settled_picks: number;
  won_picks: number;
  win_rate: number;
  total_profit_loss: number;
  avg_clv_percent: number | null;
}

export interface AnalyticsByMarket {
  market: string;
  total_picks: number;
  settled_picks: number;
  won_picks: number;
  win_rate: number;
  total_profit_loss: number;
}

export interface AnalyticsByCompetition {
  competition: string;
  total_picks: number;
  settled_picks: number;
  won_picks: number;
  win_rate: number;
  total_profit_loss: number;
}

export interface DailyPnlPoint {
  date: string;
  profit_loss: number;
  picks_count: number;
}

export function getAnalytics(): AnalyticsResult {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_picks,
      COUNT(CASE WHEN result IS NOT NULL THEN 1 END) as settled_picks,
      COUNT(CASE WHEN result = 'won' THEN 1 END) as won_picks,
      COUNT(CASE WHEN result = 'lost' THEN 1 END) as lost_picks,
      COUNT(CASE WHEN result = 'push' THEN 1 END) as push_picks,
      COUNT(CASE WHEN result = 'void' THEN 1 END) as void_picks,
      COALESCE(SUM(stake), 0) as total_stake,
      COALESCE(SUM(profit_loss), 0) as total_profit_loss,
      COUNT(CASE WHEN closing_odds IS NOT NULL THEN 1 END) as picks_with_clv
    FROM picks
  `).get() as Record<string, unknown>;

  const totalPicks = Number(stats.total_picks);
  const settledPicks = Number(stats.settled_picks);
  const wonPicks = Number(stats.won_picks);
  const totalStake = Number(stats.total_stake);
  const totalProfitLoss = Number(stats.total_profit_loss);
  const picksWithClv = Number(stats.picks_with_clv);

  const winRate = settledPicks > 0 ? (wonPicks / settledPicks) * 100 : 0;
  const roi = totalStake > 0 ? (totalProfitLoss / totalStake) * 100 : 0;

  let avgClvPercent: number | null = null;
  if (picksWithClv > 0) {
    const clvStats = db.prepare(`
      SELECT AVG((recommended_odds / closing_odds - 1) * 100) as avg_clv
      FROM picks
      WHERE closing_odds IS NOT NULL AND closing_odds > 1
    `).get() as Record<string, unknown>;
    avgClvPercent = clvStats.avg_clv !== null ? Number(clvStats.avg_clv) : null;
  }

  return {
    total_picks: totalPicks,
    settled_picks: settledPicks,
    won_picks: wonPicks,
    lost_picks: Number(stats.lost_picks),
    push_picks: Number(stats.push_picks),
    void_picks: Number(stats.void_picks),
    win_rate: Math.round(winRate * 100) / 100,
    total_stake: totalStake,
    total_profit_loss: totalProfitLoss,
    roi: Math.round(roi * 100) / 100,
    avg_clv_percent: avgClvPercent !== null ? Math.round(avgClvPercent * 100) / 100 : null,
    picks_with_clv: picksWithClv,
  };
}

export function getAnalyticsByAgent(): AnalyticsByAgent[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      p.agent_id,
      COALESCE(a.name, p.created_by) as agent_name,
      COUNT(*) as total_picks,
      COUNT(CASE WHEN p.result IS NOT NULL THEN 1 END) as settled_picks,
      COUNT(CASE WHEN p.result = 'won' THEN 1 END) as won_picks,
      COALESCE(SUM(p.profit_loss), 0) as total_profit_loss
    FROM picks p
    LEFT JOIN agents a ON p.agent_id = a.id
    GROUP BY p.agent_id, COALESCE(a.name, p.created_by)
    ORDER BY total_profit_loss DESC
  `).all() as Record<string, unknown>[];

  return rows.map((row) => {
    const settledPicks = Number(row.settled_picks);
    const wonPicks = Number(row.won_picks);
    const winRate = settledPicks > 0 ? (wonPicks / settledPicks) * 100 : 0;

    const agentId = row.agent_id as string | null;
    let avgClvPercent: number | null = null;

    if (agentId) {
      const clvStats = db.prepare(`
        SELECT AVG((recommended_odds / closing_odds - 1) * 100) as avg_clv
        FROM picks
        WHERE agent_id = ? AND closing_odds IS NOT NULL AND closing_odds > 1
      `).get(agentId) as Record<string, unknown>;
      avgClvPercent = clvStats.avg_clv !== null ? Number(clvStats.avg_clv) : null;
    } else {
      const clvStats = db.prepare(`
        SELECT AVG((recommended_odds / closing_odds - 1) * 100) as avg_clv
        FROM picks
        WHERE agent_id IS NULL AND closing_odds IS NOT NULL AND closing_odds > 1
      `).get() as Record<string, unknown>;
      avgClvPercent = clvStats.avg_clv !== null ? Number(clvStats.avg_clv) : null;
    }

    return {
      agent_id: agentId,
      agent_name: row.agent_name as string,
      total_picks: Number(row.total_picks),
      settled_picks: settledPicks,
      won_picks: wonPicks,
      win_rate: Math.round(winRate * 100) / 100,
      total_profit_loss: Number(row.total_profit_loss),
      avg_clv_percent: avgClvPercent !== null ? Math.round(avgClvPercent * 100) / 100 : null,
    };
  });
}

export function getAnalyticsByMarket(): AnalyticsByMarket[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      market,
      COUNT(*) as total_picks,
      COUNT(CASE WHEN result IS NOT NULL THEN 1 END) as settled_picks,
      COUNT(CASE WHEN result = 'won' THEN 1 END) as won_picks,
      COALESCE(SUM(profit_loss), 0) as total_profit_loss
    FROM picks
    GROUP BY market
    ORDER BY total_picks DESC
  `).all() as Record<string, unknown>[];

  return rows.map((row) => {
    const settledPicks = Number(row.settled_picks);
    const wonPicks = Number(row.won_picks);
    return {
      market: row.market as string,
      total_picks: Number(row.total_picks),
      settled_picks: settledPicks,
      won_picks: wonPicks,
      win_rate: settledPicks > 0 ? Math.round((wonPicks / settledPicks) * 10000) / 100 : 0,
      total_profit_loss: Number(row.total_profit_loss),
    };
  });
}

export function getAnalyticsByCompetition(): AnalyticsByCompetition[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      COALESCE(competition, 'Unknown') as competition,
      COUNT(*) as total_picks,
      COUNT(CASE WHEN result IS NOT NULL THEN 1 END) as settled_picks,
      COUNT(CASE WHEN result = 'won' THEN 1 END) as won_picks,
      COALESCE(SUM(profit_loss), 0) as total_profit_loss
    FROM picks
    GROUP BY COALESCE(competition, 'Unknown')
    ORDER BY total_picks DESC
  `).all() as Record<string, unknown>[];

  return rows.map((row) => {
    const settledPicks = Number(row.settled_picks);
    const wonPicks = Number(row.won_picks);
    return {
      competition: row.competition as string,
      total_picks: Number(row.total_picks),
      settled_picks: settledPicks,
      won_picks: wonPicks,
      win_rate: settledPicks > 0 ? Math.round((wonPicks / settledPicks) * 10000) / 100 : 0,
      total_profit_loss: Number(row.total_profit_loss),
    };
  });
}

export function getDailyPnL(): DailyPnlPoint[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      DATE(match_date) as date,
      COALESCE(SUM(profit_loss), 0) as profit_loss,
      COUNT(*) as picks_count
    FROM picks
    WHERE result IS NOT NULL
    GROUP BY DATE(match_date)
    ORDER BY date ASC
  `).all() as Record<string, unknown>[];

  return rows.map((row) => ({
    date: row.date as string,
    profit_loss: Number(row.profit_loss),
    picks_count: Number(row.picks_count),
  }));
}
