import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createPick,
  deletePick,
  getAgents,
  getPicks,
  type Pick,
  setClosingLine,
  setResult,
  unsetPick,
  updatePick,
} from "../lib/api";
import { ActivityFeed } from "./ActivityFeed";

type PickFormData = Parameters<typeof createPick>[0];

export function PicksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [unsetId, setUnsetId] = useState<string | null>(null);
  const [editPick, setEditPick] = useState<Pick | null>(null);
  const [filters, setFilters] = useState({
    unsettled_only: false,
    agent_id: "" as string,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => getAgents(),
  });

  const { data: picks = [], isLoading } = useQuery({
    queryKey: ["picks", filters],
    queryFn: () =>
      getPicks({
        unsettled_only: filters.unsettled_only,
        agent_id: filters.agent_id || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: PickFormData) => createPick(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picks"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePick(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picks"] });
      setDeleteId(null);
    },
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, result }: { id: string; result: string }) =>
      setResult(id, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["picks"] }),
  });

  const closingLineMutation = useMutation({
    mutationFn: ({ id, closing_odds }: { id: string; closing_odds: number }) =>
      setClosingLine(id, closing_odds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["picks"] }),
  });

  const unsetMutation = useMutation({
    mutationFn: (id: string) => unsetPick(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picks"] });
      setUnsetId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick> }) =>
      updatePick(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["picks"] });
      setEditPick(null);
      toast.success("Pick updated");
    },
  });

  const getAgentName = (agentId: string | null, createdBy: string): string => {
    if (!agentId) {
      return createdBy || "-";
    }
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || createdBy || "-";
  };

  const getAgentHue = (name: string): number => {
    let hash = 0;
    for (const character of name) {
      // biome-ignore lint/suspicious/noBitwiseOperators: preserves existing agent badge color assignments
      hash = character.charCodeAt(0) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  useEffect(() => {
    if (!showActivity) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowActivity(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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
  let picksContent: ReactNode;
  if (isLoading) {
    picksContent = (
      <div className="mt-6 text-muted-foreground">Loading picks...</div>
    );
  } else if (picks.length === 0) {
    picksContent = (
      <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No picks yet. Add your first pick above.
      </div>
    );
  } else {
    picksContent = (
      <>
        {/* Mobile: card list */}
        <div className="mt-4 space-y-3 md:hidden">
          {picks.map((pick) => {
            const agentName = getAgentName(pick.agent_id, pick.created_by);
            const hue = getAgentHue(agentName);
            return (
              <PickCard
                agentHue={hue}
                agentName={agentName}
                key={pick.id}
                onDelete={() => setDeleteId(pick.id)}
                onEdit={() => setEditPick(pick)}
                onSetClosingLine={(closing_odds) =>
                  closingLineMutation.mutate({ id: pick.id, closing_odds })
                }
                onSettle={(result) =>
                  settleMutation.mutate({ id: pick.id, result })
                }
                onUnset={() => setUnsetId(pick.id)}
                pick={pick}
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
                <TableHead className="min-w-[140px] max-w-[200px]">
                  Match
                </TableHead>
                <TableHead className="w-[70px]">Market</TableHead>
                <TableHead className="min-w-[80px] max-w-[120px]">
                  Selection
                </TableHead>
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
                    agentHue={hue}
                    agentName={agentName}
                    key={pick.id}
                    onDelete={() => setDeleteId(pick.id)}
                    onEdit={() => setEditPick(pick)}
                    onSetClosingLine={(closing_odds) =>
                      closingLineMutation.mutate({
                        id: pick.id,
                        closing_odds,
                      })
                    }
                    onSettle={(result) =>
                      settleMutation.mutate({ id: pick.id, result })
                    }
                    onUnset={() => setUnsetId(pick.id)}
                    pick={pick}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-bold text-2xl">Picks</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(val) =>
                setFilters((f) => ({
                  ...f,
                  agent_id: val === "__all__" ? "" : val,
                }))
              }
              value={filters.agent_id || "__all__"}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.unsettled_only}
                id="unsettled-filter"
                onCheckedChange={(checked) =>
                  setFilters((f) => ({ ...f, unsettled_only: !!checked }))
                }
              />
              <Label
                className="cursor-pointer text-sm"
                htmlFor="unsettled-filter"
              >
                Unsettled
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/analytics">Analytics</Link>
            </Button>
            <Dialog onOpenChange={setShowForm} open={showForm}>
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
            <Dialog
              onOpenChange={(open) => !open && setEditPick(null)}
              open={editPick !== null}
            >
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Pick</DialogTitle>
                </DialogHeader>
                {editPick && (
                  <PickForm
                    onSubmit={(data) =>
                      updateMutation.mutate({ id: editPick.id, data })
                    }
                    pick={editPick}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Picks content */}
      {picksContent}

      {/* Activity toggle button */}
      <div className="mt-4 flex justify-end">
        <Dialog onOpenChange={setShowActivity} open={showActivity}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              {showActivity ? (
                <X className="mr-1 size-4" />
              ) : (
                <Activity className="mr-1 size-4" />
              )}
              Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Activity
                <Button
                  onClick={() => setShowActivity(false)}
                  size="icon-sm"
                  variant="ghost"
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
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteId(null)}
        open={deleteId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {pickToDelete
                ? `Delete "${pickToDelete.home_team} vs ${pickToDelete.away_team}"? This cannot be undone.`
                : "Are you sure you want to delete this pick?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete(deleteId ?? "")}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsettle confirmation dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setUnsetId(null)}
        open={unsetId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsettle Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {pickToUnset
                ? `Unsettle "${pickToUnset.home_team} vs ${pickToUnset.away_team}"? This will clear the result and P&L.`
                : "Are you sure you want to unsettle this pick?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnset(unsetId ?? "")}>
              Unsettle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatDateForInput(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function PickForm({
  onSubmit,
  pick,
}: {
  onSubmit: (data: PickFormData) => void;
  pick?: Pick | null;
}) {
  const isEdit = !!pick;
  const [form, setForm] = useState({
    match_date: pick ? formatDateForInput(pick.match_date) : "",
    home_team: pick?.home_team ?? "",
    away_team: pick?.away_team ?? "",
    competition: pick?.competition ?? "",
    market: pick?.market ?? "Moneyline",
    selection: pick?.selection ?? "",
    recommended_odds: pick?.recommended_odds ?? 2.0,
    stake: pick?.stake ?? 1,
    notes: pick?.notes ?? "",
    source: pick?.source ?? "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6"
      onSubmit={handleSubmit}
    >
      {isEdit && pick?.result && (
        <div className="col-span-full rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          This pick is settled ({pick.result}). Editing will not clear the
          result.
        </div>
      )}
      <div className="space-y-2 md:col-span-1">
        <Label>Match Date</Label>
        <Input
          onChange={(e) => setForm({ ...form, match_date: e.target.value })}
          required
          type="datetime-local"
          value={form.match_date}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Home</Label>
        <Input
          onChange={(e) => setForm({ ...form, home_team: e.target.value })}
          required
          type="text"
          value={form.home_team}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Away</Label>
        <Input
          onChange={(e) => setForm({ ...form, away_team: e.target.value })}
          required
          type="text"
          value={form.away_team}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Competition</Label>
        <Input
          onChange={(e) => setForm({ ...form, competition: e.target.value })}
          type="text"
          value={form.competition}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Market</Label>
        <Select
          onValueChange={(val) => setForm({ ...form, market: val })}
          value={form.market}
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
      <div className="space-y-2 md:col-span-1">
        <Label>Selection</Label>
        <Input
          onChange={(e) => setForm({ ...form, selection: e.target.value })}
          required
          type="text"
          value={form.selection}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Odds</Label>
        <Input
          inputMode="decimal"
          min="1.01"
          onChange={(e) =>
            setForm({
              ...form,
              recommended_odds: Number.parseFloat(e.target.value),
            })
          }
          required
          step="0.01"
          type="number"
          value={form.recommended_odds}
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Stake</Label>
        <Input
          inputMode="decimal"
          min="0.01"
          onChange={(e) =>
            setForm({ ...form, stake: Number.parseFloat(e.target.value) })
          }
          required
          step="0.01"
          type="number"
          value={form.stake}
        />
      </div>
      <div className="space-y-2 sm:col-span-1 md:col-span-2">
        <Label>Source</Label>
        <Input
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          type="text"
          value={form.source}
        />
      </div>
      <div className="space-y-2 sm:col-span-2 md:col-span-4">
        <Label>Notes</Label>
        <Textarea
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional notes..."
          value={form.notes}
        />
      </div>
      <div className="flex items-end sm:col-span-4 md:col-span-2">
        <Button className="w-full" type="submit">
          {isEdit ? (
            <Save className="mr-1 size-4" />
          ) : (
            <Plus className="mr-1 size-4" />
          )}
          {isEdit ? "Save Changes" : "Add Pick"}
        </Button>
      </div>
    </form>
  );
}

function getResultVariant(
  result: string | null
): "default" | "destructive" | "secondary" | "outline" {
  switch (result) {
    case "won":
      return "default";
    case "lost":
      return "destructive";
    case "push":
      return "outline";
    case "void":
      return "secondary";
    default:
      return "outline";
  }
}

function getMetricColor(value: number | null): string {
  if (value === null) {
    return "text-muted-foreground";
  }
  if (value > 0) {
    return "text-success";
  }
  if (value < 0) {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

// Mobile card view for picks
function PickCard({
  pick,
  agentName,
  agentHue,
  onDelete,
  onEdit,
  onUnset,
  onSettle,
  onSetClosingLine,
}: {
  pick: Pick;
  agentName: string;
  agentHue: number;
  onDelete: () => void;
  onEdit: () => void;
  onUnset: () => void;
  onSettle: (result: string) => void;
  onSetClosingLine: (closing_odds: number) => void;
}) {
  const [result, setResult] = useState("");
  const [editingClosing, setEditingClosing] = useState(false);
  const [closingValue, setClosingValue] = useState(
    pick.closing_odds?.toString() ?? ""
  );

  const plColor = getMetricColor(pick.profit_loss);
  const clvColor = getMetricColor(pick.clv_percent);

  const handleSettle = (value: string) => {
    setResult(value);
    if (value) {
      onSettle(value);
    }
  };

  const handleClosingLineSubmit = () => {
    const val = Number.parseFloat(closingValue);
    if (!Number.isNaN(val) && val > 1) {
      onSetClosingLine(val);
    }
    setEditingClosing(false);
  };

  const handleClosingLineCancel = () => {
    setClosingValue(pick.closing_odds?.toString() ?? "");
    setEditingClosing(false);
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        {/* Header: match + date */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium">
              {pick.home_team} vs {pick.away_team}
            </div>
            <div className="text-muted-foreground text-xs">
              {pick.competition && `${pick.competition} · `}
              {pick.market} · {new Date(pick.match_date).toLocaleDateString()}
            </div>
          </div>
          <Badge
            className="shrink-0"
            style={{
              backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
              color: `hsl(${agentHue}, 60%, 30%)`,
            }}
            variant="outline"
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
            {pick.clv_percent === null
              ? "-"
              : `${pick.clv_percent.toFixed(1)}%`}
          </div>
          <div className="text-muted-foreground">Stake</div>
          <div className="font-mono">{pick.stake}</div>
          <div className="text-muted-foreground">P/L</div>
          <div className={`font-mono ${plColor}`}>
            {pick.profit_loss === null
              ? "-"
              : (pick.profit_loss >= 0 ? "+" : "") +
                pick.profit_loss.toFixed(2)}
          </div>
        </div>

        {/* Result badge or settle dropdown */}
        {pick.result ? (
          <Badge variant={getResultVariant(pick.result)}>{pick.result}</Badge>
        ) : (
          <Select onValueChange={handleSettle} value={result}>
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
        <div className="flex items-center gap-2 border-t pt-2">
          {editingClosing ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                autoFocus
                className="font-mono"
                inputMode="decimal"
                min="1.01"
                onChange={(e) => setClosingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleClosingLineSubmit();
                  }
                  if (e.key === "Escape") {
                    handleClosingLineCancel();
                  }
                }}
                step="0.01"
                type="number"
                value={closingValue}
              />
              <Button
                onClick={handleClosingLineSubmit}
                size="icon-sm"
                variant="ghost"
              >
                ✓
              </Button>
              <Button
                onClick={handleClosingLineCancel}
                size="icon-sm"
                variant="ghost"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setEditingClosing(true)}
              size="sm"
              title="Edit closing line"
              variant="ghost"
            >
              CL:{" "}
              {pick.closing_odds === null ? "-" : pick.closing_odds.toFixed(2)}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto" size="icon-sm" variant="ghost">
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
  onEdit,
  onUnset,
  onSettle,
  onSetClosingLine,
}: {
  pick: Pick;
  agentName: string;
  agentHue: number;
  onDelete: () => void;
  onEdit: () => void;
  onUnset: () => void;
  onSettle: (result: string) => void;
  onSetClosingLine: (closing_odds: number) => void;
}) {
  const [result, setResult] = useState("");
  const [editingClosing, setEditingClosing] = useState(false);
  const [closingValue, setClosingValue] = useState(
    pick.closing_odds?.toString() ?? ""
  );

  const plColor = getMetricColor(pick.profit_loss);
  const clvColor = getMetricColor(pick.clv_percent);

  const handleSettle = (value: string) => {
    setResult(value);
    if (value) {
      onSettle(value);
    }
  };

  const handleClosingLineSubmit = () => {
    const val = Number.parseFloat(closingValue);
    if (!Number.isNaN(val) && val > 1) {
      onSetClosingLine(val);
    }
    setEditingClosing(false);
  };

  const handleClosingLineCancel = () => {
    setClosingValue(pick.closing_odds?.toString() ?? "");
    setEditingClosing(false);
  };

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">
        {new Date(pick.match_date).toLocaleDateString()}
      </TableCell>
      <TableCell className="min-w-[140px] max-w-[200px] whitespace-normal">
        {pick.home_team} vs {pick.away_team}
        {pick.competition && (
          <span className="ml-1 text-muted-foreground text-xs">
            ({pick.competition})
          </span>
        )}
      </TableCell>
      <TableCell>{pick.market}</TableCell>
      <TableCell className="max-w-[120px] whitespace-normal">
        {pick.selection}
      </TableCell>
      <TableCell className="text-right font-mono">
        {pick.recommended_odds.toFixed(2)}
      </TableCell>
      <TableCell className={`text-right font-mono ${clvColor}`}>
        {pick.clv_percent === null ? "-" : `${pick.clv_percent.toFixed(1)}%`}
      </TableCell>
      <TableCell className="text-right font-mono">{pick.stake}</TableCell>
      <TableCell className="text-center">
        {pick.result ? (
          <Badge variant={getResultVariant(pick.result)}>{pick.result}</Badge>
        ) : (
          <Select onValueChange={handleSettle} value={result}>
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
        {pick.profit_loss === null
          ? "-"
          : (pick.profit_loss >= 0 ? "+" : "") + pick.profit_loss.toFixed(2)}
      </TableCell>
      <TableCell className="text-center text-muted-foreground text-xs">
        {pick.source || "-"}
      </TableCell>
      <TableCell className="text-center">
        <Badge
          style={{
            backgroundColor: `hsl(${agentHue}, 60%, 90%)`,
            color: `hsl(${agentHue}, 60%, 30%)`,
          }}
          title={agentName}
          variant="outline"
        >
          {agentName}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {editingClosing ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                className="w-20 font-mono"
                min="1.01"
                onChange={(e) => setClosingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleClosingLineSubmit();
                  }
                  if (e.key === "Escape") {
                    handleClosingLineCancel();
                  }
                }}
                step="0.01"
                type="number"
                value={closingValue}
              />
              <Button
                onClick={handleClosingLineSubmit}
                size="icon-xs"
                variant="ghost"
              >
                ✓
              </Button>
              <Button
                onClick={handleClosingLineCancel}
                size="icon-xs"
                variant="ghost"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              className="h-auto px-1.5 font-mono text-xs"
              onClick={() => setEditingClosing(true)}
              size="sm"
              title="Click to edit closing line"
              variant="ghost"
            >
              {pick.closing_odds === null ? "-" : pick.closing_odds.toFixed(2)}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost">
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
