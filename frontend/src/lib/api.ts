const API_BASE = '/api';

export interface Pick {
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
  clv_percent: number | null;
}

export interface Agent {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_active_at: string | null;
}

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

// --- Auth ---

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    credentials: 'include',
  });
  if (!res.ok) return false;
  return true;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function checkAuth(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/agents`, { credentials: 'include' });
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
  if (filters?.source) params.set('source', filters.source);
  if (filters?.competition) params.set('competition', filters.competition);
  if (filters?.result) params.set('result', filters.result);
  if (filters?.team) params.set('team', filters.team);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.unsettled_only) params.set('unsettled_only', 'true');
  if (filters?.agent_id) params.set('agent_id', filters.agent_id);

  const res = await fetch(`${API_BASE}/admin/picks?${params}`, { credentials: 'include' });
  const data = await res.json();
  return data.picks;
}

export async function createPick(pick: Omit<Pick, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'clv_percent' | 'agent_id' | 'raw_agent_payload'>): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(pick),
  });
  const data = await res.json();
  return data.pick;
}

export async function updatePick(id: string, data: Partial<Pick>): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.pick;
}

export async function setClosingLine(id: string, closing_odds: number): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}/closing-line`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ closing_odds }),
  });
  const data = await res.json();
  return data.pick;
}

export async function setResult(id: string, result: string): Promise<Pick> {
  const res = await fetch(`${API_BASE}/admin/picks/${id}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ result }),
  });
  const data = await res.json();
  return data.pick;
}

export async function deletePick(id: string): Promise<void> {
  await fetch(`${API_BASE}/admin/picks/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// --- Agents ---

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/admin/agents`, { credentials: 'include' });
  const data = await res.json();
  return data.agents;
}

export async function createAgent(name: string): Promise<{ agent: Agent; key: string }> {
  const res = await fetch(`${API_BASE}/admin/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function updateAgent(id: string, data: { name?: string; is_active?: boolean }): Promise<Agent> {
  const res = await fetch(`${API_BASE}/admin/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.agent;
}

export async function rotateAgentKey(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/agents/${id}/rotate-key`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  return data.key;
}

export async function deleteAgent(id: string): Promise<void> {
  await fetch(`${API_BASE}/admin/agents/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// --- Analytics ---

export async function getAnalytics(): Promise<AnalyticsResult> {
  const res = await fetch(`${API_BASE}/admin/analytics`, { credentials: 'include' });
  const data = await res.json();
  return data.analytics;
}

export async function getAnalyticsByAgent(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-agent`, { credentials: 'include' });
  const data = await res.json();
  return data.data;
}

export async function getAnalyticsByMarket(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-market`, { credentials: 'include' });
  const data = await res.json();
  return data.data;
}

export async function getAnalyticsByCompetition(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/by-competition`, { credentials: 'include' });
  const data = await res.json();
  return data.data;
}

export async function getDailyPnL(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/analytics/daily-pnl`, { credentials: 'include' });
  const data = await res.json();
  return data.data;
}

// --- Export ---

export function downloadCsv(): void {
  const url = `${API_BASE}/admin/export/csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'picks.csv';
  // Need to trigger with credentials - use fetch instead
  fetch(url, { credentials: 'include' })
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
