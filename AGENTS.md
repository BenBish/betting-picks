# AGENTS.md

## Structure

- `docs/soccer-picks-tracker-mvp-prd.md` — PRD with schema, API spec, and calculations.
- `poc/no-supabase-local/` — **Only app**. Next.js 14 monolith. All work happens here.
- Root `docs/` is the only spec. Code of truth is in `poc/no-supabase-local/src/`.

## Commands

All commands run from `poc/no-supabase-local/`:

```
bun dev          # dev server, port 3000 (falls back to 3001)
bun run build    # production build
bun start        # serve production build
```

No test runner, no linter config beyond `bun lint` (Next.js default). Use `bun run build` to verify type safety — TypeScript is strict with `noEmit`.

## Database

- **Engine**: Node built-in `node:sqlite` (NOT better-sqlite3, NOT Supabase).
- **File**: `data/picks.db` (created at runtime from `DB_PATH` env var).
- **Schema**: `src/lib/schema.sql` — single `picks` table. Run via `src/lib/db.ts` on first connection.
- **WAL mode** enabled. No migrations framework — schema is idempotent (`CREATE TABLE IF NOT EXISTS`).

## Architecture

```
src/
  app/
    page.tsx              # Server component, fetches picks, renders table
    api/picks/            # Agent API routes (Bearer auth)
    api/export/           # CSV export endpoint
  lib/
    db.ts                 # SQLite singleton, auto-runs schema.sql
    picks-service.ts      # All CRUD + CLV/P&L calculations (server-side only)
    server-actions.ts     # 'use server' mutations for UI, calls picks-service
    validations.ts        # Shared Zod schemas
    calculations.ts       # Pure calculation functions
    middleware/agent-auth.ts  # Bearer token check against AGENT_API_KEY
  components/             # Client components (TanStack Table, forms, dialogs)
```

**Two entry points**:
1. **UI** → server actions → `picks-service.ts` → SQLite
2. **Agent API** → route handlers → `picks-service.ts` → SQLite

All CLV% and P&L are calculated server-side in `picks-service.ts` on write. Never trust client values.

## Environment

`.env.local` (gitignored):
```
AGENT_API_KEY=poc-agent-key-change-me
DB_PATH=./data/picks.db
```

Agent API requires `Authorization: Bearer <AGENT_API_KEY>` header.

## Gotchas

- **Config file**: `next.config.mjs` (`.mjs`, NOT `.js`) — ESM required for Bun compatibility.
- **Path alias**: `@/*` → `./src/*` (tsconfig paths).
- **`<input type="datetime-local">`** produces `2026-06-14T15:00` (no timezone offset). Zod `.datetime({ offset: true })` rejects this. Use `z.string().refine((v) => !isNaN(new Date(v).getTime()))` instead.
- **Dev server**: Bun's `bun dev` uses Next.js's internal Node compat layer. If port 3000 is taken it silently tries 3001.
- **`/api/export`** logs a dynamic usage warning during `bun run build` (reads `getAllPicks` at build time). It works at runtime — ignore the warning.
- **Playwright Chrome**: System Chromium is at `/usr/bin/chromium`. Symlink to `/opt/google/chrome/chrome` if Playwright can't find it.
