import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Key,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCw,
  Trash2,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  type Agent,
  createAgent,
  deleteAgent,
  getAgents,
  rotateAgentKey,
  updateAgent,
} from "../lib/api";

export function AgentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => getAgents(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createAgent(name),
    onSuccess: (data) => {
      setPendingKeys((prev) => ({ ...prev, [data.agent.id]: data.key }));
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setShowForm(false);
      setNewName("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAgent(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setDeleteId(null);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => rotateAgentKey(id),
    onSuccess: (key, agentId) => {
      setPendingKeys((prev) => ({ ...prev, [agentId]: key }));
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateAgent(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setEditId(null);
      setEditName("");
    },
  });

  const handleCopyKey = (agentId: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(agentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDismissKey = (agentId: string) => {
    setPendingKeys((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createMutation.mutate(newName.trim());
    }
  };

  const handleDelete = (id: string) => () => {
    deleteMutation.mutate(id);
  };

  const handleEditOpen = (agentId: string, currentName: string) => () => {
    setEditId(agentId);
    setEditName(currentName);
  };

  const handleRename = (e: FormEvent) => {
    e.preventDefault();
    if (editId && editName.trim()) {
      renameMutation.mutate({ id: editId, name: editName.trim() });
    }
  };

  const agentToDelete = agents.find((a) => a.id === deleteId);
  let agentsContent: ReactNode;
  if (isLoading) {
    agentsContent = (
      <div className="mt-6 text-muted-foreground">Loading agents...</div>
    );
  } else if (agents.length === 0) {
    agentsContent = (
      <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No agents yet. Create your first agent above.
      </div>
    );
  } else {
    agentsContent = (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard
            agent={agent}
            copiedId={copiedId}
            key={agent.id}
            onCopyKey={handleCopyKey}
            onDelete={() => setDeleteId(agent.id)}
            onDismissKey={handleDismissKey}
            onEdit={handleEditOpen(agent.id, agent.name)}
            onRotate={() => rotateMutation.mutate(agent.id)}
            onToggle={() =>
              toggleMutation.mutate({
                id: agent.id,
                is_active: !agent.is_active,
              })
            }
            pendingKey={pendingKeys[agent.id]}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">Agents</h2>
        <Dialog onOpenChange={setShowForm} open={showForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <Input
                autoFocus
                className="flex-1"
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Agent name"
                required
                type="text"
                value={newName}
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowForm(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {agentsContent}

      {/* Delete confirmation dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteId(null)}
        open={deleteId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              {agentToDelete
                ? `Delete agent "${agentToDelete.name}"? This cannot be undone.`
                : "Are you sure you want to delete this agent?"}
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

      {/* Edit agent dialog */}
      <Dialog
        onOpenChange={(open) => !open && setEditId(null)}
        open={editId !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={handleRename}>
            <Input
              autoFocus
              className="flex-1"
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Agent name"
              required
              type="text"
              value={editName}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setEditId(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={renameMutation.isPending} type="submit">
                {renameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AgentCard({
  agent,
  pendingKey,
  copiedId,
  onCopyKey,
  onDismissKey,
  onToggle,
  onRotate,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  pendingKey?: string;
  copiedId: string | null;
  onCopyKey: (id: string, key: string) => void;
  onDismissKey: (id: string) => void;
  onToggle: () => void;
  onRotate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={agent.is_active ? "" : "opacity-60"}>
      <CardContent className="pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{agent.name}</h3>
              <StatusBadge active={agent.is_active} />
            </div>

            {pendingKey ? (
              <div className="mt-2">
                <p className="text-muted-foreground text-xs">
                  New API Key (copy now — shown once):
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 select-all break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {pendingKey}
                  </code>
                  <Button
                    onClick={() => onCopyKey(agent.id, pendingKey)}
                    size="sm"
                    variant="secondary"
                  >
                    <Copy className="mr-1 size-3" />
                    {copiedId === agent.id ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Button
                  className="mt-1 h-auto p-0 text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => onDismissKey(agent.id)}
                  size="sm"
                  variant="ghost"
                >
                  Dismiss
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                <Key className="size-3" />
                <code className="rounded bg-muted px-1">
                  {agent.key_prefix}...
                </code>
              </div>
            )}

            <p className="mt-1 text-muted-foreground text-xs">
              Created: {new Date(agent.created_at).toLocaleDateString()}
              {agent.last_active_at && (
                <span>
                  {" "}
                  | Last active:{" "}
                  {new Date(agent.last_active_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggle}>
                {agent.is_active ? (
                  <>
                    <PowerOff className="mr-2 size-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-2 size-4" /> Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRotate}>
                <RotateCw className="mr-2 size-4" /> Rotate Key
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge className="gap-1.5" variant={active ? "default" : "secondary"}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400" : "bg-muted-foreground"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
