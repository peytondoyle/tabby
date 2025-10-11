// api/receipts/[token]/people.ts
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

// Schema for adding/updating people
const PersonSchema = z.object({
  id: z.string().optional(), // If provided, update existing person
  name: z.string().min(1, "Name is required"),
  avatar_url: z.string().nullable().optional(),
  venmo_handle: z.string().nullable().optional(),
});

const UpdatePeopleSchema = z.object({
  people: z.array(PersonSchema).min(1, "At least one person is required"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS first
  if (applyCors(req as any, res as any)) return;

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'receipts_people');

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      const error = { error: "Token is required", code: "INVALID_TOKEN" };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    // Only allow POST/PUT for updating people
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

    const validation = validateRequest(body, UpdatePeopleSchema, ctx);
    if (!validation.success) {
      sendErrorResponse(res as any, validation.error, 400, ctx);
      return;
    }

    const { people } = validation.data;

    // First, fetch the receipt to get its ID
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .select('id')
      .or(`id.eq.${token},editor_token.eq.${token},viewer_token.eq.${token}`)
      .single();

    if (receiptError || !receipt) {
      console.error('[receipts_people] Receipt not found:', receiptError);
      const error = { error: "Receipt not found", code: "RECEIPT_NOT_FOUND" };
      sendErrorResponse(res as any, error, 404, ctx);
      return;
    }

    console.log('[receipts_people] Updating people for receipt:', receipt.id);

    // Delete existing people for this receipt (we'll recreate them)
    const { error: deleteError } = await supabaseAdmin
      .from('people')
      .delete()
      .eq('receipt_id', receipt.id);

    if (deleteError) {
      console.error('[receipts_people] Error deleting old people:', deleteError);
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
      .from('people')
      .insert(peopleToInsert)
      .select();

    if (insertError) {
      console.error('[receipts_people] Error inserting people:', insertError);
      const error = { error: "Failed to save people", code: "DB_INSERT_FAILED" };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    console.log('[receipts_people] Successfully saved people:', insertedPeople?.length);

    // Send success response
    const responseData = {
      people: insertedPeople,
      count: insertedPeople?.length || 0,
    };

    sendSuccessResponse(res as any, responseData, 200, ctx);
    logRequestCompletion(ctx, 200);

  } catch (err: any) {
    ctx.log('error', 'Unexpected error updating people', {
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
