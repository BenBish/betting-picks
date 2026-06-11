# Agent API Instructions

How an external agent (AI betting analyst, script, etc.) stores picks into the Soccer Picks Tracker.

## Base URL

`http://localhost:3000/api` (dev server falls back to 3001, then 3002 if ports are taken).

## Authentication

Include `Authorization: Bearer <AGENT_API_KEY>` on every request. The key is set in `.env.local` as `AGENT_API_KEY` (default: `poc-agent-key-change-me`).

**Note:** Auth is informational, not enforced. Requests without a valid token are still accepted but marked `created_by: "user"`. With a valid token, picks are marked `created_by: "agent"` and the raw payload is preserved in `raw_agent_payload`.

## Endpoints

### 1. Create a pick

```
POST /picks
Content-Type: application/json
Authorization: Bearer <AGENT_API_KEY>
```

**Request body:**

```json
{
  "match_date": "2026-06-14T15:00",
  "competition": "EPL",
  "home_team": "Arsenal",
  "away_team": "Chelsea",
  "market": "Match Winner",
  "selection": "Arsenal",
  "recommended_odds": 2.10,
  "stake": 10,
  "notes": "Arsenal strong at home, Chelsea missing key defender"
}
```

**Response (201):** The created pick with auto-generated `id`, `created_at`, `created_by: "agent"`, and `raw_agent_payload`.

### 2. Update closing odds

```
PATCH /picks/<id>/closing-line
Content-Type: application/json
Authorization: Bearer <AGENT_API_KEY>
```

**Request body:**

```json
{
  "closing_odds": 1.95
}
```

**Response (200):** Updated pick with `clv_percent` calculated server-side: `((recommended_odds / closing_odds) - 1) * 100`.

Example: odds of 2.10 vs closing 1.95 → CLV% = 7.69.

### 3. Settle a pick

```
PATCH /picks/<id>/result
Content-Type: application/json
Authorization: Bearer <AGENT_API_KEY>
```

**Request body:**

```json
{
  "result": "won"
}
```

**Valid results:** `"won"`, `"lost"`, `"push"`, `"void"`.

**Response (200):** Updated pick with `profit_loss` calculated server-side:

| Result | Formula |
|---|---|
| `won` | `stake × (recommended_odds - 1)` |
| `lost` | `-stake` |
| `push` / `void` | `0` |

### 4. Update pick (general)

```
PATCH /picks/<id>
Content-Type: application/json
Authorization: Bearer <AGENT_API_KEY>
```

Update any field on the pick. Only fields sent in the body are changed. Uses `UpdatePickSchema` (all fields optional).

### 5. List picks

```
GET /picks
```

No auth required. Supports query parameters:

| Parameter | Example | Description |
|---|---|---|
| `source` | `?source=Dave Rave` | Filter by source |
| `competition` | `?competition=EPL` | Filter by competition |
| `result` | `?result=won` | Filter by result |
| `team` | `?team=Arsenal` | Filter by team (home or away) |
| `date_from` | `?date_from=2026-06-01` | Filter from date |
| `date_to` | `?date_to=2026-06-30` | Filter to date |

## Field Reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `match_date` | string | yes | ISO datetime, e.g. `2026-06-14T15:00` |
| `competition` | string | no | League name, e.g. "EPL", "La Liga" |
| `home_team` | string | yes | Must differ from `away_team` |
| `away_team` | string | yes | Must differ from `home_team` |
| `market` | string | yes | e.g. "Match Winner", "Over 2.5 Goals" |
| `selection` | string | yes | What you're backing |
| `recommended_odds` | number | yes | Decimal odds, must be > 1 |
| `closing_odds` | number | no | Decimal odds, must be > 1 |
| `stake` | number | no | Defaults to 1 |
| `notes` | string | no | Free text |
| `result` | string | no | One of: `won`, `lost`, `push`, `void` |

## Error Responses

All errors return structured JSON:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "home_team and away_team cannot be the same",
    "field": "away_team"
  }
}
```

**Error codes:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid JSON, missing fields, constraint violation |
| `INVALID_RESULT` | 400 | Result value not in enum |
| `PICK_NOT_FOUND` | 404 | Pick ID doesn't exist |
| `INTERNAL_ERROR` | 500 | Server error |

## Verified Examples

All endpoints tested and confirmed working:

- **Create (no auth)** → 201, `created_by: "user"`
- **Create (Bearer auth)** → 201, `created_by: "agent"`, raw payload stored
- **Closing odds** → CLV% calculated correctly: `(2.10 / 1.95 - 1) × 100 = 7.69%`
- **Settle won** → P&L calculated correctly: `10 × (2.10 - 1) = 11`
- **Validation errors** → 400 with field-level detail
- **Filtering** → `?competition=EPL` returns only matching picks
