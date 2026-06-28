import { useQuery } from '@tanstack/react-query';
import { getActivity, ActivityLog } from '../lib/api';

export interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

export function ActivityFeed({ limit = 20, className = '' }: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity', limit],
    queryFn: () => getActivity({ limit }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-muted-foreground text-sm">No activity yet.</div>;
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {activities.map((a) => (
        <ActivityItem key={a.id} activity={a} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const actionLabel = getActionLabel(activity.action);
  const actionColor = getActionColor(activity.action);

  return (
    <div className="rounded px-2 py-1.5 text-xs leading-relaxed hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${actionColor}`}>{actionLabel}</span>
        <span className="text-muted-foreground">{formatTime(activity.created_at)}</span>
      </div>
      {activity.details && (
        <div className="mt-0.5 text-muted-foreground">{activity.details}</div>
      )}
    </div>
  );
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'pick.created': '📝 Pick Created',
    'pick.updated': '✏️ Pick Updated',
    'pick.settled': '⚽ Settled',
    'pick.closing_line': '📊 Closing Line',
    'pick.deleted': '🗑️ Pick Deleted',
    'agent.created': '🤖 Agent Created',
    'agent.key_rotated': '🔑 Key Rotated',
    'agent.deleted': '🤖 Agent Deleted',
  };
  return labels[action] || action;
}

function getActionColor(action: string): string {
  if (action.startsWith('pick.settled')) return 'text-success';
  if (action.startsWith('pick.deleted') || action.startsWith('agent.deleted')) return 'text-destructive';
  if (action.startsWith('pick.created')) return 'text-primary';
  return 'text-muted-foreground';
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
