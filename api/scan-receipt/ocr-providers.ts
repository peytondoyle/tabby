import OpenAI from 'openai';

export interface OCRResult {
  place?: string | null;
  date?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  tip?: number | null;
  discount?: number | null;
  service_fee?: number | null;
  total?: number | null;
  rawText?: string | null;
  items: Array<{
    label: string;
    price: number;
    emoji?: string | null;
  }>;
  provider: string;
  confidence?: number;
  processingTime: number;
  // NEW: Enhanced analysis fields
  validation?: {
    itemsMatchSubtotal: boolean;
    totalsMatch: boolean;
    calculatedSubtotal: number;
    calculatedTotal: number;
    discrepancy?: number;
    warnings: string[];
  };
  fieldConfidence?: {
    place: 'high' | 'medium' | 'low';
    date: 'high' | 'medium' | 'low';
    subtotal: 'high' | 'medium' | 'low';
    tax: 'high' | 'medium' | 'low';
    tip: 'high' | 'medium' | 'low';
    total: 'high' | 'medium' | 'low';
    items: 'high' | 'medium' | 'low';
  };
  handwrittenFields?: string[];  // Fields that appear to be handwritten
  suggestedCorrections?: Array<{
    field: string;
    currentValue: number | string | null;
    suggestedValue: number | string;
    reason: string;
  }>;
}

export interface OCRProvider {
  name: string;
  isConfigured(): boolean;
  process(imageBuffer: Buffer, mimeType: string, promptModification?: string): Promise<OCRResult>;
}

// OpenAI Provider
class OpenAIProvider implements OCRProvider {
  name = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      // Strip quotes that may have been added by environment variable storage
      const apiKey = process.env.OPENAI_API_KEY.replace(/^["']|["']$/g, '').trim();
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async process(imageBuffer: Buffer, mimeType: string, promptModification?: string): Promise<OCRResult> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const startTime = Date.now();
    console.log(`[openai_ocr] Starting OpenAI processing, image size: ${imageBuffer.length} bytes`);
    if (promptModification) {
      console.log(`[openai_ocr] Using prompt modification from A/B test`);
    }
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // Build base prompt with optional A/B test modification
    const basePromptIntro = `You are an expert receipt analyzer. Extract ALL data from this receipt image with high precision.`;
    const abTestSection = promptModification ? `\n\n${promptModification}\n` : '';

    console.log(`[openai_ocr] Calling GPT-4o vision API...`);
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${basePromptIntro}${abTestSection}

Return JSON in this EXACT format:
{
  "place": "Restaurant Name",
  "date": "YYYY-MM-DD",
  "items": [{"label": "Item Name", "price": 12.00}],
  "subtotal": 0.00,
  "discount": 0.00,
  "service_fee": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00,
  "fieldConfidence": {
    "place": "high|medium|low",
    "date": "high|medium|low",
    "subtotal": "high|medium|low",
    "tax": "high|medium|low",
    "tip": "high|medium|low",
    "total": "high|medium|low",
    "items": "high|medium|low"
  },
  "handwrittenFields": ["tip", "total"],
  "receiptType": "customer_copy|merchant_copy|itemized|summary"
}

═══════════════════════════════════════════════════════════════
🔍 HANDWRITTEN TEXT DETECTION - CRITICAL!
═══════════════════════════════════════════════════════════════
Many receipts have HANDWRITTEN tips and totals. Look carefully for:
- Handwritten numbers in the TIP line (often filled in by customer)
- Handwritten TOTAL at the bottom (customer's final amount)
- Handwriting looks different from printed text - often slanted, uneven, or in pen/pencil
- Customer copy receipts often have blank tip/total lines that were filled in by hand

If you see handwritten amounts:
1. Extract them as the actual values
2. Add the field name to "handwrittenFields" array
3. Set confidence to "medium" for handwritten values

═══════════════════════════════════════════════════════════════
📋 RECEIPT TYPE DETECTION
═══════════════════════════════════════════════════════════════
Identify the receipt type:
- "customer_copy": Has signature line, tip line, often handwritten totals
- "merchant_copy": Store's copy, may have different info
- "itemized": Full itemized receipt with all items
- "summary": Summary receipt without individual items

═══════════════════════════════════════════════════════════════
🍔 FOOD/DRINK ITEMS
═══════════════════════════════════════════════════════════════
- Extract ALL food and drink items with FULL prices
- Copy item names EXACTLY as written (preserve spelling, caps, special chars)
- DO NOT include taxes, tips, fees, or discounts as items

**PRICE EXTRACTION - CRITICAL:**
- Read prices VERY CAREFULLY - look at EACH DIGIT
- Prices are typically RIGHT-ALIGNED in a column
- If unsure, re-read the price digit by digit from left to right

⚠️ COMMON OCR MISTAKES TO AVOID:
┌─────────────────────────────────────────────────────────────┐
│ WRONG → CORRECT   │ EXPLANATION                             │
├─────────────────────────────────────────────────────────────┤
│ $19 → $90         │ Dropped leading digit (9→19)            │
│ $11 → $16         │ Misread 6 as 1                          │
│ $2 → $12          │ Dropped leading 1                       │
│ $6 → $16          │ Missed tens digit                       │
│ $1299 → $12.99    │ Missing decimal point                   │
│ $O.00 → $0.00     │ Letter O vs number 0                    │
│ $l2.50 → $12.50   │ Letter l vs number 1                    │
│ $5.OO → $5.00     │ Letter O vs number 0                    │
└─────────────────────────────────────────────────────────────┘

PRICE SANITY CHECKS (flag if outside these ranges):
- Appetizers/sides: $5-20
- Entrees/mains: $12-45
- Cocktails/premium drinks: $8-20
- Beer/wine by glass: $6-18
- Desserts: $6-15
- Activities (bowling, golf, etc.): $20-150

If a price seems wrong for the item category, RE-READ IT carefully!

**QUANTITY HANDLING - CRITICAL:**
- ALWAYS include quantity prefix when present in ANY format
- "3 Cold Beverage $10.50" → {"label": "3 Cold Beverage", "price": 10.50}
- "Topgolf Gameplay x2 $90" → {"label": "2 Topgolf Gameplay", "price": 90}
- "Beer (2) $16" → {"label": "2 Beer", "price": 16}
- "2 @ $45.00 Gameplay $90" → {"label": "2 Gameplay", "price": 90}
- Look for quantities shown as: "2 Item", "Item x2", "Item (2)", "2 @ price"
- NORMALIZE quantity to START of label: "2 ItemName"
- Keep TOTAL price, DO NOT divide prices

═══════════════════════════════════════════════════════════════
💰 FINANCIAL FIELDS - READ CAREFULLY!
═══════════════════════════════════════════════════════════════
**SUBTOTAL**: Sum of items after discounts, before tax/tip/fees
  - This should approximately equal the sum of all item prices
  - If your items sum to much less than the subtotal shown, RE-CHECK PRICES

**TAX**: Look for "Tax", "Sales Tax", "GST", "VAT"
  - Usually 5-10% of subtotal
  - MUST extract this value - do NOT return 0 if tax is shown on receipt
  - Read the exact dollar amount shown

**TIP**: "Tip", "Gratuity" - CHECK FOR HANDWRITTEN VALUES!
**TOTAL**: Final amount - CHECK FOR HANDWRITTEN VALUES!
  - TOTAL should equal SUBTOTAL + TAX + TIP (approximately)
  - If math doesn't work, re-check all values

**DISCOUNT**: Sum ALL discounts/promos/benefits as POSITIVE number
**SERVICE_FEE**: Sum ALL fees (delivery, service, platform, etc.)

═══════════════════════════════════════════════════════════════
🧮 VALIDATION - MUST DO BEFORE RETURNING!
═══════════════════════════════════════════════════════════════
BEFORE returning your answer, CHECK THE MATH:

1. Add up all your item prices: item1 + item2 + item3 + ...
2. Compare to the SUBTOTAL shown on receipt
3. If your sum is MORE THAN $5 different from subtotal:
   - You probably misread some prices
   - GO BACK and re-read each price digit by digit
   - Look especially for prices $10+ that you may have read as single digits

Common errors that cause large discrepancies:
- Reading $90 as $19 (dropped leading digit)
- Reading $16 as $11 or $6
- Reading $12 as $2
- Missing the tens digit entirely

If items sum ≈ subtotal (±$2): Good, proceed
If items sum << subtotal: RE-READ ALL PRICES BEFORE RETURNING

═══════════════════════════════════════════════════════════════
⚠️ CONFIDENCE SCORING
═══════════════════════════════════════════════════════════════
For each field, rate confidence:
- "high": Clearly printed, easy to read
- "medium": Handwritten, slightly blurry, or unusual format
- "low": Very hard to read, guessing, or couldn't find

Return 0.00 for fields not found (not null).
Extract ACTUAL VALUES from this receipt image.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0
    });

    const elapsed = Date.now() - startTime;
    console.log(`[openai_ocr] GPT-4o responded in ${elapsed}ms`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    console.log(`[openai_ocr] Response content length: ${content.length} chars`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const processingTime = Date.now() - startTime;

    // Calculate validation metrics
    const items = parsed.items || [];
    const calculatedSubtotal = items.reduce((sum: number, item: { price: number }) => sum + (item.price || 0), 0);
    const subtotal = parsed.subtotal || 0;
    const tax = parsed.tax || 0;
    let tip = parsed.tip || 0;
    const discount = parsed.discount || 0;
    const serviceFee = parsed.service_fee || 0;
    const total = parsed.total || 0;
    const handwrittenFields: string[] = parsed.handwrittenFields || [];
    const fieldConfidence = { ...parsed.fieldConfidence } || {};

    // #1: TIERED VALIDATION TOLERANCE based on subtotal amount
    const getToleranceForAmount = (amount: number): number => {
      if (amount <= 20) return 0.25;      // Small receipts: ±$0.25
      if (amount <= 100) return 1.00;     // Medium receipts: ±$1.00
      return amount * 0.02;               // Large receipts: ±2%
    };

    const subtotalTolerance = getToleranceForAmount(subtotal);
    const totalTolerance = getToleranceForAmount(total);

    // Expected total calculation
    const calculatedTotal = subtotal - discount + serviceFee + tax + tip;
    const itemsDiff = Math.abs(calculatedSubtotal - subtotal);
    const totalsDiff = Math.abs(calculatedTotal - total);
    const itemsMatchSubtotal = itemsDiff <= subtotalTolerance;
    const totalsMatch = totalsDiff <= totalTolerance;

    // Generate warnings with severity levels
    const warnings: string[] = [];
    const criticalWarnings: string[] = [];

    if (!itemsMatchSubtotal && items.length > 0) {
      const msg = `Items sum ($${calculatedSubtotal.toFixed(2)}) differs from subtotal ($${subtotal.toFixed(2)}) by $${itemsDiff.toFixed(2)}`;
      if (itemsDiff > subtotalTolerance * 2) {
        criticalWarnings.push(`CRITICAL: ${msg}`);
      } else {
        warnings.push(msg);
      }
    }
    if (!totalsMatch && total > 0) {
      const msg = `Calculated total ($${calculatedTotal.toFixed(2)}) differs from receipt total ($${total.toFixed(2)}) by $${totalsDiff.toFixed(2)}`;
      if (totalsDiff > totalTolerance * 2) {
        criticalWarnings.push(`CRITICAL: ${msg}`);
      } else {
        warnings.push(msg);
      }
    }

    // #2: HANDWRITTEN FIELD CONFIDENCE DEGRADATION
    if (handwrittenFields.includes('tip')) {
      fieldConfidence.tip = 'low';  // Force low confidence for handwritten tips
      warnings.push('Tip appears handwritten - manual verification recommended');
    }
    if (handwrittenFields.includes('total')) {
      fieldConfidence.total = 'low';
      warnings.push('Total appears handwritten - manual verification recommended');
    }

    // #3: PRICE BOUNDS VALIDATION
    const priceWarnings: string[] = [];
    for (const item of items) {
      const price = item.price || 0;
      const label = item.label || 'Unknown item';

      // Flag unusually high prices (likely OCR errors like $1299 instead of $12.99)
      if (price > 500) {
        priceWarnings.push(`"${label}" price $${price.toFixed(2)} seems unusually high - verify decimal placement`);
      }
      // Flag suspiciously low prices for food items (not modifiers)
      if (price > 0 && price < 0.50 && !label.toLowerCase().match(/^(add|extra|side|sauce|dressing)/)) {
        priceWarnings.push(`"${label}" price $${price.toFixed(2)} seems unusually low`);
      }
    }
    if (total > 10000) {
      criticalWarnings.push(`CRITICAL: Total $${total.toFixed(2)} exceeds expected range - verify receipt`);
    }
    warnings.push(...priceWarnings);

    // #4: TAX RATE SANITY CHECK
    if (subtotal > 0 && tax > 0) {
      const taxRate = (tax / subtotal) * 100;
      if (taxRate > 15) {
        warnings.push(`Tax rate ${taxRate.toFixed(1)}% seems unusually high (expected 5-12%)`);
      } else if (taxRate < 3 && taxRate > 0) {
        warnings.push(`Tax rate ${taxRate.toFixed(1)}% seems unusually low (expected 5-12%)`);
      }
    }

    // Customer copy with handwritten fields
    if (tip === 0 && handwrittenFields.includes('tip')) {
      warnings.push('Tip may be handwritten but was not extracted - please verify');
    }
    if (parsed.receiptType === 'customer_copy' && tip === 0) {
      warnings.push('Customer copy detected with no tip - tip may need manual entry');
    }

    // Combine all warnings (critical first)
    const allWarnings = [...criticalWarnings, ...warnings];

    // Generate suggested corrections
    const suggestedCorrections: Array<{ field: string; currentValue: number | string | null; suggestedValue: number | string; reason: string; confidence: 'high' | 'medium' | 'low' }> = [];

    // If items don't match subtotal but we have items, suggest using calculated subtotal
    if (!itemsMatchSubtotal && items.length > 0 && calculatedSubtotal > 0) {
      suggestedCorrections.push({
        field: 'subtotal',
        currentValue: subtotal,
        suggestedValue: Math.round(calculatedSubtotal * 100) / 100,
        reason: 'Calculated from item prices',
        confidence: itemsDiff < subtotalTolerance * 3 ? 'high' : 'medium'
      });
    }

    // If tip is 0 on a customer copy, flag it
    if (parsed.receiptType === 'customer_copy' && tip === 0 && total > subtotal + tax) {
      const possibleTip = total - subtotal - tax - serviceFee + discount;
      if (possibleTip > 0) {
        suggestedCorrections.push({
          field: 'tip',
          currentValue: tip,
          suggestedValue: Math.round(possibleTip * 100) / 100,
          reason: 'Calculated from total minus other fields',
          confidence: handwrittenFields.includes('total') ? 'low' : 'medium'
        });
      }
    }

    // Suggest price corrections for obvious decimal errors
    for (const item of items) {
      if (item.price > 500 && item.price < 10000) {
        // Likely missing decimal: 1299 -> 12.99
        const correctedPrice = item.price / 100;
        if (correctedPrice >= 5 && correctedPrice <= 100) {
          suggestedCorrections.push({
            field: `item:${item.label}`,
            currentValue: item.price,
            suggestedValue: correctedPrice,
            reason: 'Decimal point likely missing',
            confidence: 'medium'
          });
        }
      }
    }

    // Calculate overall confidence with degradation for issues
    const confidenceValues = Object.values(fieldConfidence) as string[];
    const hasLowConfidence = confidenceValues.some(c => c === 'low');
    const hasMediumConfidence = confidenceValues.some(c => c === 'medium');
    let overallConfidence = 0.95;
    if (hasLowConfidence) overallConfidence = 0.6;
    else if (hasMediumConfidence) overallConfidence = 0.8;
    // Degrade confidence for warnings
    if (criticalWarnings.length > 0) overallConfidence -= 0.2 * criticalWarnings.length;
    if (warnings.length > 0) overallConfidence -= 0.05 * warnings.length;
    // Degrade for handwritten fields
    if (handwrittenFields.length > 0) overallConfidence -= 0.1;
    overallConfidence = Math.max(0.2, overallConfidence);

    console.log(`[openai_ocr] Validation: items=${itemsMatchSubtotal}, totals=${totalsMatch}, warnings=${allWarnings.length}, confidence=${overallConfidence.toFixed(2)}`);

    return {
      place: parsed.place || null,
      date: parsed.date || null,
      subtotal: parsed.subtotal || null,
      tax: parsed.tax || null,
      tip: parsed.tip || null,
      discount: parsed.discount || null,
      service_fee: parsed.service_fee || null,
      total: parsed.total || null,
      rawText: parsed.rawText || content,
      items: parsed.items || [],
      provider: 'openai',
      confidence: overallConfidence,
      processingTime,
      // Enhanced fields
      validation: {
        itemsMatchSubtotal,
        totalsMatch,
        calculatedSubtotal: Math.round(calculatedSubtotal * 100) / 100,
        calculatedTotal: Math.round(calculatedTotal * 100) / 100,
        discrepancy: totalsDiff > totalTolerance ? Math.round(totalsDiff * 100) / 100 : undefined,
        warnings: allWarnings
      },
      fieldConfidence: fieldConfidence,
      handwrittenFields: handwrittenFields.length > 0 ? handwrittenFields : undefined,
      suggestedCorrections: suggestedCorrections.length > 0 ? suggestedCorrections : undefined
    };
  }
}

// Provider registry - currently only OpenAI is implemented
const providers: OCRProvider[] = [
  new OpenAIProvider()
];

// Get configured providers
export function getConfiguredProviders(): OCRProvider[] {
  return providers.filter(provider => provider.isConfigured());
}

// #8: Enhanced error classification for fallback decisions
interface OCRError extends Error {
  status?: number;
  code?: string;
  isRetryable: boolean;
  isRateLimited: boolean;
}

function classifyError(error: any): OCRError {
  const ocrError = new Error(error?.message || 'Unknown error') as OCRError;
  ocrError.status = error?.status || error?.response?.status;
  ocrError.code = error?.code;

  // Rate limited - retry with exponential backoff
  ocrError.isRateLimited = ocrError.status === 429;

  // Retryable errors: server errors, timeouts, rate limits
  ocrError.isRetryable = (
    ocrError.isRateLimited ||
    (ocrError.status !== undefined && ocrError.status >= 500) ||
    ocrError.code === 'ETIMEDOUT' ||
    ocrError.code === 'ECONNRESET' ||
    error?.message?.includes('timeout')
  );

  return ocrError;
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process with a single provider with retry logic
async function processWithRetry(
  provider: OCRProvider,
  imageBuffer: Buffer,
  mimeType: string,
  timeoutMs: number,
  maxRetries: number = 2,
  promptModification?: string
): Promise<OCRResult> {
  let lastError: OCRError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        provider.process(imageBuffer, mimeType, promptModification),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Provider ${provider.name} timeout`)), timeoutMs)
        )
      ]);

      console.log(`[ocr_providers] ${provider.name} completed in ${result.processingTime}ms (attempt ${attempt + 1})`);
      return result;
    } catch (error: any) {
      lastError = classifyError(error);

      // Don't retry non-retryable errors
      if (!lastError.isRetryable) {
        console.warn(`[ocr_providers] ${provider.name} failed with non-retryable error:`, lastError.message);
        throw lastError;
      }

      // Calculate delay: exponential backoff with jitter
      const baseDelay = lastError.isRateLimited ? 5000 : 1000;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

      if (attempt < maxRetries) {
        console.log(`[ocr_providers] ${provider.name} failed (attempt ${attempt + 1}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Provider ${provider.name} failed after ${maxRetries + 1} attempts`);
}

// Process with OpenAI provider (with retry logic)
export async function processWithMultipleProviders(
  imageBuffer: Buffer,
  mimeType: string,
  timeoutMs: number = 30000
): Promise<OCRResult> {
  const configuredProviders = getConfiguredProviders();

  if (configuredProviders.length === 0) {
    throw new Error('No OCR providers configured - please set OPENAI_API_KEY');
  }

  console.log(`[ocr_providers] Processing with ${configuredProviders.length} provider(s): ${configuredProviders.map(p => p.name).join(', ')}`);

  // Use primary provider (OpenAI) with retries
  const primaryProvider = configuredProviders[0];
  return await processWithRetry(primaryProvider, imageBuffer, mimeType, timeoutMs, 2);
}

// Re-extract specific fields that have low confidence or validation issues
export async function reExtractField(
  imageBuffer: Buffer,
  mimeType: string,
  fieldName: 'tip' | 'total' | 'subtotal' | 'tax',
  context?: { currentValue?: number; receiptType?: string }
): Promise<{ value: number | null; confidence: 'high' | 'medium' | 'low'; wasHandwritten: boolean }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OpenAI not configured for field re-extraction');
  }

  const client = new OpenAI({ apiKey: openaiKey.replace(/^["']|["']$/g, '').trim() });
  const base64Image = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64Image}`;

  const fieldPrompts: Record<string, string> = {
    tip: `Extract ONLY the TIP amount from this receipt.
Look carefully for:
- A line labeled "Tip", "Gratuity", or "Tip Amount"
- HANDWRITTEN numbers (often filled in by customer)
- The tip may be on the signature/payment portion of the receipt

Return JSON: { "value": 5.00, "wasHandwritten": true, "confidence": "medium" }
If no tip is visible, return: { "value": 0, "wasHandwritten": false, "confidence": "high" }`,

    total: `Extract ONLY the TOTAL amount from this receipt.
Look for:
- The final total at the bottom
- Labels like "Total", "Grand Total", "Amount Due", "Balance Due"
- May be HANDWRITTEN on customer copies

Return JSON: { "value": 45.67, "wasHandwritten": false, "confidence": "high" }`,

    subtotal: `Extract ONLY the SUBTOTAL amount from this receipt.
Look for:
- Sum of items BEFORE tax and tip
- Labels like "Subtotal", "Sub Total", "Food Total", "Items Total"

Return JSON: { "value": 38.50, "wasHandwritten": false, "confidence": "high" }`,

    tax: `Extract ONLY the TAX amount from this receipt.
Look for:
- Labels like "Tax", "Sales Tax", "GST", "VAT", "State Tax"
- Usually a single line item after subtotal

Return JSON: { "value": 3.27, "wasHandwritten": false, "confidence": "high" }`
  };

  const prompt = fieldPrompts[fieldName];
  const contextInfo = context?.currentValue
    ? `\n\nNote: We previously extracted ${fieldName} as $${context.currentValue} but need to verify this.`
    : '';

  try {
    console.log(`[ocr_reextract] Re-extracting ${fieldName} field...`);
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt + contextInfo },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const elapsed = Date.now() - startTime;

    console.log(`[ocr_reextract] ${fieldName} re-extracted in ${elapsed}ms: $${parsed.value} (${parsed.confidence}, handwritten: ${parsed.wasHandwritten})`);

    return {
      value: typeof parsed.value === 'number' ? parsed.value : null,
      confidence: parsed.confidence || 'medium',
      wasHandwritten: parsed.wasHandwritten || false
    };
  } catch (error) {
    console.error(`[ocr_reextract] Failed to re-extract ${fieldName}:`, error);
    return {
      value: null,
      confidence: 'low',
      wasHandwritten: false
    };
  }
}

// Enhance OCR result by re-extracting low-confidence fields
export async function enhanceOCRResult(
  result: OCRResult,
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const fieldsToReExtract: Array<'tip' | 'total' | 'subtotal' | 'tax'> = [];

  // Identify fields that need re-extraction
  if (result.fieldConfidence?.tip === 'low' || result.handwrittenFields?.includes('tip')) {
    fieldsToReExtract.push('tip');
  }
  if (result.fieldConfidence?.total === 'low' || result.handwrittenFields?.includes('total')) {
    fieldsToReExtract.push('total');
  }
  if (result.validation && !result.validation.totalsMatch && result.validation.discrepancy && result.validation.discrepancy > 2) {
    // If totals don't match, try re-extracting all financial fields
    fieldsToReExtract.push('subtotal', 'tax', 'total');
  }

  if (fieldsToReExtract.length === 0) {
    return result; // No re-extraction needed
  }

  console.log(`[ocr_enhance] Re-extracting ${fieldsToReExtract.length} low-confidence fields: ${fieldsToReExtract.join(', ')}`);

  const enhanced = { ...result };

  for (const field of fieldsToReExtract) {
    try {
      const reExtracted = await reExtractField(
        imageBuffer,
        mimeType,
        field,
        { currentValue: (result as any)[field] || 0 }
      );

      if (reExtracted.value !== null && reExtracted.confidence !== 'low') {
        // Update the result with re-extracted value
        (enhanced as any)[field] = reExtracted.value;

        // Update field confidence
        if (enhanced.fieldConfidence) {
          enhanced.fieldConfidence[field] = reExtracted.confidence;
        }

        // Update handwritten fields
        if (reExtracted.wasHandwritten) {
          enhanced.handwrittenFields = enhanced.handwrittenFields || [];
          if (!enhanced.handwrittenFields.includes(field)) {
            enhanced.handwrittenFields.push(field);
          }
        }

        console.log(`[ocr_enhance] Updated ${field}: $${reExtracted.value} (was: $${(result as any)[field] || 0})`);
      }
    } catch (error) {
      console.warn(`[ocr_enhance] Failed to re-extract ${field}:`, error);
    }
  }

  // Recalculate validation after re-extraction
  const subtotal = enhanced.subtotal || 0;
  const tax = enhanced.tax || 0;
  const tip = enhanced.tip || 0;
  const discount = enhanced.discount || 0;
  const serviceFee = enhanced.service_fee || 0;
  const total = enhanced.total || 0;
  const calculatedTotal = subtotal - discount + serviceFee + tax + tip;

  enhanced.validation = {
    ...enhanced.validation!,
    calculatedTotal: Math.round(calculatedTotal * 100) / 100,
    totalsMatch: Math.abs(calculatedTotal - total) <= (total > 100 ? total * 0.02 : 1.00)
  };

  return enhanced;
}

// #11: Process with correction feedback integrated into prompt
export async function processWithFeedback(
  imageBuffer: Buffer,
  mimeType: string,
  feedbackAdjustments?: string[],
  timeoutMs: number = 30000
): Promise<OCRResult> {
  const configuredProviders = getConfiguredProviders();

  if (configuredProviders.length === 0) {
    throw new Error('No OCR providers configured');
  }

  // Build prompt modification from feedback adjustments
  let promptModification: string | undefined;

  if (feedbackAdjustments && feedbackAdjustments.length > 0) {
    console.log(`[ocr_feedback] Processing with ${feedbackAdjustments.length} feedback adjustments`);

    promptModification = `
═══════════════════════════════════════════════════════════════
⚡ LEARNED FROM PREVIOUS CORRECTIONS
═══════════════════════════════════════════════════════════════
Based on past extraction errors, pay special attention to:
${feedbackAdjustments.map((adj, i) => `${i + 1}. ${adj}`).join('\n')}
`;

    console.log(`[ocr_feedback] Injecting feedback into prompt`);
  }

  // Use standard processing with prompt modification
  const primaryProvider = configuredProviders[0];

  try {
    const result = await processWithRetry(primaryProvider, imageBuffer, mimeType, timeoutMs, 2, promptModification);
    return result;
  } catch (primaryError: any) {
    console.warn(`[ocr_feedback] Primary provider failed:`, primaryError.message);

    // Try fallback without prompt modification
    if (configuredProviders.length > 1) {
      for (const provider of configuredProviders.slice(1)) {
        try {
          return await provider.process(imageBuffer, mimeType);
        } catch (fallbackError) {
          console.warn(`[ocr_feedback] Fallback ${provider.name} failed:`, fallbackError);
        }
      }
    }

    throw primaryError;
  }
}

export { providers };
