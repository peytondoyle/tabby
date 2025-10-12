// api/receipts/create.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import { applyCors } from "../_utils/cors.js";
import { createRequestContext, validateRequest, checkRequestSize, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from "../_utils/request.js";
import { checkRateLimit, addRateLimitHeaders } from "../_utils/rateLimit.js";
import { CreateReceiptRequestSchema, CreateReceiptRequest, FILE_LIMITS } from "../_utils/schemas.js";
import { createReceipt as saveReceipt } from "../_utils/memoryDb.js";
import { nanoid } from 'nanoid';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS first
  if (applyCors(req as any, res as any)) return;

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'receipts_create');

  try {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(req as any, 'create_receipt', ctx);
    if (!rateLimitCheck.success) {
      sendErrorResponse(res as any, rateLimitCheck.error, 429, ctx);
      return;
    }

    // Check request size limits
    const sizeCheck = checkRequestSize(req as any, FILE_LIMITS.maxJsonSize, ctx);
    if (!sizeCheck.success) {
      sendErrorResponse(res as any, sizeCheck.error, 413, ctx);
      return;
    }

    // Only allow POST
    if (req.method !== "POST") {
      const error = { error: "Method Not Allowed", code: "METHOD_NOT_ALLOWED" };
      sendErrorResponse(res as any, error, 405, ctx);
      return;
    }

    // Parse and validate request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Handle both direct format and wrapped format
    let requestData: any;
    if (body.parsed) {
      // Frontend sends { parsed: { items, place, total, date } }
      const parsed = body.parsed;
      requestData = {
        items: parsed.items || [],
        place: parsed.place,
        total: parsed.total,
        date: parsed.date
      };
    } else {
      // Direct format { items, place, total, date, people, tax, tip }
      requestData = body;
    }

    // Log the data being validated for debugging
    console.log('[receipt_create] Request data:', JSON.stringify(requestData, null, 2))

    const validation = validateRequest(requestData, CreateReceiptRequestSchema, ctx);
    if (!validation.success) {
      console.error('[receipt_create] Validation failed:', validation.error)
      sendErrorResponse(res as any, validation.error, 400, ctx);
      return;
    }

    const { items, place, total, date, people, tax, tip, user_id } = validation.data as CreateReceiptRequest;

    // Log user_id if present
    if (user_id) {
      console.log('[receipt_create] Creating receipt for user:', user_id);
    }

    // Generate tokens (Supabase format: e_ for editor, v_ for viewer)
    const editorToken = `e_${nanoid(16)}`;
    const viewerToken = `v_${nanoid(16)}`;

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);

    // Transform items to consistent schema
    const receiptItems = items.map((item, index) => ({
      id: item.id || `item_${Date.now()}_${index}`,
      label: item.name,
      price: item.price,
      emoji: item.icon || '🍽️',
      quantity: 1
    }));

    let receiptId = editorToken;

    // Try to save to Supabase if available
    if (supabaseAdmin) {
      try {
        console.log('[receipt_create] Saving to Supabase...')

        // Insert receipt
        const { data: receiptData, error: receiptError } = await supabaseAdmin
          .from('receipts')
          .insert({
            editor_token: editorToken,
            viewer_token: viewerToken,
            title: place || 'Receipt Upload',
            place: place || null,
            date: date || new Date().toISOString().split('T')[0],
            subtotal: subtotal,
            sales_tax: tax || 0,
            tip: tip || 0,
          })
          .select('id')
          .single();

        if (receiptError) {
          console.error('[receipt_create] Supabase receipt error:', receiptError);
          throw receiptError;
        }

        receiptId = receiptData.id;
        console.log('[receipt_create] Receipt saved to Supabase with ID:', receiptId);

        // Insert items and get their IDs back
        const itemIdMap = new Map<string, string>(); // old ID -> new Supabase ID
        if (receiptItems.length > 0) {
          const itemsToInsert = receiptItems.map(item => ({
            receipt_id: receiptId,
            label: item.label,
            unit_price: item.price,
            emoji: item.emoji,
            qty: item.quantity
          }));

          const { data: insertedItems, error: itemsError } = await supabaseAdmin
            .from('items')
            .insert(itemsToInsert)
            .select('id');

          if (itemsError) {
            console.error('[receipt_create] Supabase items error:', itemsError);
            // Continue anyway - items can be added later
          } else {
            console.log('[receipt_create] Items saved to Supabase');
            // Map old item IDs to new Supabase IDs
            receiptItems.forEach((item, index) => {
              if (insertedItems && insertedItems[index]) {
                itemIdMap.set(item.id, insertedItems[index].id);
              }
            });
          }
        }

        // Insert people and their item assignments if provided
        if (people && people.length > 0) {
          const peopleToInsert = people.map(person => ({
            receipt_id: receiptId,
            name: person.name
          }));

          const { data: insertedPeople, error: peopleError } = await supabaseAdmin
            .from('people')
            .insert(peopleToInsert)
            .select('id');

          if (peopleError) {
            console.error('[receipt_create] Supabase people error:', peopleError);
          } else {
            console.log('[receipt_create] People saved to Supabase');

            // Create item_shares for each person's items
            const itemShares: any[] = [];
            people.forEach((person, personIndex) => {
              if (insertedPeople && insertedPeople[personIndex]) {
                const personId = insertedPeople[personIndex].id;
                // Map old item IDs to new Supabase IDs
                person.items.forEach(oldItemId => {
                  const newItemId = itemIdMap.get(oldItemId);
                  if (newItemId) {
                    itemShares.push({
                      item_id: newItemId,
                      person_id: personId,
                      weight: 1
                    });
                  }
                });
              }
            });

            if (itemShares.length > 0) {
              const { error: sharesError } = await supabaseAdmin
                .from('item_shares')
                .insert(itemShares);

              if (sharesError) {
                console.error('[receipt_create] Supabase item_shares error:', sharesError);
              } else {
                console.log('[receipt_create] Item shares saved to Supabase');
              }
            }
          }
        }

      } catch (error) {
        console.error('[receipt_create] Supabase save failed:', error);
        // Fall back to memory storage
      }
    } else {
      console.log('[receipt_create] Supabase not configured, using memory storage');
    }

    // Also save to in-memory storage as backup
    saveReceipt({
      id: receiptId,
      token: editorToken,
      title: place || 'Receipt Upload',
      place: place || null,
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      item_count: items.length,
      people_count: people.length,
      total_amount: total || null,
      user_id: user_id || null,
      items: receiptItems
    });

    // Create response
    const receipt = {
      id: receiptId,
      token: editorToken,
      editor_token: editorToken,
      viewer_token: viewerToken,
      title: place || "Receipt Upload",
      place: place || null,
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      subtotal: subtotal,
      sales_tax: tax || null,
      tip: tip || null,
      total_amount: total || null,
      item_count: items.length,
      people_count: people.length,
      currency: 'USD',
    };

    console.log('[receipt_create] Receipt created:', editorToken)

    // Add rate limit headers
    addRateLimitHeaders(res as any, req as any, 'create_receipt');

    // Send success response
    const responseData = {
      receipt,
      items: receiptItems,
      createdAt: receipt.created_at,
    };

    sendSuccessResponse(res as any, responseData, 201, ctx);

    // Log successful completion
    logRequestCompletion(ctx, 201);

  } catch (err: any) {
    ctx.log('error', 'Unexpected error in receipt creation', {
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
