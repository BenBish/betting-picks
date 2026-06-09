CREATE TABLE IF NOT EXISTS picks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  created_by TEXT NOT NULL DEFAULT 'user',
  updated_by TEXT,

  source TEXT,

  match_date TEXT NOT NULL,
  competition TEXT,

  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,

  market TEXT NOT NULL,
  selection TEXT NOT NULL,

  recommended_odds REAL NOT NULL,
  closing_odds REAL,

  stake REAL NOT NULL DEFAULT 1,

  result TEXT,
  profit_loss REAL,

  notes TEXT,
  raw_agent_payload TEXT
);
