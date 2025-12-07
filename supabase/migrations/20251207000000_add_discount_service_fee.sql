-- Add discount and service_fee columns to tabby_receipts
ALTER TABLE tabby_receipts 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN tabby_receipts.discount IS 'Total discount amount (stored as positive number, subtracted from total)';
COMMENT ON COLUMN tabby_receipts.service_fee IS 'Service fee amount (added to total)';
