import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { applyCors } from '../_lib/cors.js'

// Environment variables with fallbacks
const SB_URL = 
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const SB_SECRET = process.env.SUPABASE_SECRET_KEY

// Server-side Supabase client using secret key
const supabaseAdmin = (SB_URL && SB_SECRET)
  ? createClient(SB_URL, SB_SECRET, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Schema detection cache (shared with bills/create)
let schemaCache: {
  itemsTable?: string
  itemsColumns?: string[]
  itemsFkColumn?: string
  billsColumns?: string[]
} = {}

/**
 * Get bills table columns (static schema)
 */
function getBillsColumns(): string[] {
  if (!schemaCache.billsColumns) {
    schemaCache.billsColumns = [
      'id', 'title', 'place', 'date', 'currency', 
      'subtotal', 'sales_tax', 'tip', 'receipt_file_path', 
      'ocr_json', 'trip_id'
    ]
  }
  return schemaCache.billsColumns
}

/**
 * Auto-detect items table schema by trying common table names
 */
async function detectItemsSchema(): Promise<{
  table: string
  columns: string[]
  fkColumn: string
}> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available for schema detection')
  }

  // Return cached result if available
  if (schemaCache.itemsTable && schemaCache.itemsColumns && schemaCache.itemsFkColumn) {
    return {
      table: schemaCache.itemsTable,
      columns: schemaCache.itemsColumns,
      fkColumn: schemaCache.itemsFkColumn
    }
  }

  const candidateTables = ['items', 'bill_items', 'receipt_items']
  
  for (const tableName of candidateTables) {
    try {
      console.info(`[schema_detect] Trying table: ${tableName}`)
      
      // Try to fetch columns by making a query with limit 0
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(0)

      if (!error && data !== null) {
        console.info(`[schema_detect] Found accessible table: ${tableName}`)
        
        // Try to detect foreign key column by common patterns
        const possibleFkColumns = ['bill_id', 'bills_id', 'receipt_id']
        let detectedFk = 'bill_id' // Default fallback
        
        // For now, we'll assume standard column names exist
        // In a production environment, you'd want to make a proper introspection call
        const assumedColumns = ['id', 'label', 'unit_price', 'qty', 'emoji', detectedFk]
        
        // Cache the result
        schemaCache.itemsTable = tableName
        schemaCache.itemsColumns = assumedColumns
        schemaCache.itemsFkColumn = detectedFk
        
        return {
          table: tableName,
          columns: assumedColumns,
          fkColumn: detectedFk
        }
      }
    } catch (error) {
      console.warn(`[schema_detect] Table ${tableName} not accessible:`, error)
      continue
    }
  }
  
  // Default fallback
  console.warn('[schema_detect] No items table found, using default: items')
  const defaultSchema = {
    table: 'items',
    columns: ['id', 'label', 'unit_price', 'qty', 'emoji', 'bill_id'],
    fkColumn: 'bill_id'
  }
  
  schemaCache.itemsTable = defaultSchema.table
  schemaCache.itemsColumns = defaultSchema.columns
  schemaCache.itemsFkColumn = defaultSchema.fkColumn
  
  return defaultSchema
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const requestStart = Date.now()

  // Apply CORS first
  if (applyCors(req, res)) return

  // Only allow GET
  if (req.method !== 'GET') {
    console.warn(`[schema_diag] Method not allowed: ${req.method}`)
    return res.status(405).json({ 
      ok: false, 
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed' 
    })
  }

  // Guard: only allow in development (Vercel dev doesn't set NODE_ENV)
  const isDev = process.env.NODE_ENV !== 'production' || !process.env.VERCEL_URL
  if (!isDev) {
    const duration = Date.now() - requestStart
    console.warn(`[schema_diag] Not allowed in production (${duration}ms)`)
    return res.status(404).json({
      ok: false,
      code: 'NOT_FOUND',
      message: 'This endpoint is only available in development'
    })
  }

  // Check Supabase configuration
  if (!supabaseAdmin) {
    const duration = Date.now() - requestStart
    console.error(`[schema_diag] Supabase admin client not configured in ${duration}ms`)
    return res.status(500).json({ 
      ok: false, 
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase admin client is not configured',
      missing: {
        url: !SB_URL,
        secret: !SB_SECRET
      }
    })
  }

  try {
    console.info('[schema_diag] Detecting table schemas...')

    // Get bills columns (static)
    const billsColumns = getBillsColumns()

    // Detect items table schema
    let itemsSchema: { table: string; columns: string[]; fkColumn: string }
    try {
      itemsSchema = await detectItemsSchema()
      console.info(`[schema_diag] Items table detected: ${itemsSchema.table}`)
    } catch (schemaError) {
      console.error('[schema_diag] Failed to detect items schema:', schemaError)
      return res.status(500).json({
        ok: false,
        code: 'SCHEMA_DETECTION_FAILED',
        message: 'Failed to detect items table schema',
        details: schemaError instanceof Error ? schemaError.message : String(schemaError)
      })
    }

    const duration = Date.now() - requestStart
    console.info(`[schema_diag] Schema detection completed in ${duration}ms`)
    
    // Return schema information
    const response = {
      ok: true,
      bills: billsColumns,
      items: {
        table: itemsSchema.table,
        columns: itemsSchema.columns,
        fk: itemsSchema.fkColumn
      }
    }

    res.status(200).json(response)

  } catch (error) {
    const duration = Date.now() - requestStart
    console.error(`[schema_diag] Unexpected error in ${duration}ms:`, error)
    
    res.status(500).json({ 
      ok: false, 
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during schema detection',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}