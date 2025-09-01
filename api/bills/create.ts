import { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../_lib/cors.js'
import { supabaseAdmin, SB_URL, SB_SECRET } from '../_lib/supabase.js'

// Feature flags
const REQUIRE_SUPABASE_PERSIST = process.env.REQUIRE_SUPABASE_PERSIST === '1'
const REQUIRE_REAL_OCR = process.env.REQUIRE_REAL_OCR === '1'

// Schema detection cache
let schemaCache: {
  itemsTable?: string
  itemsColumns?: string[]
  itemsFkColumn?: string
  billsColumns?: string[]
} = {}

interface ErrorResponse {
  ok: false
  stage: 'bills' | 'items' | 'config' | 'validation'
  code: 'PGREST' | 'VALIDATION' | 'CONFIG'
  message: string
  details?: string
  hint?: string
  postgres_code?: string
  payload_keys?: string[]
}

interface SuccessResponse {
  ok: true
  bill: any
  items: any[]
}

interface ParsedReceiptInput {
  // Support both current and new format
  place?: string | null
  merchant?: string | null
  date?: string | null
  purchased_at?: string | null
  items?: Array<{
    id?: string
    label?: string
    name?: string  // Support both label and name
    price?: number
    price_cents?: number  // Support cents
    emoji?: string | null
  }>
  line_items?: Array<{
    name: string
    price_cents: number
  }>
  subtotal?: number | null
  subtotal_cents?: number | null
  tax?: number | null
  tax_cents?: number | null
  tip?: number | null
  tip_cents?: number | null
  total?: number | null
  rawText?: string | null
  currency?: string
}

interface CreateBillRequest {
  parsed: ParsedReceiptInput
  storage_path?: string | null
  ocr_json?: any | null
}

/**
 * Convert cents to dollars
 */
function centsToDollars(cents?: number | null): number {
  return cents ? Math.round(cents) / 100 : 0
}

/**
 * Ensure number is in dollars (2 decimal places max)
 */
function ensureDollars(value: any, fallback: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? fallback : Math.round(num * 100) / 100
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
        // Get column information from the response metadata
        // Since we can't directly introspect columns, we'll use the PostgREST API
        const introspectResponse = await fetch(`${SB_URL}/rest/v1/${tableName}?select=*&limit=0`, {
          headers: {
            'apikey': SB_SECRET!,
            'Authorization': `Bearer ${SB_SECRET!}`
          }
        })
        
        if (introspectResponse.ok) {
          // Try to detect foreign key column by common patterns
          const possibleFkColumns = ['bill_id', 'bills_id', 'receipt_id']
          let detectedFk = 'bill_id' // Default fallback
          
          // We'll assume standard column names exist
          const assumedColumns = ['id', 'label', 'unit_price', 'qty', 'emoji', detectedFk]
          
          console.info(`[schema_detect] Found table ${tableName} with assumed columns`)
          
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

/**
 * Get bills table columns (static for now)
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
 * Validate and normalize input
 */
function validateAndNormalizeInput(body: any): { valid: boolean; error?: string; normalized?: CreateBillRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const { parsed, storage_path, ocr_json } = body

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Missing or invalid "parsed" field' }
  }

  // Normalize items array from different input formats
  let normalizedItems: any[] = []
  
  if (Array.isArray(parsed.items)) {
    normalizedItems = parsed.items
  } else if (Array.isArray(parsed.line_items)) {
    normalizedItems = parsed.line_items
  } else {
    return { valid: false, error: 'parsed.items or parsed.line_items must be an array' }
  }

  // Validate and normalize each item
  for (let i = 0; i < normalizedItems.length; i++) {
    const item = normalizedItems[i]
    
    // Normalize name/label
    const itemName = item.label || item.name
    if (!itemName || typeof itemName !== 'string') {
      return { valid: false, error: `Item ${i + 1} must have a label or name (string)` }
    }
    
    // Normalize price (support both dollars and cents)
    let itemPrice = 0
    if (typeof item.price === 'number' && !isNaN(item.price)) {
      itemPrice = item.price
    } else if (typeof item.price_cents === 'number' && !isNaN(item.price_cents)) {
      itemPrice = centsToDollars(item.price_cents)
    } else {
      return { valid: false, error: `Item ${i + 1} must have a valid price (number) or price_cents (number)` }
    }
    
    // Update item with normalized values
    normalizedItems[i] = {
      ...item,
      label: itemName,
      price: itemPrice
    }
  }

  // Normalize the parsed data
  const normalizedParsed = {
    place: parsed.place || parsed.merchant || null,
    date: parsed.date || parsed.purchased_at || null,
    items: normalizedItems,
    subtotal: parsed.subtotal_cents ? centsToDollars(parsed.subtotal_cents) : ensureDollars(parsed.subtotal),
    tax: parsed.tax_cents ? centsToDollars(parsed.tax_cents) : ensureDollars(parsed.tax),
    tip: parsed.tip_cents ? centsToDollars(parsed.tip_cents) : ensureDollars(parsed.tip),
    total: ensureDollars(parsed.total),
    rawText: parsed.rawText || null,
    currency: parsed.currency || 'USD'
  }

  return {
    valid: true,
    normalized: {
      parsed: normalizedParsed,
      storage_path: storage_path || null,
      ocr_json: ocr_json || null
    }
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateInput?: string | null): string | null {
  if (!dateInput) return null
  
  // If it's already in YYYY-MM-DD format, use it as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput
  }
  
  // If it's an ISO string, extract the date part
  if (dateInput.includes('T')) {
    return dateInput.split('T')[0]
  }
  
  // Try to parse as Date and format
  try {
    const date = new Date(dateInput)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // Invalid date format
  }
  
  return null
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  stage: 'bills' | 'items' | 'config' | 'validation',
  code: 'PGREST' | 'VALIDATION' | 'CONFIG',
  message: string,
  details?: string,
  hint?: string,
  postgres_code?: string,
  payload_keys?: string[]
): ErrorResponse {
  console.error(`[bill_create_error] stage=${stage} code=${code} message="${message}"`)
  
  return {
    ok: false,
    stage,
    code,
    message,
    details,
    hint,
    postgres_code,
    payload_keys
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestStart = Date.now()

  // Apply CORS first
  if (applyCors(req, res)) return

  // Only allow POST
  if (req.method !== 'POST') {
    const error = createErrorResponse('config', 'CONFIG', 'Only POST method is allowed')
    return res.status(405).json(error)
  }

  // Check Supabase configuration
  if (!supabaseAdmin) {
    const error = createErrorResponse(
      'config', 
      'CONFIG',
      'Supabase admin client is not configured',
      undefined,
      undefined,
      undefined,
      undefined
    )
    // Add missing configuration details
    ;(error as any).missing = {
      url: !SB_URL,
      secret: !SB_SECRET
    }
    return res.status(400).json(error)
  }

  try {
    // Validate and normalize input
    const validation = validateAndNormalizeInput(req.body)
    if (!validation.valid) {
      const error = createErrorResponse('validation', 'VALIDATION', validation.error!)
      return res.status(400).json(error)
    }

    const { parsed, storage_path, ocr_json } = validation.normalized!

    // Check REQUIRE_REAL_OCR flag
    if (REQUIRE_REAL_OCR && parsed.rawText && parsed.rawText.includes('Mock receipt')) {
      const error = createErrorResponse(
        'validation', 
        'VALIDATION',
        'Demo/stub OCR data is not allowed when REQUIRE_REAL_OCR=1'
      )
      return res.status(400).json(error)
    }

    console.info('[bill_create] Creating bill with server admin client...')

    // Detect items table schema
    let itemsSchema: { table: string; columns: string[]; fkColumn: string }
    try {
      itemsSchema = await detectItemsSchema()
      console.info(`[bill_create] Using items table: ${itemsSchema.table}`)
    } catch (schemaError) {
      const error = createErrorResponse(
        'config',
        'CONFIG',
        'Failed to detect items table schema',
        schemaError instanceof Error ? schemaError.message : String(schemaError)
      )
      return res.status(500).json(error)
    }

    // Calculate correct totals from items
    const calculatedSubtotal = parsed.items.reduce((sum, item) => sum + (item.price || 0), 0)
    const tax = parsed.tax || 0
    const tip = parsed.tip || 0
    const total = calculatedSubtotal + tax + tip

    console.log('[bill_create] Calculated totals:', {
      itemsSubtotal: calculatedSubtotal.toFixed(2),
      parsedSubtotal: parsed.subtotal?.toFixed(2) || '0.00',
      tax: tax.toFixed(2),
      tip: tip.toFixed(2),
      total: total.toFixed(2),
      itemsCount: parsed.items.length
    })

    // Prepare bill data
    const billData = {
      title: parsed.place || "Receipt Upload",
      place: parsed.place || null,
      date: formatDate(parsed.date),
      currency: parsed.currency || 'USD',
      subtotal: ensureDollars(calculatedSubtotal, 0),
      sales_tax: ensureDollars(tax, 0),
      tip: ensureDollars(tip, 0),
      receipt_file_path: storage_path,
      ocr_json: ocr_json,
      trip_id: null
    }

    console.info('[bill_create] Inserting bill into database...')
    console.info('[bill_create] Supabase URL:', SB_URL)
    console.info('[bill_create] Has secret key:', !!SB_SECRET)
    console.info('[bill_create] Supabase admin client exists:', !!supabaseAdmin)
    
    // Use RPC function to create bill (respects RLS policies)
    // Note: RPC returns JSON, not a row
    let billResult, billError
    try {
      // Log the RPC call details
      console.info('[bill_create] Calling RPC with:', JSON.stringify({
        p_title: billData.title,
        p_place: billData.place,
        p_date: billData.date?.toString() || null,
        sales_tax: billData.sales_tax,
        tip: billData.tip
      }, null, 2))
      
      const response = await supabaseAdmin
        .rpc('create_bill', {
          p_title: billData.title,
          p_place: billData.place,
          p_date: billData.date?.toString() || null,
          sales_tax: billData.sales_tax,
          tip: billData.tip,
          tax_split_method: 'proportional',
          tip_split_method: 'proportional'
        })
      billResult = response.data
      billError = response.error
    } catch (fetchError: any) {
      console.error('[bill_create] Fetch error details:', {
        message: fetchError.message,
        cause: fetchError.cause?.message || fetchError.cause,
        code: fetchError.cause?.code,
        errno: fetchError.cause?.errno,
        syscall: fetchError.cause?.syscall,
        stack: fetchError.stack
      })
      
      // Check if it's a Node.js version issue
      console.error('[bill_create] Node version:', process.version)
      console.error('[bill_create] URL attempted:', `${SB_URL}/rest/v1/rpc/create_bill`)
      
      billError = fetchError
    }

    if (billError) {
      const error = createErrorResponse(
        'bills',
        'PGREST',
        `Failed to create bill: ${billError.message}`,
        billError.details,
        billError.hint,
        billError.code,
        ['p_title', 'p_place', 'p_date', 'sales_tax', 'tip']
      )
      return res.status(500).json(error)
    }

    // RPC returns JSON with id, token, viewer_token, etc.
    const bill = billResult
    const billId = bill.id
    console.info(`[bill_create] Bill created with ID: ${billId}`)

    // Create items using RPC function
    let items: any[] = []
    if (parsed.items.length > 0) {
      console.info(`[bill_create] Creating ${parsed.items.length} items...`)
      
      // Create each item using the RPC function
      for (const item of parsed.items) {
        const { data: createdItem, error: itemError } = await supabaseAdmin
          .rpc('create_item', {
            bill_id: billId,
            emoji: item.emoji || '🍽️',
            label: item.label,
            price: ensureDollars(item.price, 0),
            quantity: 1
          })

        if (itemError) {
          const error = createErrorResponse(
            'items',
            'PGREST',
            `Failed to create item: ${itemError.message}`,
            itemError.details,
            itemError.hint,
            itemError.code,
            ['bill_id', 'emoji', 'label', 'price', 'quantity']
          )
          return res.status(500).json(error)
        }
        
        if (createdItem) {
          items.push(createdItem)
        }
      }
      
      console.info(`[bill_create] ${items.length} items created successfully`)
    }

    const duration = Date.now() - requestStart
    console.info(`[bill_create] Bill creation completed successfully in ${duration}ms - bill ID: ${billId}`)
    
    // Return success response
    const response: SuccessResponse = {
      ok: true,
      bill,
      items
    }

    res.status(200).json(response)

  } catch (error) {
    // Catch any unexpected errors and return structured JSON response
    const errorResponse = createErrorResponse(
      'config',
      'CONFIG',
      'An unexpected error occurred while creating the bill',
      error instanceof Error ? error.message : String(error)
    )
    res.status(500).json(errorResponse)
  }
}