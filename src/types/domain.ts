// Domain types for Bills, Items, and related entities
// These interfaces reflect the actual database schema without over-engineering

export interface Receipt {
  id: string
  token: string
  title: string
  total: number
  subtotal: number
  tax: number
  tip: number
  created_at: string
  updated_at: string
  storage_path?: string | null
  ocr_json?: OcrParsedReceipt | null
}

export interface NewReceiptInput {
  title: string
  total: number
  subtotal: number
  tax: number
  tip: number
  storage_path?: string | null
  ocr_json?: OcrParsedReceipt | null
}

export interface Item {
  id: string
  bill_id: string
  label: string
  price: number
  quantity: number
  unit_price: number
  emoji?: string
  created_at: string
  updated_at: string
}

export interface NewItemInput {
  bill_id: string
  label: string
  price: number
  quantity: number
  unit_price: number
  emoji?: string
}

export interface ItemShare {
  id: string
  item_id: string
  person_id: string
  created_at: string
}

export interface NewItemShareInput {
  item_id: string
  person_id: string
}

// OCR and Receipt Parsing Types
export interface OcrLineItem {
  label: string
  price: number
  price_cents?: number
  emoji?: string | null
}

export interface OcrParsedReceipt {
  items: OcrLineItem[]
  total: number
  total_cents?: number
  subtotal: number
  subtotal_cents?: number
  tax: number
  tax_cents?: number
  tip: number
  tip_cents?: number
}

// API Response Types
export type ApiResult<T> = {
  ok: true
  data: T
} | {
  ok: false
  code: string
  message: string
  details?: string
  hint?: string
  stage?: string
}

// Application Error Types
export interface AppError {
  code: string
  message: string
  details?: string
}

// Person/User Types
export interface Person {
  id: string
  name: string
  avatar?: string
  color?: string
}

// Flow Store Types
export interface FlowPerson {
  id: string
  name: string
  avatar?: string
}

export interface FlowItem {
  id: string
  label: string
  price: number
  emoji?: string | null
}

// Parse Result for Receipt Processing
export interface ParseResult {
  items: OcrLineItem[]
  total?: number | null
  subtotal?: number | null
  tax?: number | null
  tip?: number | null
  place?: string | null
  date?: string | null
  rawText?: string | null
  storage_path?: string | null
  ocr_json?: OcrParsedReceipt | null
}
