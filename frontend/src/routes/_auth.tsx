import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [mobileMenuOpen]);

  const handleNavClick = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur" ref={navRef}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-foreground">Betting Picks</h1>
            {/* Desktop nav links */}
            <div className="hidden md:flex gap-1">
              <NavLink to="/" onClick={handleNavClick}>Picks</NavLink>
              <NavLink to="/analytics" onClick={handleNavClick}>Analytics</NavLink>
              <NavLink to="/agents" onClick={handleNavClick}>Agents</NavLink>
              <NavLink to="/activity" onClick={handleNavClick}>Activity</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop status + logout */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-success' : 'bg-warning'}`} />
                <span className="text-xs text-muted-foreground">{sseConnected ? 'Live' : 'Polling'}</span>
              </div>
              <button
                onClick={() => logout().then(() => (window.location.href = '/login'))}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground min-h-[44px]"
              >
                Logout
              </button>
            </div>
            {/* Mobile hamburger */}
            <button
              onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
              className="md:hidden rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/" onClick={handleNavClick} mobile>Picks</NavLink>
              <NavLink to="/analytics" onClick={handleNavClick} mobile>Analytics</NavLink>
              <NavLink to="/agents" onClick={handleNavClick} mobile>Agents</NavLink>
              <NavLink to="/activity" onClick={handleNavClick} mobile>Activity</NavLink>
              <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-success' : 'bg-warning'}`} />
                  <span className="text-xs text-muted-foreground">{sseConnected ? 'Live' : 'Polling'}</span>
                </div>
                <button
                  onClick={() => { handleNavClick(); logout().then(() => (window.location.href = '/login')); }}
                  className="ml-auto rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground min-h-[44px]"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, onClick, children, mobile }: { to: string; onClick: () => void; children: string; mobile?: boolean }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={
        mobile
          ? 'block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px]'
          : 'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px]'
      }
    >
      {children}
    </Link>
  );
}
