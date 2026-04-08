CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  import_mode TEXT NOT NULL CHECK (import_mode IN ('historical-summary', 'statement')),
  source_type TEXT NOT NULL,
  statement_month TEXT,
  currency TEXT NOT NULL DEFAULT 'CAD',
  parsing_status TEXT NOT NULL,
  commit_status TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_rows (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  occurred_at TEXT,
  merchant_raw TEXT NOT NULL DEFAULT '',
  description_raw TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  source_type TEXT NOT NULL,
  statement_month TEXT,
  suggested_category_id TEXT REFERENCES categories(id),
  suggestion_confidence REAL,
  final_category_id TEXT REFERENCES categories(id),
  review_status TEXT NOT NULL DEFAULT 'pending',
  is_excluded INTEGER NOT NULL DEFAULT 0,
  parser_label TEXT NOT NULL DEFAULT '',
  raw_line TEXT NOT NULL DEFAULT '',
  ai_reasoning TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  import_row_id TEXT NOT NULL UNIQUE REFERENCES import_rows(id) ON DELETE CASCADE,
  occurred_at TEXT,
  merchant_raw TEXT NOT NULL,
  description_raw TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  category_id TEXT REFERENCES categories(id),
  statement_month TEXT,
  source_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  section TEXT NOT NULL CHECK (section IN ('expense', 'income')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS merchant_rules (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  match_kind TEXT NOT NULL CHECK (match_kind IN ('exact', 'contains')),
  match_value TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  created_from_import_row_id TEXT REFERENCES import_rows(id),
  hit_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id TEXT PRIMARY KEY,
  import_row_id TEXT NOT NULL UNIQUE REFERENCES import_rows(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  confidence REAL,
  reasoning TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_imports_month ON imports(statement_month);
CREATE INDEX IF NOT EXISTS idx_import_rows_import ON import_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_month ON import_rows(statement_month);
CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(statement_month);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month ON monthly_snapshots(month);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_category ON monthly_snapshots(category_id);
CREATE INDEX IF NOT EXISTS idx_historical_entries_month ON historical_entries(month);
CREATE INDEX IF NOT EXISTS idx_historical_entries_category ON historical_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_rules_key ON merchant_rules(normalized_key);

INSERT OR IGNORE INTO categories (id, name, slug, kind, sort_order) VALUES
  ('cat_mobile', 'Mobile', 'mobile', 'expense', 10),
  ('cat_dinners', 'Dinners', 'dinners', 'expense', 20),
  ('cat_coffee', 'Coffee', 'coffee', 'expense', 30),
  ('cat_groceries_veggies', 'Groceries/Veggies', 'groceries-veggies', 'expense', 40),
  ('cat_household_items', 'Household Items', 'household-items', 'expense', 50),
  ('cat_utilities', 'Utilities', 'utilities', 'expense', 60),
  ('cat_rental', 'Rental', 'rental', 'expense', 70),
  ('cat_travelling', 'Travelling', 'travelling', 'expense', 80),
  ('cat_miscellaneous', 'Miscellaneous', 'miscellaneous', 'expense', 90),
  ('cat_gic', 'GIC', 'gic', 'income', 100),
  ('cat_parttime', 'Parttime', 'parttime', 'income', 110),
  ('cat_other', 'Other', 'other', 'income', 120);
