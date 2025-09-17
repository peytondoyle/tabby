import { z } from "zod";

/**
 * Frontend Bill item payload (schema + inferred type).
 * Keep this aligned with backend contract, but DO NOT import backend code.
 */
export const BillItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().finite(),       // dollars; normalized to 2dp by caller
  icon: z.string().optional(),
});

export const PersonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/**
 * BillCreateSchema mirrors the backend contract expected by /api/bills/create
 * Fields allowed to be null on create are typed as nullable() here.
 */
export const BillCreateSchema = z.object({
  place: z.string().nullable(),         // null until known
  total: z.number().finite().nullable(),// null if unknown at create-time
  items: z.array(BillItemSchema).min(1),
  people: z.array(PersonSchema).default([]), // empty array allowed
  tax: z.number().finite().default(0),
  tip: z.number().finite().default(0),
});

export type BillItemPayload = z.infer<typeof BillItemSchema>;

/**
 * Weight validation schema for item shares
 * Ensures weight is positive and within reasonable bounds
 */
export const WeightSchema = z.number()
  .positive('Weight must be greater than 0')
  .max(100, 'Weight cannot exceed 100')
  .finite('Weight must be a finite number');

/**
 * Item share schema for assignments
 */
export const ItemShareSchema = z.object({
  itemId: z.string().min(1),
  personId: z.string().min(1),
  weight: WeightSchema
});

/**
 * Batch weight update schema
 */
export const BatchWeightUpdateSchema = z.object({
  shares: z.array(ItemShareSchema).min(1, 'At least one share is required')
});

export type WeightPayload = z.infer<typeof WeightSchema>;
export type ItemSharePayload = z.infer<typeof ItemShareSchema>;
export type BatchWeightUpdatePayload = z.infer<typeof BatchWeightUpdateSchema>;
export type PersonPayload = z.infer<typeof PersonSchema>;
export type BillCreatePayload = z.infer<typeof BillCreateSchema>;