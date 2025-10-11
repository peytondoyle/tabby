// api/_utils/schemas.ts
import { z } from 'zod'

// Common error response shape
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  issues: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string().optional()
  })).optional()
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// Receipt creation request schema
export const CreateReceiptRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Item name is required"),
    price: z.number().positive("Price must be positive"),
    icon: z.string().optional()
  })).min(1, "At least one item is required"),
  place: z.string().nullable().optional(),
  total: z.number().nullable().optional(),
  date: z.string().optional(),
  people: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).default([]),
  tax: z.number().default(0),
  tip: z.number().default(0),
  user_id: z.string().optional() // Optional user ID for authenticated users
})

export type CreateReceiptRequest = z.infer<typeof CreateReceiptRequestSchema>

// Receipt response schema (consistent across create, get, list)
export const ReceiptSchema = z.object({
  id: z.string(),
  token: z.string().optional(),
  title: z.string().nullable(),
  place: z.string().nullable(),
  date: z.string().nullable(),
  created_at: z.string(),
  subtotal: z.number().nullable(),
  sales_tax: z.number().nullable(),
  tip: z.number().nullable(),
  total_amount: z.number().nullable(),
  item_count: z.number(),
  people_count: z.number(),
  currency: z.string().default('USD')
})

export type Receipt = z.infer<typeof ReceiptSchema>

// Receipt item schema
export const ReceiptItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  price: z.number(),
  emoji: z.string().nullable(),
  quantity: z.number().default(1)
})

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>

// Receipt list response schema
export const ReceiptListResponseSchema = z.object({
  receipts: z.array(ReceiptSchema)
})

// Receipt detail response schema
export const ReceiptDetailResponseSchema = z.object({
  receipt: ReceiptSchema,
  items: z.array(ReceiptItemSchema),
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar_url: z.string().nullable()
  })).optional(),
  shares: z.array(z.object({
    item_id: z.string(),
    person_id: z.string()
  })).optional()
})

// Scan receipt request schema (for multipart form data)
export const ScanReceiptRequestSchema = z.object({
  file: z.any() // Formidable file object
})

// Health check response schema
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  uptimeMs: z.number()
})

// Rate limiting configuration
export const RATE_LIMITS = {
  scan_receipt: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  create_receipt: { maxRequests: 20, windowMs: 60000 },  // 20 requests per minute
  default: { maxRequests: 100, windowMs: 60000 }      // 100 requests per minute
} as const

// File size limits (mirroring UI)
export const FILE_LIMITS = {
  maxImageSize: 10 * 1024 * 1024, // 10 MB
  maxJsonSize: 1024 * 1024,       // 1 MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
} as const
