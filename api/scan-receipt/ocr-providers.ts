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
  process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult>;
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

  async process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const startTime = Date.now();
    console.log(`[openai_ocr] Starting OpenAI processing, image size: ${imageBuffer.length} bytes`);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    console.log(`[openai_ocr] Calling GPT-4o vision API...`);
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert receipt analyzer. Extract ALL data from this receipt image with high precision.

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

**QUANTITY HANDLING:**
- "3 Cold Beverage $10.50" → {"label": "3 Cold Beverage", "price": 10.50}
- Keep quantity as part of label, DO NOT divide prices

═══════════════════════════════════════════════════════════════
💰 FINANCIAL FIELDS
═══════════════════════════════════════════════════════════════
**SUBTOTAL**: Sum of items after discounts, before tax/tip/fees
**TAX**: "Tax", "Sales Tax", "GST", "VAT" - exact amount shown
**TIP**: "Tip", "Gratuity" - CHECK FOR HANDWRITTEN VALUES!
**TOTAL**: Final amount - CHECK FOR HANDWRITTEN VALUES!
**DISCOUNT**: Sum ALL discounts/promos/benefits as POSITIVE number
**SERVICE_FEE**: Sum ALL fees (delivery, service, platform, etc.)

═══════════════════════════════════════════════════════════════
🧮 VALIDATION HINTS
═══════════════════════════════════════════════════════════════
After extraction, verify:
- Items sum should ≈ subtotal (±$0.50 for rounding)
- total ≈ subtotal - discount + service_fee + tax + tip
- If math doesn't work, re-check for missed items or handwritten values

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
    const tip = parsed.tip || 0;
    const discount = parsed.discount || 0;
    const serviceFee = parsed.service_fee || 0;
    const total = parsed.total || 0;

    // Expected total calculation
    const calculatedTotal = subtotal - discount + serviceFee + tax + tip;
    const itemsMatchSubtotal = Math.abs(calculatedSubtotal - subtotal) <= 0.50;
    const totalsMatch = Math.abs(calculatedTotal - total) <= 0.50;

    // Generate warnings
    const warnings: string[] = [];
    if (!itemsMatchSubtotal && items.length > 0) {
      const diff = Math.abs(calculatedSubtotal - subtotal);
      warnings.push(`Items sum ($${calculatedSubtotal.toFixed(2)}) differs from subtotal ($${subtotal.toFixed(2)}) by $${diff.toFixed(2)}`);
    }
    if (!totalsMatch && total > 0) {
      const diff = Math.abs(calculatedTotal - total);
      warnings.push(`Calculated total ($${calculatedTotal.toFixed(2)}) differs from receipt total ($${total.toFixed(2)}) by $${diff.toFixed(2)}`);
    }
    if (tip === 0 && parsed.handwrittenFields?.includes('tip')) {
      warnings.push('Tip may be handwritten but was not extracted - please verify');
    }
    if (parsed.receiptType === 'customer_copy' && tip === 0) {
      warnings.push('Customer copy detected with no tip - tip may need manual entry');
    }

    // Generate suggested corrections
    const suggestedCorrections: Array<{ field: string; currentValue: number | string | null; suggestedValue: number | string; reason: string }> = [];

    // If items don't match subtotal but we have items, suggest using calculated subtotal
    if (!itemsMatchSubtotal && items.length > 0 && calculatedSubtotal > 0) {
      suggestedCorrections.push({
        field: 'subtotal',
        currentValue: subtotal,
        suggestedValue: calculatedSubtotal,
        reason: 'Calculated from item prices'
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
          reason: 'Calculated from total minus other fields'
        });
      }
    }

    // Calculate overall confidence
    const fieldConfidence = parsed.fieldConfidence || {};
    const confidenceValues = Object.values(fieldConfidence) as string[];
    const hasLowConfidence = confidenceValues.some(c => c === 'low');
    const hasMediumConfidence = confidenceValues.some(c => c === 'medium');
    let overallConfidence = 0.95;
    if (hasLowConfidence) overallConfidence = 0.6;
    else if (hasMediumConfidence) overallConfidence = 0.8;
    if (warnings.length > 0) overallConfidence -= 0.1 * warnings.length;
    overallConfidence = Math.max(0.3, overallConfidence);

    console.log(`[openai_ocr] Validation: items=${itemsMatchSubtotal}, totals=${totalsMatch}, warnings=${warnings.length}, confidence=${overallConfidence.toFixed(2)}`);

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
        discrepancy: Math.abs(calculatedTotal - total) > 0.50 ? Math.round(Math.abs(calculatedTotal - total) * 100) / 100 : undefined,
        warnings
      },
      fieldConfidence: parsed.fieldConfidence || undefined,
      handwrittenFields: parsed.handwrittenFields || undefined,
      suggestedCorrections: suggestedCorrections.length > 0 ? suggestedCorrections : undefined
    };
  }
}

// Google Vision Provider (placeholder)
class GoogleVisionProvider implements OCRProvider {
  name = 'google-vision';

  isConfigured(): boolean {
    return !!process.env.GOOGLE_CLOUD_VISION_API_KEY;
  }

  async process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Placeholder implementation
    // In production, you'd implement Google Vision API here
    throw new Error('Google Vision not implemented yet');
  }
}

// Azure Vision Provider (placeholder)
class AzureVisionProvider implements OCRProvider {
  name = 'azure-vision';

  isConfigured(): boolean {
    return !!(process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY);
  }

  async process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Placeholder implementation
    // In production, you'd implement Azure Vision API here
    throw new Error('Azure Vision not implemented yet');
  }
}

// OCR Space Provider (placeholder)
class OCRSpaceProvider implements OCRProvider {
  name = 'ocr-space';

  isConfigured(): boolean {
    return !!process.env.OCR_SPACE_API_KEY;
  }

  async process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Placeholder implementation
    // In production, you'd implement OCR Space API here
    throw new Error('OCR Space not implemented yet');
  }
}

// Provider registry
const providers: OCRProvider[] = [
  new OpenAIProvider(),
  new GoogleVisionProvider(),
  new AzureVisionProvider(),
  new OCRSpaceProvider()
];

// Get configured providers
export function getConfiguredProviders(): OCRProvider[] {
  return providers.filter(provider => provider.isConfigured());
}

// Process with multiple providers in parallel
export async function processWithMultipleProviders(
  imageBuffer: Buffer, 
  mimeType: string,
  timeoutMs: number = 10000
): Promise<OCRResult> {
  const configuredProviders = getConfiguredProviders();
  
  if (configuredProviders.length === 0) {
    throw new Error('No OCR providers configured');
  }

  console.log(`[ocr_providers] Processing with ${configuredProviders.length} providers: ${configuredProviders.map(p => p.name).join(', ')}`);

  // Create promises for all providers
  const providerPromises = configuredProviders.map(async (provider) => {
    try {
      const result = await Promise.race([
        provider.process(imageBuffer, mimeType),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Provider ${provider.name} timeout`)), timeoutMs)
        )
      ]);
      
      console.log(`[ocr_providers] ${provider.name} completed in ${result.processingTime}ms`);
      return result;
    } catch (error) {
      console.warn(`[ocr_providers] ${provider.name} failed:`, error);
      return null;
    }
  });

  // Wait for first successful result
  const results = await Promise.allSettled(providerPromises);
  const successfulResults = results
    .filter((result): result is PromiseFulfilledResult<OCRResult> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);

  if (successfulResults.length === 0) {
    throw new Error('All OCR providers failed');
  }

  // Sort by processing time and confidence
  successfulResults.sort((a, b) => {
    const scoreA = (a.confidence || 0.5) * 1000 - a.processingTime;
    const scoreB = (b.confidence || 0.5) * 1000 - b.processingTime;
    return scoreB - scoreA;
  });

  const bestResult = successfulResults[0];
  console.log(`[ocr_providers] Using result from ${bestResult.provider} (${bestResult.processingTime}ms, confidence: ${bestResult.confidence})`);

  return bestResult;
}

// Process with fallback strategy
export async function processWithFallback(
  imageBuffer: Buffer, 
  mimeType: string
): Promise<OCRResult> {
  const configuredProviders = getConfiguredProviders();
  
  if (configuredProviders.length === 0) {
    throw new Error('No OCR providers configured');
  }

  console.log(`[ocr_fallback] Processing with fallback strategy using ${configuredProviders.length} providers`);

  // Try providers in order of preference
  for (const provider of configuredProviders) {
    try {
      console.log(`[ocr_fallback] Trying ${provider.name}...`);
      const result = await provider.process(imageBuffer, mimeType);
      console.log(`[ocr_fallback] ${provider.name} succeeded in ${result.processingTime}ms`);
      return result;
    } catch (error) {
      console.warn(`[ocr_fallback] ${provider.name} failed:`, error);
      // Continue to next provider
    }
  }

  throw new Error('All OCR providers failed');
}

export { providers };
