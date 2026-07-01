# AGENTS.md

## Structure

- `backend/` — Hono/Bun API server with SQLite
- `frontend/` — Vite/React/TanStack Router SPA
- Root `package.json` — Bun workspaces with convenience scripts

### Backend (`backend/`)

```
backend/src/
  server.ts                 # Bun server entry point
  index.ts                  # Hono app with all routes
  lib/
    db.ts                   # SQLite singleton, migration runner
    picks-service.ts        # Pick CRUD, filtering, batch ops, activity logging
    agent-service.ts        # Agent CRUD, key management, activity logging
    analytics-service.ts    # Analytics aggregation queries
    activity-service.ts     # Activity log writes + SSE broadcast
    sse-emitter.ts          # In-memory SSE broadcaster
    calculations.ts         # Pure CLV% and P&L functions
    validations.ts          # Zod schemas (picks, agents, auth, batch)
  middleware/
    auth.ts                 # Password hash, session token, session map
    rate-limit.ts           # Agent Bearer auth + sliding window rate limiter
  migrations/
    001_initial_picks.sql   # Picks table
    002_agents_activity.sql # Agents, activity_log tables
```

### Frontend (`frontend/`)

```
frontend/src/
  main.tsx                  # Entry point
  router.ts                 # TanStack Router setup
  index.css                 # Tailwind base styles + shadcn imports
  lib/
    api.ts                  # API client with typed fetch wrappers
    utils.ts                # cn() utility (clsx + tailwind-merge)
  components/
    ui/                     # shadcn/ui primitives
      button.tsx            # Button with forwardRef + asChild (Radix Slot)
      badge.tsx             # Badge with forwardRef + asChild
      card.tsx              # Card, CardHeader, CardContent, CardFooter
      dialog.tsx            # Dialog with Portal, Overlay, Close button
      alert-dialog.tsx      # AlertDialog with destructive action support
      dropdown-menu.tsx     # DropdownMenu for action menus
      table.tsx             # Table with overflow-x-auto wrapper
      input.tsx             # Styled input
      textarea.tsx          # Styled textarea
      select.tsx            # Select dropdown (Radix)
      checkbox.tsx          # Checkbox
      label.tsx             # Form label
      alert.tsx             # Alert banners
      separator.tsx         # Visual dividers
      scroll-area.tsx       # Scrollable containers
      sonner.tsx            # Toast notifications
    LoginPage.tsx           # Auth login form
    PicksPage.tsx           # Picks table, create form, settle, closing line, activity sidebar
    AnalyticsPage.tsx       # Summary cards, charts (Recharts), by-agent/market/competition
    AgentsPage.tsx          # Agent CRUD, key rotation
    ActivityFeed.tsx        # Collapsible activity feed component
  routes/
    __root.tsx              # Root route with QueryClientProvider + Sonner Toaster
    _auth.tsx               # Authenticated layout, SSE subscription, nav guard
    _auth.index.lazy.tsx    # / → PicksPage
    _auth.analytics.lazy.tsx # /analytics → AnalyticsPage
    _auth.agents.lazy.tsx   # /agents → AgentsPage
    _auth.activity.lazy.tsx # /activity → Full activity log page
    login.lazy.tsx          # /login → LoginPage (redirects if authenticated)
```

## Commands

All commands run from root `/home/ben/Dev/betting-picks-mvp/`:

```
bun run dev              # Both backend (3000) + frontend (5173) via concurrently
bun run dev:backend      # Backend only
bun run dev:frontend     # Frontend only
bun run build            # Typecheck backend + build frontend
bun run start:backend    # Production backend
bun run start:frontend   # Production frontend preview
bun run clean            # Remove SQLite database files
```

Backend tests: `cd backend && bun test`
Frontend build: `cd frontend && bun run build`

No test runner, no linter config beyond defaults. Use `bun run build` to verify type safety — TypeScript is strict with `noEmit`.

## Database

- **Engine**: Bun built-in `bun:sqlite`.
- **File**: `backend/data/picks.db` (created at runtime from `DB_PATH` env var).
- **Schema**: Migration files in `backend/src/migrations/`. Run via `db.ts` on first connection.
- **WAL mode** enabled. Migrations tracked via `schema_migrations` table.

### Tables

- `picks` — All betting picks with `agent_id`, `created_by`, `updated_by`
- `agents` — Named agents with scrypt-hashed keys, soft-delete via `is_active`
- `activity_log` — Audit trail for all write operations
- `schema_migrations` — Migration tracking

## Architecture

**Two entry points**:
1. **UI** → TanStack Query mutations → Hono admin routes → picks-service → SQLite
2. **Agent API** → Bearer auth → Hono agent routes → picks-service → SQLite

All CLV% and P&L are calculated server-side in `picks-service.ts` on write. Never trust client values.

Activity logging is wired into every write operation (create, update, settle, delete, batch ops) and broadcasts via SSE to connected clients.

## Environment

`backend/.env` (gitignored):
```
APP_PASSWORD=your-password-here
SESSION_SECRET=your-session-secret
DB_PATH=./data/picks.db
PORT=3000
```

- Admin auth: password-based session with HttpOnly cookies
- Agent auth: Bearer token with individual keys (`spk_xxxx...`), rate limited to 100 req/min

## API Endpoints

### Auth
- `POST /api/login` — `{ "password": "..." }` → sets HttpOnly session cookie
- `POST /api/logout` — clears session cookie

### Admin Routes (session-auth)
- `GET/POST /api/admin/agents` — list/create agents
- `GET/PUT/DELETE /api/admin/agents/:id` — agent CRUD
- `POST /api/admin/agents/:id/rotate-key` — rotate agent key
- `GET/POST /api/admin/picks` — list/create picks
- `GET/PUT/DELETE /api/admin/picks/:id` — pick CRUD
- `PUT /api/admin/picks/:id/closing-line` — set closing odds
- `PUT /api/admin/picks/:id/result` — settle pick
- `GET /api/admin/analytics` — overall stats
- `GET /api/admin/analytics/by-agent` — per-agent breakdown
- `GET /api/admin/analytics/by-market` — per-market breakdown
- `GET /api/admin/analytics/by-competition` — per-competition breakdown
- `GET /api/admin/analytics/daily-pnl` — daily P&L data points
- `GET /api/admin/export/csv` — CSV export
- `GET /api/activity` — paginated activity log (`?limit=50&offset=0&agent_id=...&action=...`)
- `GET /api/activity/stream` — SSE real-time activity feed

### Agent Routes (Bearer auth, rate limited)
- `POST /api/agent/picks` — create single pick
- `POST /api/agent/picks/batch` — batch create (207 Multi-Status)
- `POST /api/agent/picks/batch-closing-lines` — batch closing lines (207)
- `POST /api/agent/picks/batch-results` — batch settle results (207)

### Public
- `GET /api/health` — health check

## Gotchas

- **Config file**: `next.config.mjs` no longer exists. Frontend uses `vite.config.ts`.
- **Path alias**: `@/*` → `./src/*` (tsconfig paths).
- **`<input type="datetime-local">`** produces `2026-06-14T15:00` (no timezone offset). Use `z.string().refine((v) => !isNaN(new Date(v).getTime()))`.
- **Dev server**: Frontend on 5173, backend on 3000. Vite proxies `/api` → `http://localhost:3000`.
- **SSE**: The `GET /api/activity/stream` endpoint uses `text/event-stream`. Browser `EventSource` auto-reconnects.
- **Soft delete**: Agents are deactivated (`is_active = 0`) rather than hard-deleted. Use `getAllAgents(true)` to include inactive.
- **Batch response**: 207 Multi-Status with per-item status codes.
- **Tests**: Use `bun test` in backend. Each test file creates a fresh temp SQLite DB.

### Agent Skills & MCP Gotchas

- **Skills source of truth**: `.agents/skills/<name>/` is canonical. `.claude/skills/<name>` mirrors it via committed symlinks — if `/mr`, `/issue`, etc. don't show up in Claude Code, check `git config core.symlinks` and whether the clone materialized real symlinks (some Windows/archive checkouts write the target path as plain text instead).
- **Linear MCP**: `.mcp.json` reads the Linear server token from the `LINEAR_API_KEY` env var. Set it locally before using the `issue` or `work` skills; never commit a token.

### shadcn/ui Gotchas

- **Tailwind v3**: Project uses Tailwind v3.4. Do NOT use Tailwind v4 syntax (`--spacing()`, CSS variable arbitrary values like `py-(--var)`).
- **forwardRef required**: `Button` and `Badge` use `React.forwardRef` — required for Radix `Slot.Root` (`asChild` prop used by `DropdownMenuTrigger`, `DialogTrigger`).
- **AlertDialog in DropdownMenu**: `AlertDialogTrigger asChild` inside `DropdownMenuContent` is broken in Radix UI. Use state-based `open={deleteId !== null}` pattern instead.
- **Card spacing**: Card root provides `py-4` + `gap-4`. CardHeader/CardContent provide `px-4`. When CardHeader is omitted, use `pt-1` on CardContent (not `pt-4`).
- **Table overflow**: Table component includes `overflow-x-auto` wrapper. Do NOT double-wrap. Use column width constraints (`w-[...]`, `max-w-[...]`) + `whitespace-normal` for wrapping columns.
- **No `'use client'`**: This is a Vite SPA (not Next.js RSC). The `'use client'` directive is unnecessary.
