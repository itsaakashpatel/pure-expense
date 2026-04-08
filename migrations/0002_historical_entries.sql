CREATE TABLE IF NOT EXISTS historical_entries (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  snapshot_id TEXT REFERENCES monthly_snapshots(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  section TEXT NOT NULL CHECK (section IN ('expense', 'income')),
  display_order INTEGER NOT NULL DEFAULT 0,
  entry_label TEXT NOT NULL DEFAULT '',
  row_note TEXT NOT NULL DEFAULT '',
  source_row_index INTEGER NOT NULL DEFAULT 0,
  source_column_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historical_entries_month ON historical_entries(month);
CREATE INDEX IF NOT EXISTS idx_historical_entries_category ON historical_entries(category_id);
