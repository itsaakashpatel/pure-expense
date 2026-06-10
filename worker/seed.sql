-- Seed the design's six monochrome categories. `id` is the glyph key the app
-- uses to render the icon; `color` is the mono ramp. Safe to re-run.
DELETE FROM categories;
INSERT INTO categories (id, name, icon, color, sort_order) VALUES
  ('food',       'Food & Dining', 'food',       '#161616', 0),
  ('groceries',  'Groceries',     'groceries',  '#3A3A3D', 1),
  ('transport',  'Transport',     'transport',  '#5C5C61', 2),
  ('shopping',   'Shopping',      'shopping',   '#828289', 3),
  ('travel',     'Travel',        'travel',     '#A8A8AE', 4),
  ('utilities',  'Utilities',     'utilities',  '#CBCBD0', 5);
