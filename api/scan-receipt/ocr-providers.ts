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
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract receipt data as JSON:
{
  "place": "Restaurant Name",
  "date": "YYYY-MM-DD",
  "items": [{"label": "Item Name", "price": 12.00}],
  "subtotal": 0.00,
  "discount": 0.00,
  "service_fee": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00
}

CRITICAL RULES:

1. FOOD/DRINK ITEMS: Extract all food and drink items with their FULL prices (before discounts).
   - DO NOT include taxes, tips, fees, or discounts as items
   - Items should be the original menu prices
   - Extract the exact item name as it appears on the receipt

2. DISCOUNTS & PROMOS: Look CAREFULLY for ALL discounts, promos, benefits, and savings.
   - Common labels: "Discount", "Delivery Discount", "Promo", "Coupon", "BOGO", "Buy One Get One", "10% Off", "Rewards", "Points", "Credits"
   - Membership/subscription: "Member Discount", "Membership Savings", "Membership Benefit", "Member Benefit", "Subscription Savings", "Plus Benefit"
   - App-specific: "Uber One Benefit", "DashPass Benefit", "Grubhub+ Benefit"
   - IMPORTANT: SUM UP **ALL** discount line items (even if they have different labels)
   - Put the TOTAL of all discounts in the "discount" field as a POSITIVE number
   - Example: $1.49 delivery discount + $6.97 membership benefit = discount: 8.46
   - DO NOT include discount line items in the items array
   - DO NOT miss any discount just because it has an unusual label

3. SUBTOTAL: The subtotal shown on the receipt (items AFTER discounts applied).
   - This is what the customer owes for food after discounts but before fees/taxes/tips
   - May be labeled "Subtotal" on the receipt

4. TAX: LOOK CAREFULLY for tax. Common labels:
   - "Tax", "Sales Tax", "GST", "VAT", "Tax & Fees"
   - Extract the EXACT dollar amount as POSITIVE number
   - If $0.00, return 0.00 (not null)

5. TIP: LOOK CAREFULLY for tip/gratuity ONLY. Common labels:
   - "Tip", "Gratuity", "Tips"
   - Extract the EXACT dollar amount as POSITIVE number
   - If $0.00, return 0.00 (not null)
   - DO NOT include service fees, delivery fees, or platform fees here

6. SERVICE FEES: These are NOT tips! Keep them separate:
   - Common labels: "Service Fee", "Service Charge", "Delivery Fee", "Platform Fee", "Small Order Fee", "Convenience Fee", "Regulatory Fee", "Processing Fee", "Booking Fee"
   - App-specific: "Uber Service Fee", "DoorDash Fee", "Grubhub Fee", "Postmates Fee"
   - IMPORTANT: SUM UP all service-related fees (delivery + service + platform + etc)
   - Example: $1.49 delivery fee + $12.54 service fee = service_fee: 14.03
   - These fees go in a "service_fee" field (NOT in the tip field)
   - DO NOT add these to the tip amount
   - DO NOT confuse service fees with tips/gratuity

7. TOTAL: Final charged amount at the bottom (should equal subtotal - discount + service_fee + tax + tip).

8. Use 0.00 for any field if not found (not null).

9. IMPORTANT: For delivery apps (DoorDash/UberEats/GrubHub):
   - Service/Delivery/Platform fees: SUM ALL FEES and put in "service_fee" field (NOT in tip!)
   - Tip/Gratuity goes in "tip" field (keep separate from fees!)
   - Discounts: SUM ALL DISCOUNTS including membership benefits and put in "discount" field as POSITIVE number
   - Example Uber Eats: If you see "Delivery Fee $1.49" + "Service Fee $12.54" + "Delivery Discount -$1.49" + "Membership Benefit -$6.97"
     Then: service_fee = 14.03, discount = 8.46
   - Make sure you extract all fields accurately and don't miss any line items!

Extract ACTUAL VALUES from the receipt image, not the example values shown above.`
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
      max_tokens: 600,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const processingTime = Date.now() - startTime;

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
      confidence: 0.9, // High confidence for GPT-4o-mini
      processingTime
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
