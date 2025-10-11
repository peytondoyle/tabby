import OpenAI from 'openai';

export interface StreamingReceiptData {
  place?: string;
  date?: string;
  items: Array<{
    label: string;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  rawText?: string;
}

export interface StreamingProgress {
  stage: 'starting' | 'analyzing' | 'extracting' | 'finalizing' | 'complete';
  progress: number;
  partialData?: Partial<StreamingReceiptData>;
  message: string;
}

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function* processWithOpenAIStreaming(
  imageBuffer: Buffer, 
  mimeType: string
): AsyncGenerator<StreamingProgress, StreamingReceiptData, unknown> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('[openai_streaming] Starting streaming receipt processing...');

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // Yield initial progress
    yield {
      stage: 'starting',
      progress: 0.1,
      message: 'Initializing AI analysis...'
    };

    // Call OpenAI Vision API with streaming
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt and extract data as JSON. Stream your analysis:

1. First identify the store name
2. Then extract each item with price
3. Finally calculate totals

Return JSON format:
{
  "place": "store name",
  "date": "YYYY-MM-DD",
  "items": [{"label": "item", "price": number}],
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number
}`
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
      temperature: 0,
      stream: true
    });

    let accumulatedContent = '';
    let currentStage: StreamingProgress['stage'] = 'analyzing';
    let progress = 0.2;

    // Yield analysis stage
    yield {
      stage: 'analyzing',
      progress: 0.3,
      message: 'AI is analyzing the receipt...'
    };

    // Process streaming response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        accumulatedContent += content;
        
        // Update progress based on content
        if (accumulatedContent.includes('"place"') && currentStage === 'analyzing') {
          currentStage = 'extracting';
          progress = 0.5;
          yield {
            stage: 'extracting',
            progress: 0.5,
            message: 'Extracting items and prices...'
          };
        }
        
        if (accumulatedContent.includes('"items"') && currentStage === 'extracting') {
          currentStage = 'finalizing';
          progress = 0.8;
          yield {
            stage: 'finalizing',
            progress: 0.8,
            message: 'Calculating totals...'
          };
        }

        // Try to parse partial JSON as it comes in
        try {
          const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const partialData = JSON.parse(jsonMatch[0]);
            yield {
              stage: currentStage,
              progress: Math.min(progress + 0.1, 0.9),
              partialData,
              message: currentStage === 'extracting' ? 'Found items...' : 'Processing...'
            };
          }
        } catch (e) {
          // Ignore parsing errors for partial content
        }
      }
    }

    // Final parsing
    yield {
      stage: 'finalizing',
      progress: 0.95,
      message: 'Finalizing results...'
    };

    // Parse final JSON
    const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in OpenAI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log(`[openai_streaming] Streaming complete - ${parsed.items?.length || 0} items extracted`);

    // Return final result
    return {
      place: parsed.place || null,
      date: parsed.date || null,
      subtotal: parsed.subtotal || null,
      tax: parsed.tax || null,
      tip: parsed.tip || null,
      total: parsed.total || null,
      rawText: parsed.rawText || accumulatedContent,
      items: parsed.items || []
    };

  } catch (error) {
    console.error('[openai_streaming] Error in streaming processing:', error);
    throw error;
  }
}

export function isOpenAIStreamingConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
