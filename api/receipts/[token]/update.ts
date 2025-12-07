import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../../_utils/cors.js';
import {
  createRequestContext,
  sendErrorResponse,
  sendSuccessResponse,
  logRequestCompletion
} from '../../_utils/request.js';
import { checkRateLimit } from '../../_utils/rateLimit.js';

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Apply CORS
  if (applyCors(req, res)) return;

  // Create request context
  const ctx = createRequestContext(req as any, res as any, 'receipt_update');

  try {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(req as any, 'update_receipt', ctx);
    if (!rateLimitCheck.success) {
      sendErrorResponse(res as any, rateLimitCheck.error, 429, ctx);
      return;
    }

    // Only allow PUT
    if (req.method !== 'PUT') {
      const error = { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' };
      sendErrorResponse(res as any, error, 405, ctx);
      return;
    }

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      const error = { error: 'Token is required', code: 'MISSING_TOKEN' };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    if (!supabaseAdmin) {
      const error = { error: 'Database not configured', code: 'DB_NOT_CONFIGURED' };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    // Parse request body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Build update object from provided fields
    const updateData: any = {};

    if (body.place !== undefined) updateData.place = body.place;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.subtotal !== undefined) updateData.subtotal = Number(body.subtotal);
    if (body.sales_tax !== undefined) updateData.sales_tax = Number(body.sales_tax);
    if (body.tip !== undefined) updateData.tip = Number(body.tip);

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      const error = { error: 'No fields to update', code: 'NO_FIELDS' };
      sendErrorResponse(res as any, error, 400, ctx);
      return;
    }

    console.log('[receipt_update] Updating receipt:', token, updateData);

    // Update the receipt
    const { data: receipt, error: updateError } = await supabaseAdmin
      .from('tabby_receipts')
      .update(updateData)
      .or(`editor_token.eq.${token},viewer_token.eq.${token}`)
      .select('id, editor_token, viewer_token, title, place, date, subtotal, sales_tax, tip')
      .single();

    if (updateError) {
      console.error('[receipt_update] Error updating receipt:', updateError);
      const error = { error: 'Failed to update receipt', code: 'UPDATE_FAILED', details: updateError.message };
      sendErrorResponse(res as any, error, 500, ctx);
      return;
    }

    if (!receipt) {
      const error = { error: 'Receipt not found', code: 'NOT_FOUND' };
      sendErrorResponse(res as any, error, 404, ctx);
      return;
    }

    console.log('[receipt_update] Receipt updated successfully:', receipt.id);

    // Send success response
    sendSuccessResponse(res as any, { receipt }, 200, ctx);
    logRequestCompletion(ctx, 200);

  } catch (error: any) {
    ctx.log('error', 'Unexpected error updating receipt', {
      error: error.message,
      stack: error.stack
    });

    const errorResponse = {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    };

    sendErrorResponse(res as any, errorResponse, 500, ctx);
    logRequestCompletion(ctx, 500, error.message);
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
