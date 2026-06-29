import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPicks, createPick, deletePick, setResult, setClosingLine, getAgents, Pick, Agent } from '../lib/api';
import { ActivityFeed } from './ActivityFeed';

export function PicksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
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

  // Close mobile sidebar on escape
  useEffect(() => {
    if (!showActivity) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActivity(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showActivity]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Picks</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <select
              className="rounded-md border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
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
              className={`rounded-md px-3 py-2 text-sm min-h-[44px] ${
                filters.unsettled_only
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unsettled
            </button>
          </div>
          <div className="flex gap-2">
            <Link
              to="/analytics"
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 min-h-[44px]"
            >
              Analytics
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 min-h-[44px]"
            >
              {showForm ? 'Cancel' : '+ New Pick'}
            </button>
          </div>
        </div>
      </div>

      {showForm && <PickForm onSubmit={(data) => createMutation.mutate(data)} />}

      {/* Picks content */}
      {isLoading ? (
        <div className="mt-6 text-muted-foreground">Loading picks...</div>
      ) : picks.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border p-8 text-center text-muted-foreground">
          No picks yet. Add your first pick above.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="mt-4 space-y-3 md:hidden">
            {picks.map((pick) => {
              const agentName = getAgentName(pick.agent_id, pick.created_by);
              const hue = getAgentHue(agentName);
              return (
                <PickCard
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
          </div>

          {/* Desktop: table */}
          <div className="mt-6 hidden md:block overflow-x-auto rounded-lg border border-border">
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
        </>
      )}

      {/* Activity toggle button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          {showActivity ? '✕ Close Activity' : '☰ Activity'}
        </button>
      </div>

      {/* Mobile: slide-out overlay sidebar */}
      {showActivity && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowActivity(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l border-border flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-3 py-3 shrink-0">
              <span className="text-sm font-medium">Activity</span>
              <button
                onClick={() => setShowActivity(false)}
                className="rounded p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <ActivityFeed limit={30} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop: side panel sidebar */}
      {showActivity && (
        <div className="hidden md:fixed md:right-4 md:top-20 md:bottom-4 md:w-72 md:z-40">
          <div className="flex flex-col h-full rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0 bg-card">
              <span className="text-sm font-medium text-muted-foreground">Activity</span>
              <button
                onClick={() => setShowActivity(false)}
                className="rounded p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <ActivityFeed limit={30} />
            </div>
          </div>
        </div>
      )}
    </>
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
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Match Date</label>
        <input
          type="datetime-local"
          required
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.match_date}
          onChange={(e) => setForm({ ...form, match_date: e.target.value })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Home</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.home_team}
          onChange={(e) => setForm({ ...form, home_team: e.target.value })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Away</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.away_team}
          onChange={(e) => setForm({ ...form, away_team: e.target.value })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Competition</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.competition}
          onChange={(e) => setForm({ ...form, competition: e.target.value })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Market</label>
        <select
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
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
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Selection</label>
        <input
          type="text"
          required
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.selection}
          onChange={(e) => setForm({ ...form, selection: e.target.value })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Odds</label>
        <input
          type="number"
          step="0.01"
          min="1.01"
          required
          inputMode="decimal"
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.recommended_odds}
          onChange={(e) => setForm({ ...form, recommended_odds: parseFloat(e.target.value) })}
        />
      </div>
      <div className="md:col-span-1">
        <label className="mb-1 block text-xs text-muted-foreground">Stake</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          inputMode="decimal"
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.stake}
          onChange={(e) => setForm({ ...form, stake: parseFloat(e.target.value) })}
        />
      </div>
      <div className="sm:col-span-1 md:col-span-2">
        <label className="mb-1 block text-xs text-muted-foreground">Source</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2 md:col-span-4">
        <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
        <input
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="sm:col-span-4 md:col-span-2 flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 min-h-[44px]"
        >
          Add Pick
        </button>
      </div>
    </form>
  );
}

// Mobile card view for picks
function PickCard({
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
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Header: match + date */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">
            {pick.home_team} vs {pick.away_team}
          </div>
          <div className="text-xs text-muted-foreground">
            {pick.competition && `${pick.competition} · `}
            {pick.market} · {new Date(pick.match_date).toLocaleDateString()}
          </div>
        </div>
        <span
          className="shrink-0 rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
            color: `hsl(${agentHue}, 60%, 30%)`,
          }}
        >
          {agentName}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Selection</div>
        <div>{pick.selection}</div>
        <div className="text-muted-foreground">Odds</div>
        <div className="font-mono">{pick.recommended_odds.toFixed(2)}</div>
        <div className="text-muted-foreground">CLV%</div>
        <div className={`font-mono ${clvColor}`}>
          {pick.clv_percent !== null ? `${pick.clv_percent.toFixed(1)}%` : '-'}
        </div>
        <div className="text-muted-foreground">Stake</div>
        <div className="font-mono">{pick.stake}</div>
        <div className="text-muted-foreground">P/L</div>
        <div className={`font-mono ${plColor}`}>
          {pick.profit_loss !== null
            ? (pick.profit_loss >= 0 ? '+' : '') + pick.profit_loss.toFixed(2)
            : '-'}
        </div>
      </div>

      {/* Result badge or settle dropdown */}
      {pick.result ? (
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium min-h-[44px] flex items-center ${resultColor}`}>
            {pick.result}
          </span>
        </div>
      ) : (
        <select
          className="rounded border border-input bg-background px-2 py-2 text-sm min-h-[44px] w-full"
          value={result}
          onChange={(e) => handleSettle(e.target.value)}
        >
          <option value="">Settle...</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="push">Push</option>
          <option value="void">Void</option>
        </select>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        {editingClosing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              step="0.01"
              min="1.01"
              className="flex-1 rounded border border-input bg-background px-2 py-2 text-sm font-mono min-h-[44px]"
              value={closingValue}
              onChange={(e) => setClosingValue(e.target.value)}
              autoFocus
              inputMode="decimal"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClosingLineSubmit();
                if (e.key === 'Escape') handleClosingLineCancel();
              }}
            />
            <button onClick={handleClosingLineSubmit} className="rounded px-3 py-2 text-sm text-success min-h-[44px] min-w-[44px]">✓</button>
            <button onClick={handleClosingLineCancel} className="rounded px-3 py-2 text-sm text-muted-foreground min-h-[44px] min-w-[44px]">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setEditingClosing(true)}
            className="rounded px-3 py-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
            title="Edit closing line"
          >
            CL: {pick.closing_odds !== null ? pick.closing_odds.toFixed(2) : '-'}
          </button>
        )}
        <button
          onClick={onDelete}
          className="ml-auto rounded px-3 py-2 text-sm text-destructive hover:bg-destructive/10 min-h-[44px]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Desktop table row (unchanged logic, touch-target improvements)
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
