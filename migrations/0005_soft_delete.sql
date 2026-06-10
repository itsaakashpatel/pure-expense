-- Add soft delete support to transactions and imports
ALTER TABLE transactions ADD COLUMN deleted_at TEXT;
ALTER TABLE imports ADD COLUMN deleted_at TEXT;
