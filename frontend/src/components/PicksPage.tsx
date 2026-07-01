import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPicks, createPick, updatePick, deletePick, setResult, setClosingLine, unsetPick, getAgents, Pick, Agent } from '../lib/api';
import { toast } from 'sonner';
import { ActivityFeed } from './ActivityFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, X, Activity, MoreVertical, Trash2, ChevronDown, RotateCcw, Pencil, Save } from 'lucide-react';

export function PicksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [unsetId, setUnsetId] = useState<string | null>(null);
  const [editPick, setEditPick] = useState<Pick | null>(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picks'] });
      setDeleteId(null);
    },
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

  const unsetMutation = useMutation({
    mutationFn: (id: string) => unsetPick(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picks'] });
      setUnsetId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick> }) => updatePick(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picks'] });
      setEditPick(null);
      toast.success('Pick updated');
    },
  });

  const getAgentName = (agentId: string | null, createdBy: string): string => {
    if (!agentId) return createdBy || '-';
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || createdBy || '-';
  };

  const getAgentHue = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  useEffect(() => {
    if (!showActivity) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActivity(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showActivity]);

  const handleDelete = (id: string) => () => {
    deleteMutation.mutate(id);
    setDeleteId(null);
  };

  const handleUnset = (id: string) => () => {
    unsetMutation.mutate(id);
    setUnsetId(null);
  };

  const pickToDelete = picks.find((p) => p.id === deleteId);
  const pickToUnset = picks.find((p) => p.id === unsetId);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Picks</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2 items-center">
            <Select
              value={filters.agent_id || '__all__'}
              onValueChange={(val) => setFilters((f) => ({ ...f, agent_id: val === '__all__' ? '' : val }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="unsettled-filter"
                checked={filters.unsettled_only}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, unsettled_only: !!checked }))}
              />
              <Label htmlFor="unsettled-filter" className="text-sm cursor-pointer">
                Unsettled
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/analytics">Analytics</Link>
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 size-4" /> New Pick
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>New Pick</DialogTitle>
                </DialogHeader>
                <PickForm onSubmit={(data) => createMutation.mutate(data)} />
              </DialogContent>
            </Dialog>
            <Dialog open={editPick !== null} onOpenChange={(open) => !open && setEditPick(null)}>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Pick</DialogTitle>
                </DialogHeader>
                {editPick && (
                  <PickForm
                    pick={editPick}
                    onSubmit={(data) => updateMutation.mutate({ id: editPick.id, data })}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Picks content */}
      {isLoading ? (
        <div className="mt-6 text-muted-foreground">Loading picks...</div>
      ) : picks.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
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
                  onDelete={() => setDeleteId(pick.id)}
                  onUnset={() => setUnsetId(pick.id)}
                  onEdit={() => setEditPick(pick)}
                  onSettle={(result) => settleMutation.mutate({ id: pick.id, result })}
                  onSetClosingLine={(closing_odds) => closingLineMutation.mutate({ id: pick.id, closing_odds })}
                />
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="mt-6 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Date</TableHead>
                  <TableHead className="min-w-[140px] max-w-[200px]">Match</TableHead>
                  <TableHead className="w-[70px]">Market</TableHead>
                  <TableHead className="min-w-[80px] max-w-[120px]">Selection</TableHead>
                  <TableHead className="w-[50px] text-right">Odds</TableHead>
                  <TableHead className="w-[50px] text-right">CLV%</TableHead>
                  <TableHead className="w-[50px] text-right">Stake</TableHead>
                  <TableHead className="w-[90px] text-center">Result</TableHead>
                  <TableHead className="w-[60px] text-right">P/L</TableHead>
                  <TableHead className="w-[50px] text-center">Source</TableHead>
                  <TableHead className="w-[60px] text-center">Agent</TableHead>
                  <TableHead className="w-[50px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picks.map((pick) => {
                  const agentName = getAgentName(pick.agent_id, pick.created_by);
                  const hue = getAgentHue(agentName);
                  return (
                    <PickRow
                      key={pick.id}
                      pick={pick}
                      agentName={agentName}
                      agentHue={hue}
                      onDelete={() => setDeleteId(pick.id)}
                      onUnset={() => setUnsetId(pick.id)}
                      onEdit={() => setEditPick(pick)}
                      onSettle={(result) => settleMutation.mutate({ id: pick.id, result })}
                      onSetClosingLine={(closing_odds) => closingLineMutation.mutate({ id: pick.id, closing_odds })}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Activity toggle button */}
      <div className="mt-4 flex justify-end">
        <Dialog open={showActivity} onOpenChange={setShowActivity}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {showActivity ? <X className="mr-1 size-4" /> : <Activity className="mr-1 size-4" />}
              Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Activity
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowActivity(false)}
                >
                  <X className="size-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <ActivityFeed limit={30} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {pickToDelete
                ? `Delete "${pickToDelete.home_team} vs ${pickToDelete.away_team}"? This cannot be undone.`
                : 'Are you sure you want to delete this pick?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete(deleteId ?? '')}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsettle confirmation dialog */}
      <AlertDialog open={unsetId !== null} onOpenChange={(open) => !open && setUnsetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsettle Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {pickToUnset
                ? `Unsettle "${pickToUnset.home_team} vs ${pickToUnset.away_team}"? This will clear the result and P&L.`
                : 'Are you sure you want to unsettle this pick?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnset(unsetId ?? '')}>
              Unsettle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PickForm({ onSubmit, pick }: { onSubmit: (data: any) => void; pick?: Pick | null }) {
  const isEdit = !!pick;

  const formatDateForInput = (isoDate: string) => {
    const d = new Date(isoDate);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    match_date: isEdit ? formatDateForInput(pick!.match_date) : '',
    home_team: isEdit ? pick!.home_team : '',
    away_team: isEdit ? pick!.away_team : '',
    competition: isEdit ? (pick!.competition ?? '') : '',
    market: isEdit ? pick!.market : 'Moneyline',
    selection: isEdit ? pick!.selection : '',
    recommended_odds: isEdit ? pick!.recommended_odds : 2.0,
    stake: isEdit ? pick!.stake : 1,
    notes: isEdit ? (pick!.notes ?? '') : '',
    source: isEdit ? (pick!.source ?? '') : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3"
    >
      {isEdit && pick?.result && (
        <div className="col-span-full rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
          This pick is settled ({pick.result}). Editing will not clear the result.
        </div>
      )}
      <div className="md:col-span-1 space-y-2">
        <Label>Match Date</Label>
        <Input
          type="datetime-local"
          required
          value={form.match_date}
          onChange={(e) => setForm({ ...form, match_date: e.target.value })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Home</Label>
        <Input
          type="text"
          required
          value={form.home_team}
          onChange={(e) => setForm({ ...form, home_team: e.target.value })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Away</Label>
        <Input
          type="text"
          required
          value={form.away_team}
          onChange={(e) => setForm({ ...form, away_team: e.target.value })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Competition</Label>
        <Input
          type="text"
          value={form.competition}
          onChange={(e) => setForm({ ...form, competition: e.target.value })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Market</Label>
        <Select
          value={form.market}
          onValueChange={(val) => setForm({ ...form, market: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Moneyline">Moneyline</SelectItem>
            <SelectItem value="Spread">Spread</SelectItem>
            <SelectItem value="Over">Over</SelectItem>
            <SelectItem value="Under">Under</SelectItem>
            <SelectItem value="Player Props">Player Props</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Selection</Label>
        <Input
          type="text"
          required
          value={form.selection}
          onChange={(e) => setForm({ ...form, selection: e.target.value })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Odds</Label>
        <Input
          type="number"
          step="0.01"
          min="1.01"
          required
          inputMode="decimal"
          value={form.recommended_odds}
          onChange={(e) => setForm({ ...form, recommended_odds: parseFloat(e.target.value) })}
        />
      </div>
      <div className="md:col-span-1 space-y-2">
        <Label>Stake</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          required
          inputMode="decimal"
          value={form.stake}
          onChange={(e) => setForm({ ...form, stake: parseFloat(e.target.value) })}
        />
      </div>
      <div className="sm:col-span-1 md:col-span-2 space-y-2">
        <Label>Source</Label>
        <Input
          type="text"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2 md:col-span-4 space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional notes..."
        />
      </div>
      <div className="sm:col-span-4 md:col-span-2 flex items-end">
        <Button type="submit" className="w-full">
          {isEdit ? (
            <Save className="mr-1 size-4" />
          ) : (
            <Plus className="mr-1 size-4" />
          )}
          {isEdit ? 'Save Changes' : 'Add Pick'}
        </Button>
      </div>
    </form>
  );
}

function getResultVariant(result: string | null): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (result) {
    case 'won': return 'default';
    case 'lost': return 'destructive';
    case 'push': return 'outline';
    case 'void': return 'secondary';
    default: return 'outline';
  }
}

// Mobile card view for picks
function PickCard({
  pick,
  agentName,
  agentHue,
  onDelete,
  onUnset,
  onEdit,
  onSettle,
  onSetClosingLine,
}: {
  pick: Pick;
  agentName: string;
  agentHue: number;
  onDelete: () => void;
  onUnset: () => void;
  onEdit: () => void;
  onSettle: (result: string) => void;
  onSetClosingLine: (closing_odds: number) => void;
}) {
  const [result, setResult] = useState('');
  const [editingClosing, setEditingClosing] = useState(false);
  const [closingValue, setClosingValue] = useState(pick.closing_odds?.toString() ?? '');

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
    <Card>
      <CardContent className="pt-4 space-y-3">
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
          <Badge
            variant="outline"
            className="shrink-0"
            style={{
              backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
              color: `hsl(${agentHue}, 60%, 30%)`,
            }}
          >
            {agentName}
          </Badge>
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
          <Badge variant={getResultVariant(pick.result)}>
            {pick.result}
          </Badge>
        ) : (
          <Select value={result} onValueChange={handleSettle}>
            <SelectTrigger>
              <SelectValue placeholder="Settle..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {editingClosing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                step="0.01"
                min="1.01"
                className="font-mono"
                value={closingValue}
                onChange={(e) => setClosingValue(e.target.value)}
                autoFocus
                inputMode="decimal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClosingLineSubmit();
                  if (e.key === 'Escape') handleClosingLineCancel();
                }}
              />
              <Button variant="ghost" size="icon-sm" onClick={handleClosingLineSubmit}>✓</Button>
              <Button variant="ghost" size="icon-sm" onClick={handleClosingLineCancel}>✕</Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingClosing(true)}
              title="Edit closing line"
            >
              CL: {pick.closing_odds !== null ? pick.closing_odds.toFixed(2) : '-'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="ml-auto">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              {pick.result && (
                <DropdownMenuItem onClick={onUnset}>
                  <RotateCcw className="size-4" /> Unsettle
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Desktop table row
function PickRow({
  pick,
  agentName,
  agentHue,
  onDelete,
  onUnset,
  onEdit,
  onSettle,
  onSetClosingLine,
}: {
  pick: Pick;
  agentName: string;
  agentHue: number;
  onDelete: () => void;
  onUnset: () => void;
  onEdit: () => void;
  onSettle: (result: string) => void;
  onSetClosingLine: (closing_odds: number) => void;
}) {
  const [result, setResult] = useState('');
  const [editingClosing, setEditingClosing] = useState(false);
  const [closingValue, setClosingValue] = useState(pick.closing_odds?.toString() ?? '');

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
    <TableRow>
      <TableCell className="text-muted-foreground">{new Date(pick.match_date).toLocaleDateString()}</TableCell>
      <TableCell className="min-w-[140px] max-w-[200px] whitespace-normal">
        {pick.home_team} vs {pick.away_team}
        {pick.competition && (
          <span className="ml-1 text-xs text-muted-foreground">({pick.competition})</span>
        )}
      </TableCell>
      <TableCell>{pick.market}</TableCell>
      <TableCell className="max-w-[120px] whitespace-normal">{pick.selection}</TableCell>
      <TableCell className="text-right font-mono">{pick.recommended_odds.toFixed(2)}</TableCell>
      <TableCell className={`text-right font-mono ${clvColor}`}>
        {pick.clv_percent !== null ? `${pick.clv_percent.toFixed(1)}%` : '-'}
      </TableCell>
      <TableCell className="text-right font-mono">{pick.stake}</TableCell>
      <TableCell className="text-center">
        {pick.result ? (
          <Badge variant={getResultVariant(pick.result)}>{pick.result}</Badge>
        ) : (
          <Select value={result} onValueChange={handleSettle}>
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="Settle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className={`text-right font-mono ${plColor}`}>
        {pick.profit_loss !== null ? (pick.profit_loss >= 0 ? '+' : '') + pick.profit_loss.toFixed(2) : '-'}
      </TableCell>
      <TableCell className="text-center text-xs text-muted-foreground">{pick.source || '-'}</TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          style={{
            backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
            color: `hsl(${agentHue}, 60%, 30%)`,
          }}
          title={agentName}
        >
          {agentName}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {editingClosing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                min="1.01"
                className="w-20 font-mono"
                value={closingValue}
                onChange={(e) => setClosingValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClosingLineSubmit();
                  if (e.key === 'Escape') handleClosingLineCancel();
                }}
              />
              <Button variant="ghost" size="icon-xs" onClick={handleClosingLineSubmit}>✓</Button>
              <Button variant="ghost" size="icon-xs" onClick={handleClosingLineCancel}>✕</Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="font-mono h-auto px-1.5 text-xs"
              onClick={() => setEditingClosing(true)}
              title="Click to edit closing line"
            >
              {pick.closing_odds !== null ? pick.closing_odds.toFixed(2) : '-'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              {pick.result && (
                <DropdownMenuItem onClick={onUnset}>
                  <RotateCcw className="size-4" /> Unsettle
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
