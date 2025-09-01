import OpenAI from 'openai';

export interface ParsedReceipt {
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
}

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function processWithOpenAI(imageBuffer: Buffer, mimeType: string): Promise<ParsedReceipt> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('[openai_ocr] Processing receipt with OpenAI Vision...');

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt image and extract the following information in JSON format:
              {
                "place": "store/restaurant name",
                "date": "date in YYYY-MM-DD format",
                "items": [
                  {"label": "item name", "price": price_as_number}
                ],
                "subtotal": subtotal_as_number,
                "tax": tax_as_number,
                "tip": tip_as_number,
                "total": total_as_number
              }
              
              Important:
              - Extract the store/restaurant name from the receipt header (e.g., "Chick-fil-A", "McDonald's", "Starbucks")
              - Extract ALL line items with their prices
              - Prices should be numbers (not strings)
              - If any field is not found, use null
              - Be accurate with the prices
              - Include the full raw text of the receipt in a "rawText" field`
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
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log(`[openai_ocr] OpenAI response:`, JSON.stringify(parsed, null, 2));
    console.log(`[openai_ocr] Successfully extracted ${parsed.items?.length || 0} items, place: "${parsed.place}"`);

    return {
      place: parsed.place || null,
      date: parsed.date || null,
      subtotal: parsed.subtotal || null,
      tax: parsed.tax || null,
      tip: parsed.tip || null,
      total: parsed.total || null,
      rawText: parsed.rawText || content,
      items: parsed.items || []
    };

  } catch (error) {
    console.error('[openai_ocr] Error processing with OpenAI:', error);
    throw error;
  }
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
