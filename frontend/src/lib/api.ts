const API_BASE = "/api";

export interface Pick {
  agent_id: string | null;
  away_team: string;
  closing_odds: number | null;
  clv_percent: number | null;
  competition: string | null;
  created_at: string;
  created_by: string;
  home_team: string;
  id: string;
  market: string;
  match_date: string;
  notes: string | null;
  profit_loss: number | null;
  raw_agent_payload: string | null;
  recommended_odds: number;
  result: string | null;
  selection: string;
  source: string | null;
  stake: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Agent {
  created_at: string;
  id: string;
  is_active: boolean;
  key_prefix: string;
  last_active_at: string | null;
  name: string;
}

export interface ActivityLog {
  action: string;
  agent_id: string | null;
  created_at: string;
  details: string | null;
  id: string;
  pick_id: string | null;
}

export interface AnalyticsResult {
  avg_clv_percent: number | null;
  lost_picks: number;
  picks_with_clv: number;
  push_picks: number;
  roi: number;
  settled_picks: number;
  total_picks: number;
  total_profit_loss: number;
  total_stake: number;
  void_picks: number;
  win_rate: number;
  won_picks: number;
}

export interface AgentAnalytics {
  agent_id: string | null;
  agent_name: string;
  avg_clv_percent: number | null;
  total_picks: number;
  total_profit_loss: number;
  win_rate: number;
}

export interface MarketAnalytics {
  market: string;
  total_picks: number;
  total_profit_loss: number;
  win_rate: number;
}

export interface CompetitionAnalytics {
  competition: string | null;
  total_picks: number;
  total_profit_loss: number;
  win_rate: number;
}

export interface DailyPnl {
  date: string;
  profit_loss: number;
}

// --- Auth ---

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    credentials: "include",
  });
  if (!res.ok) {
    return false;
  }
  return true;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function checkAuth(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/agents`, {
    credentials: "include",
  });
  return res.ok;
}

// --- Picks ---

export async function getPicks(filters?: {
  source?: string;
  competition?: string;
  result?: string;
  team?: string;
  date_from?: string;
  date_to?: string;
  unsettled_only?: boolean;
  agent_id?: string;
}): Promise<Pick[]> {
  const params = new URLSearchParams();
  if (filters?.source) {
    params.set("source", filters.source);
  }
  if (filters?.competition) {
    params.set("competition", filters.competition);
  }
  if (filters?.result) {
    params.set("result", filters.result);
  }
  if (filters?.team) {
    params.set("team", filters.team);
  }
  if (filters?.date_from) {
    params.set("date_from", filters.date_from);
  }
  if (filters?.date_to) {
    params.set("date_to", filters.date_to);
  }
  if (filters?.unsettled_only) {
    params.set("unsettled_only", "true");
  }
  if (filters?.agent_id) {
    params.set("agent_id", filters.agent_id);
  }

  const res = await fetch(`${API_BASE}/admin/picks?${params}`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.picks;
}

export async function createPick(
  pick: Omit<
    Pick,
    | "id"
    | "created_at"
    | "updated_at"
    | "created_by"
    | "updated_by"
    | "clv_percent"
    | "agent_id"
    | "raw_agent_payload"
    | "closing_odds"
    | "result"
    | "profit_loss"
  >
): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(pick),
  });
  const data = await res.json();
  return data.pick;
}

export async function updatePick(
  id: string,
  data: Partial<Pick>
): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.pick;
}

export async function setClosingLine(
  id: string,
  closing_odds: number
): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}/closing-line`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ closing_odds }),
  });
  const data = await res.json();
  return data.pick;
}

export async function setResult(id: string, result: string): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}/result`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ result }),
  });
  const data = await res.json();
  return data.pick;
}

export async function unsetPick(id: string): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}/unsettle`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  return data.pick;
}

export async function deletePick(id: string): Promise<void> {
  await fetch(`${API_BASE}/admin/picks/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// --- Agents ---

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/admin/agents`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.agents;
}

export async function createAgent(
  name: string
): Promise<{ agent: Agent; key: string }> {
  const res = await fetch(`${API_BASE}/admin/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function updateAgent(
  id: string,
  data: { name?: string; is_active?: boolean }
): Promise<Agent> {
  const res = await fetch(`${API_BASE}/admin/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.agent;
}

export async function rotateAgentKey(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/agents/${id}/rotate-key`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  return data.key;
}

export async function deleteAgent(id: string): Promise<void> {
  await fetch(`${API_BASE}/admin/agents/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

// --- Analytics ---

export async function getAnalytics(): Promise<AnalyticsResult> {
  const res = await fetch(`${API_BASE}/admin/analytics`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.analytics;
}

export async function getAnalyticsByAgent(): Promise<AgentAnalytics[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-agent`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.data;
}

export async function getAnalyticsByMarket(): Promise<MarketAnalytics[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-market`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.data;
}

export async function getAnalyticsByCompetition(): Promise<
  CompetitionAnalytics[]
> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-competition`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.data;
}

export async function getDailyPnL(): Promise<DailyPnl[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/daily-pnl`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.data;
}

// --- Activity ---

export async function getActivity(filters?: {
  limit?: number;
  offset?: number;
  agent_id?: string;
  action?: string;
}): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (filters?.limit) {
    params.set("limit", filters.limit.toString());
  }
  if (filters?.offset) {
    params.set("offset", filters.offset.toString());
  }
  if (filters?.agent_id) {
    params.set("agent_id", filters.agent_id);
  }
  if (filters?.action) {
    params.set("action", filters.action);
  }

  const res = await fetch(`${API_BASE}/activity?${params}`, {
    credentials: "include",
  });
  const data = await res.json();
  return data.activities;
}

// --- Export ---

export function downloadCsv(): void {
  const url = `${API_BASE}/admin/export/csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = "picks.csv";
  // Need to trigger with credentials - use fetch instead
  fetch(url, { credentials: "include" })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
}
