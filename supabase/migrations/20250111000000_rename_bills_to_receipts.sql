-- Migration: Rename bills to receipts
-- This migration renames the bills table and all related references to receipts

-- Rename the bills table to receipts
ALTER TABLE bills RENAME TO receipts;

-- Rename the foreign key column in items table
ALTER TABLE items RENAME COLUMN bill_id TO receipt_id;

-- Rename the foreign key column in people table (if exists)
ALTER TABLE people RENAME COLUMN bill_id TO receipt_id;

-- Update any indexes that reference 'bill'
-- (Postgres will automatically rename indexes when table is renamed)

-- If you have any triggers or functions referencing 'bills', update them here
-- Example:
-- ALTER FUNCTION some_bill_function() RENAME TO some_receipt_function();

-- Note: Run this migration in Supabase SQL Editor or via CLI:
-- supabase db push
