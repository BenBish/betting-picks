import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgents, createAgent, updateAgent, deleteAgent, rotateAgentKey } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, X, Copy, Key, RotateCw, Trash2, MoreVertical, Power, PowerOff, Pencil } from 'lucide-react';

export function AgentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createAgent(name),
    onSuccess: (data) => {
      setPendingKeys((prev) => ({ ...prev, [data.agent.id]: data.key }));
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowForm(false);
      setNewName('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateAgent(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setDeleteId(null);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => rotateAgentKey(id),
    onSuccess: (key, agentId) => {
      setPendingKeys((prev) => ({ ...prev, [agentId]: key }));
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateAgent(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setEditId(null);
      setEditName('');
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

  const handleSubmit = (e: React.FormEvent) => {
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

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId && editName.trim()) {
      renameMutation.mutate({ id: editId, name: editName.trim() });
    }
  };

  const agentToDelete = agents.find((a) => a.id === deleteId);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agents</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="text"
                required
                placeholder="Agent name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="mt-6 text-muted-foreground">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No agents yet. Create your first agent above.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              pendingKey={pendingKeys[agent.id]}
              copiedId={copiedId}
              onCopyKey={handleCopyKey}
              onDismissKey={handleDismissKey}
              onToggle={() => toggleMutation.mutate({ id: agent.id, is_active: !agent.is_active })}
              onRotate={() => rotateMutation.mutate(agent.id)}
              onEdit={handleEditOpen(agent.id, agent.name)}
              onDelete={() => setDeleteId(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              {agentToDelete
                ? `Delete agent "${agentToDelete.name}"? This cannot be undone.`
                : 'Are you sure you want to delete this agent?'}
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

      {/* Edit agent dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-3">
            <Input
              type="text"
              required
              placeholder="Agent name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="flex-1"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renameMutation.isPending}>
                {renameMutation.isPending ? 'Saving...' : 'Save'}
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
  agent: any;
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
    <Card className={agent.is_active ? '' : 'opacity-60'}>
      <CardContent className="pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{agent.name}</h3>
              <StatusBadge active={agent.is_active} />
            </div>

            {pendingKey ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  New API Key (copy now — shown once):
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs break-all select-all">
                    {pendingKey}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onCopyKey(agent.id, pendingKey)}
                  >
                    <Copy className="mr-1 size-3" />
                    {copiedId === agent.id ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onDismissKey(agent.id)}
                >
                  Dismiss
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Key className="size-3" />
                <code className="rounded bg-muted px-1">{agent.key_prefix}...</code>
              </div>
            )}

            <p className="mt-1 text-xs text-muted-foreground">
              Created: {new Date(agent.created_at).toLocaleDateString()}
              {agent.last_active_at && (
                <span>
                  {' '}
                  | Last active: {new Date(agent.last_active_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggle}>
                {agent.is_active ? (
                  <><PowerOff className="mr-2 size-4" /> Deactivate</>
                ) : (
                  <><Power className="mr-2 size-4" /> Activate</>
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
    <Badge variant={active ? 'default' : 'secondary'} className="gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-400' : 'bg-muted-foreground'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}
