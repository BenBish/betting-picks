import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { checkAuth, logout } from '../lib/api';
import { Link, useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const authenticated = await checkAuth();
    if (!authenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    // In dev, use polling instead of SSE (Vite proxy can't handle streaming)
    if (import.meta.env.DEV) {
      setSseConnected(false);
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['activity'] });
      }, 5000);
      return () => clearInterval(interval);
    }

    const es = new EventSource('/api/activity/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate relevant caches on activity events
        if (data.action?.startsWith('pick.')) {
          queryClient.invalidateQueries({ queryKey: ['picks'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
        queryClient.invalidateQueries({ queryKey: ['activity'] });
      } catch {
        // Ignore parse errors
      }
    };

    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-foreground">Betting Picks</h1>
            <div className="flex gap-1">
              <Link
                to="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Picks
              </Link>
              <Link
                to="/analytics"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Analytics
              </Link>
              <Link
                to="/agents"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Agents
              </Link>
              <Link
                to="/activity"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Activity
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-success' : 'bg-warning'}`} />
              <span className="text-xs text-muted-foreground">{sseConnected ? 'Live' : 'Polling'}</span>
            </div>
            <button
              onClick={() => logout().then(() => (window.location.href = '/login'))}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
