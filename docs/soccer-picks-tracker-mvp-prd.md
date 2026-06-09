# PRD: Soccer Picks Tracker MVP

## 1. Product Summary

**Product Name:** Soccer Picks Tracker

**Concept:**  
A simple web app that replaces a soccer betting tracking spreadsheet and allows one trusted agent to safely add, update, and settle picks through authenticated API endpoints.

**Core Stack:**

```text
Supabase Postgres
  ↓
Single picks table
  ↓
Next.js / React spreadsheet-style UI
  ↓
Simple authenticated API endpoints for one trusted agent
```

**Primary MVP Question:**

> Can I replace my spreadsheet and allow one trusted agent to safely add/update picks?

That is the entire MVP.

---

## 2. Problem Statement

A spreadsheet is useful for tracking picks manually, but it becomes fragile when an agent also needs to update it.

The core problems are:

- A CSV or spreadsheet can be accidentally overwritten.
- There is no safe API layer for agents.
- There is little validation.
- Calculations like CLV and profit/loss can become inconsistent.
- It is hard to know whether picks are beating the closing line.
- It is difficult to turn the tracker into a proper app later.

The MVP should keep the spreadsheet-like experience, but use a database as the source of truth.

---

## 3. MVP Goal

Build the simplest possible app that lets the user:

1. Add and edit soccer picks manually.
2. View picks in a spreadsheet-like table.
3. Allow one trusted agent to create or update picks through an API.
4. Track recommended odds, closing odds, CLV, result, and profit/loss.
5. Export the data to CSV.

---

## 4. Non-Goals

The MVP will **not** include:

- Automated bet placement.
- Multi-user roles.
- Multiple agents.
- Complex permissions.
- Review queue.
- Odds snapshot history.
- Full audit log table.
- Tipster/source performance dashboard.
- CSV import.
- Duplicate detection.
- Team normalization.
- Market normalization.
- Closing-line automation from bookmakers.
- Odds movement charts.
- Bankroll management.
- Predictive modeling.
- Public sharing.

These may be added later if the product proves useful.

---

## 5. Target User

### Primary User

The owner/operator who wants to track soccer picks and measure whether the picks are beating the closing line.

### Secondary System User

One trusted agent that can submit structured updates through API endpoints.

---

## 6. Core MVP User Stories

### 6.1 Manual Pick Creation

As a user, I want to manually add a pick so that I can track it from recommendation to settlement.

**Acceptance Criteria:**

- User can create a pick from the UI.
- Required fields are validated.
- Pick appears in the main table after creation.
- Pick has a unique ID.

---

### 6.2 Spreadsheet-Style Pick Tracking

As a user, I want to see all picks in a table so that I can manage them like a spreadsheet.

**Acceptance Criteria:**

- User can view all picks in a table.
- User can sort by match date.
- User can search or filter by team/source/status.
- User can edit a pick.
- User can export the table to CSV.

---

### 6.3 Agent Pick Creation

As an agent, I want to create a pick through an API so that I can add picks without directly editing the database or CSV.

**Acceptance Criteria:**

- Agent can call `POST /api/picks`.
- Agent must authenticate with an API key.
- API validates the required fields.
- API stores the raw agent payload for debugging.
- Pick is saved with `created_by = agent`.

---

### 6.4 Closing Line Update

As a user or agent, I want to add closing odds so that CLV can be calculated.

**Acceptance Criteria:**

- User can update closing odds manually.
- Agent can update closing odds through API.
- CLV is calculated server-side.
- Closing odds must be greater than 1.

---

### 6.5 Result Settlement

As a user or agent, I want to settle a pick so that profit/loss is calculated.

**Acceptance Criteria:**

- Pick can be marked as `won`, `lost`, `push`, or `void`.
- Profit/loss is calculated server-side.
- Settled picks remain editable by the user.
- Agent can settle through API if authenticated.

---

## 7. MVP Scope

### Must Have

- Supabase Postgres database.
- One `picks` table.
- Next.js app.
- React table UI.
- Manual add/edit pick flow.
- API key authentication for one trusted agent.
- API endpoint to create picks.
- API endpoint to update picks.
- API endpoint to update closing odds.
- API endpoint to settle results.
- Server-side CLV calculation.
- Server-side profit/loss calculation.
- CSV export.

### Should Have

- Basic filtering by status, source, and team.
- Basic search.
- Basic validation errors.
- Store raw agent payload.
- Show created/updated timestamps.

### Could Have

- Simple dashboard totals.
- Positive/negative CLV highlighting.
- Basic source filter.
- Basic result filter.

---

## 8. Data Model

Use one table for the MVP.

### Table: `picks`

```sql
create table picks (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by text not null default 'user',
  updated_by text,

  source text,

  match_date timestamptz not null,
  competition text,

  home_team text not null,
  away_team text not null,

  market text not null,
  selection text not null,

  recommended_odds numeric not null,
  closing_odds numeric,

  stake numeric not null default 1,

  result text,
  profit_loss numeric,

  notes text,
  raw_agent_payload jsonb
);
```

---

## 9. Field Definitions

| Field | Description |
|---|---|
| `id` | Unique pick ID |
| `created_at` | When the pick was created |
| `updated_at` | When the pick was last updated |
| `created_by` | `user` or `agent` |
| `updated_by` | Last actor to update the pick |
| `source` | Tipster, website, X account, model, or manual |
| `match_date` | Kickoff date/time |
| `competition` | League or competition |
| `home_team` | Home team |
| `away_team` | Away team |
| `market` | Betting market, e.g. Match Winner, Over/Under 2.5 |
| `selection` | The actual pick |
| `recommended_odds` | Odds at the time of the tip |
| `closing_odds` | Final odds near kickoff |
| `stake` | Stake in units |
| `result` | Final result of the pick |
| `profit_loss` | Calculated profit/loss |
| `notes` | Optional manual notes |
| `raw_agent_payload` | Original agent request payload for debugging |

---

## 10. Valid Result Values

For the MVP, support:

```text
won
lost
push
void
```

Later, the app can add:

```text
half_won
half_lost
cashout
partial
```

---

## 11. Core Calculations

### 11.1 CLV Direction

For backing bets using decimal odds:

```text
recommended_odds > closing_odds = positive CLV
recommended_odds = closing_odds = neutral CLV
recommended_odds < closing_odds = negative CLV
```

Example:

```text
Recommended odds: 2.10
Closing odds: 1.85

This is positive CLV because the user got a better price than the market closed at.
```

---

### 11.2 CLV Percentage

Suggested formula:

```text
clv_percent = ((recommended_odds / closing_odds) - 1) * 100
```

Example:

```text
Recommended odds: 2.10
Closing odds: 1.85

CLV = ((2.10 / 1.85) - 1) * 100
CLV = 13.51%
```

---

### 11.3 Profit/Loss

For decimal odds:

If won:

```text
profit_loss = stake * (recommended_odds - 1)
```

If lost:

```text
profit_loss = -stake
```

If push or void:

```text
profit_loss = 0
```

Profit/loss should always be calculated server-side.

---

## 12. Main UI Requirements

### Page: Picks Table

The primary UI should look like a simple spreadsheet.

Default columns:

```text
Date
Competition
Match
Market
Selection
Source
Recommended Odds
Closing Odds
CLV %
Stake
Result
Profit/Loss
Created By
Updated At
```

### Main Actions

The user can:

- Add pick.
- Edit pick.
- Update closing odds.
- Settle result.
- Export CSV.

### Basic Filters

The user can filter by:

- Source.
- Result.
- Competition.
- Date range.
- Team search.

### Visual Cues

The table should:

- Highlight positive CLV.
- Highlight negative CLV.
- Show unsettled picks clearly.
- Show picks missing closing odds.

---

## 13. API Requirements

### Authentication

For the MVP:

- Use Supabase Auth for the human user.
- Use one API key for the trusted agent.
- Store the API key securely as an environment variable or hashed in the database.
- Agent sends the key using an authorization header.

Example:

```http
Authorization: Bearer <AGENT_API_KEY>
```

Agents should not connect directly to Supabase or the database. They should only use the app's API endpoints.

---

## 14. API Endpoints

### 14.1 `GET /api/picks`

Returns all picks.

Optional query params:

```text
source
competition
result
team
date_from
date_to
```

---

### 14.2 `POST /api/picks`

Creates a pick.

Example request:

```json
{
  "source": "Example X Tipster",
  "match_date": "2026-06-10T19:00:00Z",
  "competition": "Premier League",
  "home_team": "Liverpool",
  "away_team": "Tottenham",
  "market": "Match Winner",
  "selection": "Liverpool",
  "recommended_odds": 1.95,
  "stake": 1,
  "notes": "Strong home xG trend"
}
```

Behavior:

- Validate request.
- Create pick.
- Set `created_by = agent` if called with agent API key.
- Store request body in `raw_agent_payload` when called by agent.
- Return created pick.

---

### 14.3 `PATCH /api/picks/:id`

Updates basic pick fields.

Editable fields:

```text
source
match_date
competition
home_team
away_team
market
selection
recommended_odds
closing_odds
stake
notes
```

Behavior:

- Validate fields.
- Update `updated_at`.
- Update `updated_by`.
- Recalculate CLV if relevant fields changed.
- Recalculate profit/loss if relevant fields changed.

---

### 14.4 `PATCH /api/picks/:id/closing-line`

Updates closing odds.

Example request:

```json
{
  "closing_odds": 1.85
}
```

Behavior:

- Validate pick exists.
- Validate closing odds are greater than 1.
- Update `closing_odds`.
- Update `updated_at`.
- Update `updated_by`.
- Return updated pick with CLV.

---

### 14.5 `PATCH /api/picks/:id/result`

Settles a pick.

Example request:

```json
{
  "result": "won"
}
```

Behavior:

- Validate pick exists.
- Validate result is allowed.
- Calculate profit/loss server-side.
- Update `result`.
- Update `profit_loss`.
- Update `updated_at`.
- Update `updated_by`.
- Return updated pick.

---

### 14.6 `GET /api/export.csv`

Exports all picks as CSV.

CSV columns:

```text
id
created_at
updated_at
created_by
source
match_date
competition
home_team
away_team
market
selection
recommended_odds
closing_odds
clv_percent
stake
result
profit_loss
notes
```

---

## 15. Validation Rules

### Pick Creation

Required:

```text
match_date
home_team
away_team
market
selection
recommended_odds
stake
```

Rules:

- `recommended_odds` must be greater than 1.
- `closing_odds`, if provided, must be greater than 1.
- `stake` must be greater than or equal to 0.
- `home_team` and `away_team` cannot be the same.
- `result`, if provided, must be one of the allowed result values.

---

## 16. Error Responses

Use structured API errors.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "recommended_odds must be greater than 1",
    "field": "recommended_odds"
  }
}
```

Common error codes:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
PICK_NOT_FOUND
INVALID_RESULT
RATE_LIMITED
```

---

## 17. Security Requirements

- Never expose Supabase service role key to the frontend.
- Agent cannot access the database directly.
- Agent API key must be stored securely.
- Agent API routes should be rate limited.
- All calculations should happen server-side.
- Raw agent payload should be stored for debugging.
- User should be able to disable the agent key quickly.

---

## 18. Suggested Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Table

### Backend

- Next.js API routes
- Supabase client/server SDK
- Server-side validation with Zod

### Database/Auth

- Supabase Postgres
- Supabase Auth
- Row Level Security

### Hosting

- Vercel for Next.js
- Supabase for database and auth

---

## 19. MVP Build Phases

### Phase 1: Project Setup

Deliverables:

- Next.js app.
- Supabase project.
- Environment variables.
- Auth setup.
- Initial database migration.

---

### Phase 2: Database and API

Deliverables:

- `picks` table.
- API validation.
- Agent API key auth.
- `GET /api/picks`.
- `POST /api/picks`.
- `PATCH /api/picks/:id`.
- `PATCH /api/picks/:id/closing-line`.
- `PATCH /api/picks/:id/result`.

---

### Phase 3: Table UI

Deliverables:

- Main picks table.
- Add pick form.
- Edit pick form.
- Closing odds update.
- Result settlement.
- CLV display.
- Profit/loss display.

---

### Phase 4: CSV Export and Polish

Deliverables:

- CSV export.
- Basic filters.
- Search.
- Positive/negative CLV highlighting.
- Basic empty/error states.

---

## 20. Future Enhancements

Add only when the MVP proves useful.

| Pain | Add Later |
|---|---|
| Agent makes mistakes | Review queue |
| Need odds movement history | Odds snapshots table |
| Need accountability | Audit logs table |
| Multiple agents | Agents table and permissions |
| Too many duplicate picks | Duplicate detection |
| Want source ranking | Source performance dashboard |
| Dirty team names | Team normalization |
| Dirty market names | Market normalization |
| Need historical import | CSV import |
| Want richer analysis | Dashboard views |

---

## 21. Recommended MVP Defaults

Use these defaults for the first build:

```text
Single owner account
One trusted agent
One agent API key
Agents can create and update picks
Agents cannot delete
Decimal odds only
Back bets only
Stake in units
Markets are free text
Teams are free text
Sources are free text
CSV export included
CSV import excluded
Review queue excluded
Odds snapshots excluded
Audit log table excluded
```

---

## 22. Definition of Done

The MVP is done when:

- User can log in.
- User can create a pick manually.
- User can edit a pick manually.
- User can view all picks in a table.
- User can update closing odds.
- User can settle a pick.
- CLV is calculated.
- Profit/loss is calculated.
- Agent can create a pick through API.
- Agent can update closing odds through API.
- Agent can settle result through API.
- User can export all picks to CSV.

---

## 23. Summary

This MVP should be intentionally small.

The product is not a betting model, a tipster marketplace, or a complex analytics platform yet.

It is simply:

> A database-backed spreadsheet replacement for soccer picks, with CLV and profit/loss tracking, plus a safe API for one trusted agent.

Build this first. Add complexity only after the basic workflow is useful.
