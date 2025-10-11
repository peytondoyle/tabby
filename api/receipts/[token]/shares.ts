// api/receipts/[token]/shares.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import { applyCors } from "../../_utils/cors.js";
import { createRequestContext, validateRequest, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from "../../_utils/request.js";
import { z } from 'zod';

// Server-side Supabase client using secret key
const supabaseAdmin = process.env.SUPABASE_SECRET_KEY && process.env.VITE_SUPABASE_URL
  ? createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// Schema for item shares (assignments)
const ItemShareSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  person_id: z.string().min(1, "Person ID is required"),
  weight: z.number().positive("Weight must be positive").max(100, "Weight cannot exceed 100"),
});

const UpdateSharesSchema = z.object({
  shares: z.array(ItemShareSchema),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS first
  if (applyCors(req as any, res as any)) return;

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'receipts_shares');

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      const error = { error: "Token is required", code: "INVALID_TOKEN" };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    // Only allow POST/PUT for updating shares
    if (req.method !== "POST" && req.method !== "PUT") {
      const error = { error: "Method Not Allowed", code: "METHOD_NOT_ALLOWED" };
      sendErrorResponse(res as any, error, 405, ctx);
      return;
    }

    if (!supabaseAdmin) {
      const error = { error: "Database not configured", code: "DB_NOT_CONFIGURED" };
      sendErrorResponse(res as any, error, 503, ctx);
      return;
    }

    // Parse and validate request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const validation = validateRequest(body, UpdateSharesSchema, ctx);
    if (!validation.success) {
      sendErrorResponse(res as any, validation.error, 400, ctx);
      return;
    }

    const { shares } = validation.data;

    // First, fetch the receipt to get its ID and validate token
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .select('id')
      .or(`id.eq.${token},editor_token.eq.${token},viewer_token.eq.${token}`)
      .single();

    if (receiptError || !receipt) {
      console.error('[receipts_shares] Receipt not found:', receiptError);
      const error = { error: "Receipt not found", code: "RECEIPT_NOT_FOUND" };
      sendErrorResponse(res as any, error, 404, ctx);
      return;
    }

    console.log('[receipts_shares] Updating shares for receipt:', receipt.id);

    // Get all items for this receipt to validate shares
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id')
      .eq('receipt_id', receipt.id);

    if (itemsError) {
      console.error('[receipts_shares] Error fetching items:', itemsError);
      const error = { error: "Failed to fetch items", code: "DB_FETCH_FAILED" };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    const itemIds = new Set(items?.map(item => item.id) || []);

    // Validate that all item_ids in shares belong to this receipt
    const invalidShares = shares.filter(share => !itemIds.has(share.item_id));
    if (invalidShares.length > 0) {
      console.error('[receipts_shares] Invalid item IDs in shares:', invalidShares);
      const error = { error: "Some items do not belong to this receipt", code: "INVALID_ITEM_IDS" };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    // Delete existing shares for this receipt's items
    const { error: deleteError } = await supabaseAdmin
      .from('item_shares')
      .delete()
      .in('item_id', Array.from(itemIds));

    if (deleteError) {
      console.error('[receipts_shares] Error deleting old shares:', deleteError);
      // Continue anyway - may not have had shares before
    }

    // Insert new shares (if any)
    if (shares.length > 0) {
      const sharesToInsert = shares.map(share => ({
        item_id: share.item_id,
        person_id: share.person_id,
        weight: share.weight,
      }));

      const { data: insertedShares, error: insertError } = await supabaseAdmin
        .from('item_shares')
        .insert(sharesToInsert)
        .select();

      if (insertError) {
        console.error('[receipts_shares] Error inserting shares:', insertError);
        const error = { error: "Failed to save assignments", code: "DB_INSERT_FAILED" };
        sendErrorResponse(res as any, error, 500, ctx);
        return;
      }

      console.log('[receipts_shares] Successfully saved shares:', insertedShares?.length);

      // Send success response
      const responseData = {
        shares: insertedShares,
        count: insertedShares?.length || 0,
      };

      sendSuccessResponse(res as any, responseData, 200, ctx);
    } else {
      // No shares to insert, just return success
      sendSuccessResponse(res as any, { shares: [], count: 0 }, 200, ctx);
    }

    logRequestCompletion(ctx, 200);

  } catch (err: any) {
    ctx.log('error', 'Unexpected error updating shares', {
      error: err.message,
      stack: err.stack
    });

    const error = {
      error: "Internal Server Error",
      code: "INTERNAL_ERROR"
    };

    sendErrorResponse(res as any, error, 500, ctx);
    logRequestCompletion(ctx, 500, err.message);
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
