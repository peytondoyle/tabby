-- Create scan_errors table for API error logging
CREATE TABLE IF NOT EXISTS scan_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for efficient querying by timestamp
CREATE INDEX IF NOT EXISTS scan_errors_timestamp_idx ON scan_errors (timestamp DESC);

-- Create index for querying by endpoint
CREATE INDEX IF NOT EXISTS scan_errors_endpoint_idx ON scan_errors (endpoint);

-- Create index for querying by status code
CREATE INDEX IF NOT EXISTS scan_errors_status_code_idx ON scan_errors (status_code);

-- Add RLS (Row Level Security) - allow all authenticated users to read/insert
ALTER TABLE scan_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts for error logging
CREATE POLICY "Allow anonymous error inserts" ON scan_errors
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Allow authenticated users to read errors (for debugging)
CREATE POLICY "Allow authenticated error reads" ON scan_errors
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Optional: Add retention policy (auto-delete old errors after 30 days)
-- This would require pg_cron extension
-- SELECT cron.schedule(
--     'delete-old-scan-errors',
--     '0 2 * * *', -- Daily at 2 AM
--     'DELETE FROM scan_errors WHERE timestamp < NOW() - INTERVAL ''30 days'';'
-- );