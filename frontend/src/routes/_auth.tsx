import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { checkAuth, logout } from '../lib/api';
import { Link } from '@tanstack/react-router';

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
            </div>
          </div>
          <button
            onClick={() => logout().then(() => (window.location.href = '/login'))}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
