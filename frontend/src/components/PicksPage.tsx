import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPicks, createPick, deletePick, setResult, setClosingLine, getAgents, Pick, Agent } from '../lib/api';
import { ActivityFeed } from './ActivityFeed';

export function PicksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [filters, setFilters] = useState({ unsettled_only: false, agent_id: '' as string });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const { data: picks = [], isLoading } = useQuery({
    queryKey: ['picks', filters],
    queryFn: () => getPicks({
      unsettled_only: filters.unsettled_only,
      agent_id: filters.agent_id || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Pick, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'clv_percent' | 'agent_id' | 'raw_agent_payload'>) => createPick(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picks'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePick(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['picks'] }),
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, result }: { id: string; result: string }) => setResult(id, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['picks'] }),
  });

  const closingLineMutation = useMutation({
    mutationFn: ({ id, closing_odds }: { id: string; closing_odds: number }) =>
      setClosingLine(id, closing_odds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['picks'] }),
  });

  const getAgentName = (agentId: string | null, createdBy: string): string => {
    if (!agentId) return createdBy || '-';
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || createdBy || '-';
  };

  // Generate a consistent hue from agent name for color coding
  const getAgentHue = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Picks</h2>
          <div className="flex gap-2 items-center">
            <select
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={filters.agent_id}
              onChange={(e) => setFilters((f) => ({ ...f, agent_id: e.target.value }))}
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters((f) => ({ ...f, unsettled_only: !f.unsettled_only }))}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filters.unsettled_only
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unsettled Only
            </button>
            <Link
              to="/analytics"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              View Analytics
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              {showForm ? 'Cancel' : '+ New Pick'}
            </button>
          </div>
        </div>

        {showForm && <PickForm onSubmit={(data) => createMutation.mutate(data)} />}

        {isLoading ? (
          <div className="mt-6 text-muted-foreground">Loading picks...</div>
        ) : picks.length === 0 ? (
          <div className="mt-6 rounded-lg border border-border p-8 text-center text-muted-foreground">
            No picks yet. Add your first pick above.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Match</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Market</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Selection</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Odds</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">CLV%</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stake</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Result</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">P/L</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Agent</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {picks.map((pick) => {
                  const agentName = getAgentName(pick.agent_id, pick.created_by);
                  const hue = getAgentHue(agentName);
                  return (
                    <PickRow
                      key={pick.id}
                      pick={pick}
                      agentName={agentName}
                      agentHue={hue}
                      onDelete={() => deleteMutation.mutate(pick.id)}
                      onSettle={(result) => settleMutation.mutate({ id: pick.id, result })}
                      onSetClosingLine={(closing_odds) => closingLineMutation.mutate({ id: pick.id, closing_odds })}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Sidebar */}
      {showActivity ? (
        <aside className="shrink-0 w-72">
          <div className="flex flex-col h-[calc(100vh-6rem)] sticky top-4">
            <div className="flex items-center justify-between rounded-t-lg border border-border border-t-0 bg-card px-3 py-2 shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Activity</span>
              <button
                onClick={() => setShowActivity(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-b-lg border border-border bg-card p-2">
              <ActivityFeed limit={30} />
            </div>
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setShowActivity(true)}
          className="shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ☰ Activity
        </button>
      )}
    </div>
  );
}

function PickForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [form, setForm] = useState({
    match_date: '',
    home_team: '',
    away_team: '',
    competition: '',
    market: 'Moneyline',
    selection: '',
    recommended_odds: 2.0,
    stake: 1,
    notes: '',
    source: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-6 gap-3 rounded-lg border border-border bg-card p-4">
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Match Date</label>
        <input
          type="datetime-local"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.match_date}
          onChange={(e) => setForm({ ...form, match_date: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Home</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.home_team}
          onChange={(e) => setForm({ ...form, home_team: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Away</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.away_team}
          onChange={(e) => setForm({ ...form, away_team: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Competition</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.competition}
          onChange={(e) => setForm({ ...form, competition: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Market</label>
        <select
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.market}
          onChange={(e) => setForm({ ...form, market: e.target.value })}
        >
          <option>Moneyline</option>
          <option>Spread</option>
          <option>Over</option>
          <option>Under</option>
          <option>Player Props</option>
          <option>Other</option>
        </select>
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Selection</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.selection}
          onChange={(e) => setForm({ ...form, selection: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Odds</label>
        <input
          type="number"
          step="0.01"
          min="1.01"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.recommended_odds}
          onChange={(e) => setForm({ ...form, recommended_odds: parseFloat(e.target.value) })}
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Stake</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.stake}
          onChange={(e) => setForm({ ...form, stake: parseFloat(e.target.value) })}
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs text-muted-foreground">Source</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </div>
      <div className="col-span-4">
        <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="col-span-2 flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Add Pick
        </button>
      </div>
    </form>
  );
}

function PickRow({
  pick,
  agentName,
  agentHue,
  onDelete,
  onSettle,
  onSetClosingLine,
}: {
  pick: Pick;
  agentName: string;
  agentHue: number;
  onDelete: () => void;
  onSettle: (result: string) => void;
  onSetClosingLine: (closing_odds: number) => void;
}) {
  const [result, setResult] = useState('');
  const [editingClosing, setEditingClosing] = useState(false);
  const [closingValue, setClosingValue] = useState(pick.closing_odds?.toString() ?? '');

  const resultColor =
    pick.result === 'won'
      ? 'text-success'
      : pick.result === 'lost'
        ? 'text-destructive'
        : pick.result === 'push'
          ? 'text-warning'
          : pick.result === 'void'
            ? 'text-muted-foreground'
            : 'text-muted-foreground';

  const plColor =
    pick.profit_loss !== null && pick.profit_loss > 0
      ? 'text-success'
      : pick.profit_loss !== null && pick.profit_loss < 0
        ? 'text-destructive'
        : 'text-muted-foreground';

  const clvColor =
    pick.clv_percent !== null && pick.clv_percent > 0
      ? 'text-success'
      : pick.clv_percent !== null && pick.clv_percent < 0
        ? 'text-destructive'
        : 'text-muted-foreground';

  const handleSettle = (value: string) => {
    setResult(value);
    if (value) {
      onSettle(value);
    }
  };

  const handleClosingLineSubmit = () => {
    const val = parseFloat(closingValue);
    if (!isNaN(val) && val > 1) {
      onSetClosingLine(val);
    }
    setEditingClosing(false);
  };

  const handleClosingLineCancel = () => {
    setClosingValue(pick.closing_odds?.toString() ?? '');
    setEditingClosing(false);
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="px-3 py-2 text-muted-foreground">{new Date(pick.match_date).toLocaleDateString()}</td>
      <td className="px-3 py-2">
        {pick.home_team} vs {pick.away_team}
        {pick.competition && (
          <span className="ml-1 text-xs text-muted-foreground">({pick.competition})</span>
        )}
      </td>
      <td className="px-3 py-2">{pick.market}</td>
      <td className="px-3 py-2">{pick.selection}</td>
      <td className="px-3 py-2 text-right font-mono">{pick.recommended_odds.toFixed(2)}</td>
      <td className={`px-3 py-2 text-right font-mono ${clvColor}`}>
        {pick.clv_percent !== null ? `${pick.clv_percent.toFixed(1)}%` : '-'}
      </td>
      <td className="px-3 py-2 text-right font-mono">{pick.stake}</td>
      <td className="px-3 py-2 text-center">
        {pick.result ? (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${resultColor}`}>
            {pick.result}
          </span>
        ) : (
          <select
            className="rounded border border-input bg-background px-1 py-0.5 text-xs"
            value={result}
            onChange={(e) => handleSettle(e.target.value)}
          >
            <option value="">Settle</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="push">Push</option>
            <option value="void">Void</option>
          </select>
        )}
      </td>
      <td className={`px-3 py-2 text-right font-mono ${plColor}`}>
        {pick.profit_loss !== null ? (pick.profit_loss >= 0 ? '+' : '') + pick.profit_loss.toFixed(2) : '-'}
      </td>
      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{pick.source || '-'}</td>
      <td className="px-3 py-2 text-center">
        <span
          className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
            color: `hsl(${agentHue}, 60%, 30%)`,
          }}
          title={agentName}
        >
          {agentName}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          {editingClosing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="1.01"
                className="w-16 rounded border border-input bg-background px-1 py-0.5 text-xs font-mono"
                value={closingValue}
                onChange={(e) => setClosingValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClosingLineSubmit();
                  if (e.key === 'Escape') handleClosingLineCancel();
                }}
              />
              <button onClick={handleClosingLineSubmit} className="text-xs text-success hover:underline">✓</button>
              <button onClick={handleClosingLineCancel} className="text-xs text-muted-foreground hover:underline">✕</button>
            </div>
          ) : (
            <span
              className="cursor-pointer font-mono text-xs hover:underline"
              onClick={() => setEditingClosing(true)}
              title="Click to edit closing line"
            >
              {pick.closing_odds !== null ? pick.closing_odds.toFixed(2) : '-'}
            </span>
          )}
          <button
            onClick={onDelete}
            className="text-xs text-destructive hover:underline"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
