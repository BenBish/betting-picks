import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type ActivityLog, getActivity } from "../lib/api";

export const Route = createLazyFileRoute("/_auth/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const [limit, _setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [agentFilter, setAgentFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const {
    data: activities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["activity-page", limit, offset, agentFilter, actionFilter],
    queryFn: () =>
      getActivity({
        limit,
        offset,
        agent_id: agentFilter || undefined,
        action: actionFilter || undefined,
      }),
  });

  const hasMore = activities.length === limit;

  const actions = [
    { value: "", label: "All Actions" },
    { value: "pick.created", label: "Pick Created" },
    { value: "pick.updated", label: "Pick Updated" },
    { value: "pick.settled", label: "Pick Settled" },
    { value: "pick.closing_line", label: "Closing Line" },
    { value: "pick.deleted", label: "Pick Deleted" },
    { value: "agent.created", label: "Agent Created" },
    { value: "agent.key_rotated", label: "Key Rotated" },
    { value: "agent.deleted", label: "Agent Deleted" },
  ];

  let activityContent: ReactNode;
  if (isLoading) {
    activityContent = (
      <div className="mt-6 text-muted-foreground">Loading activity...</div>
    );
  } else if (activities.length === 0) {
    activityContent = (
      <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  } else {
    activityContent = (
      <div className="mt-6">
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1">
            {activities.map((a, i) => (
              <div key={a.id}>
                <ActivityRow activity={a} />
                {i < activities.length - 1 && <Separator className="my-1" />}
              </div>
            ))}
          </div>
        </ScrollArea>
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setOffset((o) => o + limit)}
              size="sm"
              variant="outline"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">Activity Log</h2>
        <Button onClick={() => refetch()} size="sm" variant="ghost">
          <RefreshCw className="mr-1 size-4" /> Refresh
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Select
          onValueChange={(val) => {
            setActionFilter(val === "__all__" ? "" : val);
            setOffset(0);
          }}
          value={actionFilter || "__all__"}
        >
          <SelectTrigger className="flex-1 sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a) => (
              <SelectItem key={a.value} value={a.value || "__all__"}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="flex-1"
          onChange={(e) => {
            setAgentFilter(e.target.value);
            setOffset(0);
          }}
          placeholder="Filter by agent ID..."
          value={agentFilter}
        />
      </div>

      {activityContent}
    </>
  );
}

function ActivityRow({ activity }: { activity: ActivityLog }) {
  const actionLabel = getActionLabel(activity.action);
  const actionVariant = getActionVariant(activity.action);

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/30">
      <Badge className="shrink-0" variant={actionVariant}>
        {actionLabel}
      </Badge>
      <div className="min-w-0 flex-1">
        {activity.details && <div className="text-sm">{activity.details}</div>}
        {activity.agent_id && (
          <div className="mt-0.5 text-muted-foreground text-xs">
            Agent: {activity.agent_id}
          </div>
        )}
      </div>
      <div className="shrink-0 text-muted-foreground text-xs">
        {formatTime(activity.created_at)}
      </div>
    </div>
  );
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "pick.created": "Created",
    "pick.updated": "Updated",
    "pick.settled": "Settled",
    "pick.closing_line": "Closing Line",
    "pick.deleted": "Deleted",
    "agent.created": "Agent Created",
    "agent.key_rotated": "Key Rotated",
    "agent.deleted": "Agent Deleted",
  };
  return labels[action] || action;
}

function getActionVariant(
  action: string
): "default" | "destructive" | "secondary" | "outline" {
  if (action.startsWith("pick.settled")) {
    return "default";
  }
  if (action.startsWith("pick.deleted") || action.startsWith("agent.deleted")) {
    return "destructive";
  }
  if (action.startsWith("pick.created")) {
    return "secondary";
  }
  return "outline";
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  return date.toLocaleDateString();
}
