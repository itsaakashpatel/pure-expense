-- Add confirmed flag to transactions
-- Transactions committed from reviewed imports default to confirmed=1.
-- Users can unconfirm individual rows for follow-up.
ALTER TABLE transactions ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 1;
