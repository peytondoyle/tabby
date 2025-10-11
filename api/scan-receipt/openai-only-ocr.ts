/**
 * OpenAI-only OCR provider for simplified deployment
 * No multi-provider complexity - just OpenAI with fallback
 */

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
  }>;
  provider: string;
  confidence?: number;
  processingTime: number;
}

// OpenAI Provider
class OpenAIOnlyProvider {
  name = 'openai';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  async process(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cost-effective
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract receipt data as JSON:
                  {
                    "place": "store name",
                    "date": "YYYY-MM-DD",
                    "items": [{"label": "item", "price": number}],
                    "subtotal": number,
                    "tax": number,
                    "tip": number,
                    "total": number
                  }
                  
                  Rules:
                  - Extract ALL line items with prices
                  - Use numbers for prices
                  - Use null for missing fields
                  - Be accurate with prices`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

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

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[openai_only] Processing error:', error);
      throw new Error(`OpenAI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Simple fallback processing
export async function processWithOpenAIOnly(
  imageBuffer: Buffer, 
  mimeType: string,
  timeoutMs: number = 15000
): Promise<OCRResult> {
  const provider = new OpenAIOnlyProvider();
  
  if (!provider.isConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('[openai_only] Processing with OpenAI only');

  try {
    const result = await Promise.race([
      provider.process(imageBuffer, mimeType),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), timeoutMs)
      )
    ]);
    
    console.log(`[openai_only] Processing completed in ${result.processingTime}ms`);
    return result;
    
  } catch (error) {
    console.error('[openai_only] Processing failed:', error);
    throw error;
  }
}

// Health check for OpenAI
export async function checkOpenAIHealth(): Promise<boolean> {
  const provider = new OpenAIOnlyProvider();
  
  if (!provider.isConfigured()) {
    return false;
  }

  try {
    // Simple health check - try to make a minimal request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.warn('[openai_only] Health check failed:', error);
    return false;
  }
}

export { OpenAIOnlyProvider };
