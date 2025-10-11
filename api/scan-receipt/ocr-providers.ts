import OpenAI from 'openai';

export interface OCRResult {
  place?: string | null;
  date?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  tip?: number | null;
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
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
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
              text: `You are a receipt data extraction assistant. Extract ALL information from this receipt and return it as valid JSON.

IMPORTANT INSTRUCTIONS:
1. Extract ONLY food/drink items in the "items" array - DO NOT include delivery fees, service fees, taxes, tips, or discounts as items
2. For each item, include a relevant food emoji as an actual Unicode emoji character (e.g., 🍕 for pizza, 🍜 for noodles, 🥗 for salad, 🥟 for spring rolls, 🍚 for rice, 🥡 for tofu). IMPORTANT: Use the actual emoji character, NOT the emoji name or text like "pizza" or "spring_roll"
3. The "subtotal" is the sum of all food items ONLY (before any fees, taxes, tips, or discounts)
4. The "tax" is the sales tax amount
5. The "tip" is the gratuity/tip amount (if present)
6. The "total" is the FINAL AMOUNT CHARGED (the bottom line total after all fees, taxes, tips, and discounts)
7. If you see delivery fees, service fees, or other fees, DO NOT add them as items - they are already factored into the total
8. If you see discounts or promotional credits, DO NOT add them as items - they are already factored into the total

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "place": "Actual Restaurant Name Here",
  "date": "YYYY-MM-DD",
  "items": [
    {"label": "Spring Roll", "price": 2.50, "emoji": "🥟"},
    {"label": "Fried Rice", "price": 11.50, "emoji": "🍚"},
    {"label": "Pizza", "price": 12.50, "emoji": "🍕"}
  ],
  "subtotal": 26.50,
  "tax": 2.12,
  "tip": 5.30,
  "total": 33.92
}

CRITICAL RULES:
- The "emoji" field must contain actual emoji Unicode characters (🥟 🍚 🍕), NOT emoji names or text!
- If you cannot find the restaurant name, use null (not "restaurant or store name" or any placeholder text)
- All numbers must be actual extracted values, not 0.00 or placeholder examples
- Extract the ACTUAL values from the receipt image, not the example values shown above

Example for a receipt with food items ($63.80), delivery fee ($1.49), service fee ($11.48), tax ($6.38), tip ($8.31), discount (-$1.49), membership benefit (-$6.70):
- items: Only the food items totaling $63.80
- subtotal: 63.80
- tax: 6.38
- tip: 8.31
- total: 83.27 (the final amount charged after all fees and discounts)

Now extract the receipt data:`
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
      max_tokens: 500,
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
