import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { checkAuth, logout } from '../lib/api';
import { Link, useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Menu, X } from 'lucide-react';

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
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <div className={`h-1.5 w-1.5 rounded-full ${sseConnected ? 'bg-success' : 'bg-warning'}`} />
                {sseConnected ? 'Live' : 'Polling'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout().then(() => (window.location.href = '/login'))}
              >
                <LogOut className="mr-1 size-4" /> Logout
              </Button>
            </div>
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
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
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <div className={`h-1.5 w-1.5 rounded-full ${sseConnected ? 'bg-success' : 'bg-warning'}`} />
                  {sseConnected ? 'Live' : 'Polling'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => { handleNavClick(); logout().then(() => (window.location.href = '/login')); }}
                >
                  <LogOut className="mr-1 size-4" /> Logout
                </Button>
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
  const location = useLocation();
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to + '/') || location.pathname === to;

  return (
    <Button
      asChild
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      className={mobile ? 'w-full justify-start' : ''}
    >
      <Link to={to} onClick={onClick}>{children}</Link>
    </Button>
  );
}
