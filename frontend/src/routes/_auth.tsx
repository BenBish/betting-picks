import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkAuth, logout } from "../lib/api";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const authenticated = await checkAuth();
    if (!authenticated) {
      throw redirect({ to: "/login" });
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
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      }, 5000);
      return () => clearInterval(interval);
    }

    const es = new EventSource("/api/activity/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate relevant caches on activity events
        if (data.action?.startsWith("pick.")) {
          queryClient.invalidateQueries({ queryKey: ["picks"] });
          queryClient.invalidateQueries({ queryKey: ["analytics"] });
        }
        queryClient.invalidateQueries({ queryKey: ["activity"] });
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
    if (!mobileMenuOpen) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [mobileMenuOpen]);

  const handleNavClick = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <nav
        className="sticky top-0 z-50 border-border border-b bg-card/95 backdrop-blur"
        ref={navRef}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-foreground text-lg">Better Bet</h1>
            {/* Desktop nav links */}
            <div className="hidden gap-1 md:flex">
              <NavLink onClick={handleNavClick} to="/">
                Picks
              </NavLink>
              <NavLink onClick={handleNavClick} to="/analytics">
                Analytics
              </NavLink>
              <NavLink onClick={handleNavClick} to="/agents">
                Agents
              </NavLink>
              <NavLink onClick={handleNavClick} to="/activity">
                Activity
              </NavLink>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop status + logout */}
            <div className="hidden items-center gap-3 md:flex">
              <Badge className="gap-1.5 font-normal" variant="secondary">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${sseConnected ? "bg-success" : "bg-warning"}`}
                />
                {sseConnected ? "Live" : "Polling"}
              </Badge>
              <Button
                onClick={() =>
                  logout().then(() => (window.location.href = "/login"))
                }
                size="sm"
                variant="ghost"
              >
                <LogOut className="mr-1 size-4" /> Logout
              </Button>
            </div>
            {/* Mobile hamburger */}
            <Button
              aria-label="Toggle menu"
              className="md:hidden"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              size="icon-sm"
              variant="ghost"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Button>
          </div>
        </div>
        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="border-border border-t bg-card md:hidden">
            <div className="space-y-1 px-4 py-2">
              <NavLink mobile onClick={handleNavClick} to="/">
                Picks
              </NavLink>
              <NavLink mobile onClick={handleNavClick} to="/analytics">
                Analytics
              </NavLink>
              <NavLink mobile onClick={handleNavClick} to="/agents">
                Agents
              </NavLink>
              <NavLink mobile onClick={handleNavClick} to="/activity">
                Activity
              </NavLink>
              <div className="mt-2 flex items-center gap-3 border-border border-t pt-2">
                <Badge className="gap-1.5 font-normal" variant="secondary">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${sseConnected ? "bg-success" : "bg-warning"}`}
                  />
                  {sseConnected ? "Live" : "Polling"}
                </Badge>
                <Button
                  className="ml-auto"
                  onClick={() => {
                    handleNavClick();
                    logout().then(() => (window.location.href = "/login"));
                  }}
                  size="sm"
                  variant="ghost"
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

function NavLink({
  to,
  onClick,
  children,
  mobile,
}: {
  to: string;
  onClick: () => void;
  children: string;
  mobile?: boolean;
}) {
  const location = useLocation();
  const isActive =
    to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(`${to}/`) || location.pathname === to;

  return (
    <Button
      asChild
      className={mobile ? "w-full justify-start" : ""}
      size="sm"
      variant={isActive ? "secondary" : "ghost"}
    >
      <Link onClick={onClick} to={to}>
        {children}
      </Link>
    </Button>
  );
}
