-- Migration: Add performance indexes for faster queries
-- These indexes optimize the most common query patterns in the app

-- Index on editor_token for faster token lookups (used in every API call)
-- The existing composite index (viewer_token, editor_token) doesn't help with editor_token-only queries
CREATE INDEX IF NOT EXISTS idx_receipts_editor_token ON public.receipts(editor_token);

-- Index on viewer_token for faster read-only access
CREATE INDEX IF NOT EXISTS idx_receipts_viewer_token ON public.receipts(viewer_token);

-- Index on created_at for sorting receipts (used in list views)
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);

-- Index on item_id for item_shares lookups (complement to existing person_id index)
-- This speeds up queries that fetch all people sharing a specific item
CREATE INDEX IF NOT EXISTS idx_item_shares_item ON public.item_shares(item_id);

-- Composite index for receipts lookup with user filtering (future auth)
-- Will be useful when adding user_id column
-- CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON public.receipts(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Note: We already have these indexes from init.sql:
-- - idx_people_receipt on people(receipt_id)
-- - idx_items_receipt on items(receipt_id)
-- - idx_item_shares_person on item_shares(person_id)
-- - Primary key on item_shares(item_id, person_id) serves as composite index
