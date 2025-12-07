// api/receipts/[token]/assign.ts
// Combined endpoint to update both people AND shares in a single request
// This reduces API calls from 2 per drag to 1 per drag (50% reduction!)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import { applyCors } from "../../_utils/cors.js";
import { createRequestContext, validateRequest, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from "../../_utils/request.js";
import { z } from 'zod';

// Server-side Supabase client using secret key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_KEY
  ? createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// Combined schema for people and shares
const PersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  avatar_url: z.string().nullable().optional(),
  venmo_handle: z.string().nullable().optional(),
});

const ItemShareSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  person_id: z.string().min(1, "Person ID is required"),
  weight: z.number().positive("Weight must be positive").max(100, "Weight cannot exceed 100"),
});

const AssignSchema = z.object({
  people: z.array(PersonSchema).min(1, "At least one person is required"),
  shares: z.array(ItemShareSchema),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS first
  if (applyCors(req as any, res as any)) return;

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'receipts_assign');

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      const error = { error: "Token is required", code: "INVALID_TOKEN" };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    // Only allow POST/PUT
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

    const validation = validateRequest(body, AssignSchema, ctx);
    if (!validation.success) {
      sendErrorResponse(res as any, validation.error, 400, ctx);
      return;
    }

    const { people, shares } = validation.data;

    // Fetch the receipt to get its ID
    console.log('[receipts_assign] Looking for receipt with token:', token);

    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('tabby_receipts')
      .select('id, editor_token, viewer_token')
      .or(`editor_token.eq.${token},viewer_token.eq.${token}`)
      .single();

    if (receiptError || !receipt) {
      console.error('[receipts_assign] Receipt not found:', receiptError);
      const error = { error: "Receipt not found", code: "RECEIPT_NOT_FOUND" };
      sendErrorResponse(res as any, error, 404, ctx);
      return;
    }

    console.log('[receipts_assign] Updating people and shares for receipt:', receipt.id);

    // ==================== UPDATE PEOPLE ====================
    // Delete existing people for this receipt
    const { error: deleteError } = await supabaseAdmin
      .from('tabby_people')
      .delete()
      .eq('receipt_id', receipt.id);

    if (deleteError) {
      console.error('[receipts_assign] Error deleting old people:', deleteError);
      // Continue anyway - may not have had people before
    }

    // Insert new people
    const peopleToInsert = people.map(person => ({
      receipt_id: receipt.id,
      name: person.name,
      avatar_url: person.avatar_url || null,
      venmo_handle: person.venmo_handle || null,
    }));

    const { data: insertedPeople, error: insertError } = await supabaseAdmin
      .from('tabby_people')
      .insert(peopleToInsert)
      .select();

    if (insertError) {
      console.error('[receipts_assign] Error inserting people:', insertError);
      const error = { error: "Failed to save people", code: "DB_INSERT_FAILED" };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    console.log('[receipts_assign] Successfully saved people:', insertedPeople?.length);

    // ==================== MAP PERSON IDS ====================
    // Create mapping from old client IDs to new Supabase UUIDs
    // Client sends temp IDs like "temp_person_1", we need to map to Supabase UUIDs
    const personIdMap = new Map<string, string>();
    people.forEach((clientPerson, index) => {
      const dbPerson = insertedPeople?.[index];
      if (dbPerson && clientPerson.id) {
        personIdMap.set(clientPerson.id, dbPerson.id);
      }
    });

    console.log('[receipts_assign] Person ID mapping:', Object.fromEntries(personIdMap));

    // ==================== UPDATE SHARES ====================
    // Get all items for this receipt to validate shares
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('tabby_items')
      .select('id')
      .eq('receipt_id', receipt.id);

    if (itemsError) {
      console.error('[receipts_assign] Error fetching items:', itemsError);
      const error = { error: "Failed to fetch items", code: "DB_FETCH_FAILED" };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    const itemIds = new Set(items?.map(item => item.id) || []);

    // Map person IDs in shares from client IDs to Supabase UUIDs
    const mappedShares = shares.map(share => ({
      ...share,
      person_id: personIdMap.get(share.person_id) || share.person_id
    }));

    // Validate that all item_ids in shares belong to this receipt
    const invalidShares = mappedShares.filter(share => !itemIds.has(share.item_id));
    if (invalidShares.length > 0) {
      console.error('[receipts_assign] Invalid item IDs in shares:', invalidShares);
      const error = { error: "Some items do not belong to this receipt", code: "INVALID_ITEM_IDS" };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    // Get existing shares to determine what to delete
    const { data: existingShares } = await supabaseAdmin
      .from('tabby_item_shares')
      .select('item_id, person_id')
      .in('item_id', Array.from(itemIds));

    const existingKeys = new Set(
      existingShares?.map(s => `${s.item_id}:${s.person_id}`) || []
    );

    const newKeys = new Set(
      mappedShares.map(s => `${s.item_id}:${s.person_id}`)
    );

    // Delete shares that no longer exist (user unassigned items)
    const keysToDelete = [...existingKeys].filter(k => !newKeys.has(k));
    if (keysToDelete.length > 0) {
      console.log('[receipts_assign] Deleting', keysToDelete.length, 'removed shares');

      for (const key of keysToDelete) {
        const [item_id, person_id] = key.split(':');
        const { error: deleteShareError } = await supabaseAdmin
          .from('tabby_item_shares')
          .delete()
          .eq('item_id', item_id)
          .eq('person_id', person_id);

        if (deleteShareError) {
          console.error('[receipts_assign] Error deleting share:', deleteShareError);
        }
      }
    }

    // UPSERT new/updated shares (with mapped person IDs)
    let upsertedShares = [];
    if (mappedShares.length > 0) {
      const sharesToUpsert = mappedShares.map(share => ({
        item_id: share.item_id,
        person_id: share.person_id,
        weight: share.weight,
      }));

      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('tabby_item_shares')
        .upsert(sharesToUpsert, {
          onConflict: 'item_id,person_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        console.error('[receipts_assign] Error upserting shares:', upsertError);
        const error = { error: "Failed to save assignments", code: "DB_UPSERT_FAILED" };
        sendErrorResponse(res as any, error, 500, ctx);
        return;
      }

      upsertedShares = upsertData || [];
      console.log('[receipts_assign] Successfully upserted shares:', upsertedShares.length);
    }

    // Send combined success response
    const responseData = {
      people: insertedPeople,
      peopleCount: insertedPeople?.length || 0,
      shares: upsertedShares,
      sharesCount: upsertedShares.length,
    };

    sendSuccessResponse(res as any, responseData, 200, ctx);
    logRequestCompletion(ctx, 200);

  } catch (err: any) {
    ctx.log('error', 'Unexpected error in combined assign', {
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
