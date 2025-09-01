// api/bills/create.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_utils/cors";
import { createRequestContext, validateRequest, checkRequestSize, sendErrorResponse, sendSuccessResponse, logRequestCompletion } from "../_utils/request";
import { checkRateLimit, addRateLimitHeaders } from "../_utils/rateLimit";
import { CreateBillRequestSchema, CreateBillRequest, BillSchema, BillItemSchema, FILE_LIMITS } from "../_utils/schemas";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS first
  if (applyCors(req as any, res as any)) return;

  // Create request context for consistent logging
  const ctx = createRequestContext(req as any, res as any, 'bills_create');
  
  try {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(req as any, 'create_bill', ctx);
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
    
    const validation = validateRequest(body, CreateBillRequestSchema, ctx);
    if (!validation.success) {
      sendErrorResponse(res as any, validation.error, 400, ctx);
      return;
    }

    const { items, place, total, date } = validation.data as CreateBillRequest;

    // Generate bill ID
    const billId = `bill_${Date.now()}`;
    
    // Create bill response using consistent schema
    const bill = {
      id: billId,
      title: place || "Receipt Upload",
      place: place || null,
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      subtotal: null,
      sales_tax: null,
      tip: null,
      total_amount: total || null,
      item_count: items.length,
      people_count: 0,
      currency: 'USD'
    };

    // Transform items to consistent schema
    const billItems = items.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      label: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️',
      quantity: item.quantity || 1
    }));

    // Add rate limit headers
    addRateLimitHeaders(res as any, req as any, 'create_bill');

    // Send success response
    const responseData = {
      bill,
      items: billItems,
      createdAt: bill.created_at,
    };

    sendSuccessResponse(res as any, responseData, 201, ctx);
    
    // Log successful completion
    logRequestCompletion(ctx, 201);

  } catch (err: any) {
    ctx.log('error', 'Unexpected error in bill creation', { 
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