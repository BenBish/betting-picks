import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgents, createAgent, updateAgent, deleteAgent, rotateAgentKey } from '../lib/api';

export function AgentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  // Map agent id → full key string (only set on create or rotate)
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});
  // Track which agent had its key just copied to clipboard
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createAgent(name),
    onSuccess: (data) => {
      // Store the full key so it renders in the new agent card
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => rotateAgentKey(id),
    onSuccess: (key, agentId) => {
      setPendingKeys((prev) => ({ ...prev, [agentId]: key }));
      queryClient.invalidateQueries({ queryKey: ['agents'] });
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

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agents</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 min-h-[44px]"
        >
          {showForm ? 'Cancel' : '+ New Agent'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Agent name"
            className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px] sm:w-auto w-full"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="mt-6 text-muted-foreground">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border p-8 text-center text-muted-foreground">
          No agents yet. Create your first agent above.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`rounded-lg border p-3 md:p-4 ${
                agent.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <StatusBadge active={agent.is_active} />
                  </div>
                  {pendingKeys[agent.id] ? (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground">New API Key (copy now — shown once):</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs break-all select-all">
                          {pendingKeys[agent.id]}
                        </code>
                        <button
                          onClick={() => handleCopyKey(agent.id, pendingKeys[agent.id])}
                          className="shrink-0 rounded px-3 py-2 text-sm min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {copiedId === agent.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDismissKey(agent.id)}
                        className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Key: <code className="rounded bg-muted px-1">{agent.key_prefix}...</code>
                    </p>
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: agent.id, is_active: !agent.is_active })
                    }
                    className={`rounded px-3 py-2 text-sm min-h-[44px] w-full sm:w-auto ${
                      agent.is_active
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-success hover:bg-success/10'
                    }`}
                  >
                    {agent.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => rotateMutation.mutate(agent.id)}
                    className="rounded px-3 py-2 text-sm min-h-[44px] text-muted-foreground hover:text-foreground w-full sm:w-auto"
                  >
                    Rotate Key
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(agent.id)}
                    className="rounded px-3 py-2 text-sm min-h-[44px] text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shrink-0 ${
        active
          ? 'bg-success/20 text-success'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-success' : 'bg-muted-foreground'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
