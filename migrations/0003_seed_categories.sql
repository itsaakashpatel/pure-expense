-- Seed default expense categories
INSERT OR IGNORE INTO categories (id, name, slug, kind, sort_order) VALUES
  ('cat_rent',             'Rent',            'rent',            'expense', 10),
  ('cat_utilities',        'Utilities',        'utilities',        'expense', 20),
  ('cat_mobile',           'Mobile',           'mobile',           'expense', 30),
  ('cat_personal',         'Personal',         'personal',         'expense', 40),
  ('cat_dinners',          'Dinners',          'dinners',          'expense', 50),
  ('cat_coffee',           'Coffee',           'coffee',           'expense', 60),
  ('cat_groceries',        'Groceries',        'groceries',        'expense', 70),
  ('cat_household_items',  'Household Items',  'household-items',  'expense', 80),
  ('cat_rental',           'Rental',           'rental',           'expense', 90),
  ('cat_travelling',       'Travelling',       'travelling',       'expense', 100),
  ('cat_shopping',         'Shopping',         'shopping',         'expense', 110),
  ('cat_gifts',            'Gifts',            'gifts',            'expense', 120),
  ('cat_subscriptions',    'Subscriptions',    'subscriptions',    'expense', 130),
  ('cat_miscellaneous',    'Miscellaneous',    'miscellaneous',    'expense', 140);

-- Seed default income categories
INSERT OR IGNORE INTO categories (id, name, slug, kind, sort_order) VALUES
  ('cat_gic',       'GIC',      'gic',      'income', 10),
  ('cat_parttime',  'Parttime', 'parttime', 'income', 20),
  ('cat_other',     'Other',    'other',    'income', 30);
