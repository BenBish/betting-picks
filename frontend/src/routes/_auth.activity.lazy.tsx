import { createLazyFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActivity, ActivityLog } from '../lib/api';

export const Route = createLazyFileRoute('/_auth/activity')({
  component: ActivityPage,
});

function ActivityPage() {
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [agentFilter, setAgentFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['activity-page', limit, offset, agentFilter, actionFilter],
    queryFn: () => getActivity({ limit, offset, agent_id: agentFilter || undefined, action: actionFilter || undefined }),
  });

  const hasMore = activities.length === limit;

  const actions = [
    { value: '', label: 'All Actions' },
    { value: 'pick.created', label: 'Pick Created' },
    { value: 'pick.updated', label: 'Pick Updated' },
    { value: 'pick.settled', label: 'Pick Settled' },
    { value: 'pick.closing_line', label: 'Closing Line' },
    { value: 'pick.deleted', label: 'Pick Deleted' },
    { value: 'agent.created', label: 'Agent Created' },
    { value: 'agent.key_rotated', label: 'Key Rotated' },
    { value: 'agent.deleted', label: 'Agent Deleted' },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity Log</h2>
        <button
          onClick={() => refetch()}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
        >
          {actions.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by agent ID..."
          className="rounded border border-input bg-background px-2 py-1.5 text-sm"
          value={agentFilter}
          onChange={(e) => { setAgentFilter(e.target.value); setOffset(0); }}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 text-muted-foreground">Loading activity...</div>
      ) : activities.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border p-8 text-center text-muted-foreground">
          No activity recorded yet.
        </div>
      ) : (
        <div className="mt-6 space-y-1">
          {activities.map((a) => (
            <ActivityRow key={a.id} activity={a} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setOffset((o) => o + limit)}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ActivityRow({ activity }: { activity: ActivityLog }) {
  const actionLabel = getActionLabel(activity.action);
  const actionColor = getActionColor(activity.action);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5 hover:bg-muted/30">
      <div className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${actionColor}`}>
        {actionLabel}
      </div>
      <div className="min-w-0 flex-1">
        {activity.details && (
          <div className="text-sm">{activity.details}</div>
        )}
        {activity.agent_id && (
          <div className="mt-0.5 text-xs text-muted-foreground">Agent: {activity.agent_id}</div>
        )}
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {formatTime(activity.created_at)}
      </div>
    </div>
  );
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'pick.created': 'Created',
    'pick.updated': 'Updated',
    'pick.settled': 'Settled',
    'pick.closing_line': 'Closing Line',
    'pick.deleted': 'Deleted',
    'agent.created': 'Agent Created',
    'agent.key_rotated': 'Key Rotated',
    'agent.deleted': 'Agent Deleted',
  };
  return labels[action] || action;
}

function getActionColor(action: string): string {
  if (action.startsWith('pick.settled')) return 'bg-success/10 text-success';
  if (action.startsWith('pick.deleted') || action.startsWith('agent.deleted')) return 'bg-destructive/10 text-destructive';
  if (action.startsWith('pick.created')) return 'bg-primary/10 text-primary';
  return 'bg-muted/50 text-muted-foreground';
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
