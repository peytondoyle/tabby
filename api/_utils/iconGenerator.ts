import OpenAI from 'openai';

export interface GeneratedIcon {
  url: string;
  prompt: string;
  foodName: string;
  model: string;
  size: string;
  quality: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/^["']|["']$/g, '').trim(),
});

/**
 * Generate a beautiful flat design food icon using DALL-E 3
 *
 * Design Guidelines:
 * - Strict color palette: Warm oranges, soft creams, minimal accents
 * - Flat design with subtle shadows
 * - Centered composition on transparent background
 * - Simple, recognizable shapes
 * - Consistent style across all icons
 */
export async function generateFoodIcon(foodName: string): Promise<GeneratedIcon> {
  console.log(`[iconGenerator] Generating icon for: ${foodName}`);

  const prompt = buildIconPrompt(foodName);

  const startTime = Date.now();
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
    style: "natural", // More realistic, less artistic
  });

  const processingTime = Date.now() - startTime;
  console.log(`[iconGenerator] Generated icon in ${processingTime}ms`);

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL returned from DALL-E 3');
  }

  return {
    url: imageUrl,
    prompt,
    foodName,
    model: "dall-e-3",
    size: "1024x1024",
    quality: "standard",
  };
}

/**
 * Build a detailed DALL-E 3 prompt with strict style guidelines
 */
function buildIconPrompt(foodName: string): string {
  return `A gorgeous flat design icon of ${foodName}.

STRICT STYLE REQUIREMENTS:
- Flat design illustration style (no 3D, no photo-realistic)
- Clean, minimal, modern aesthetic
- Centered composition with generous white space
- Simple geometric shapes with smooth edges
- View from slightly above (hero angle)

COLOR PALETTE (USE ONLY THESE):
Primary: #FF9500 (warm orange) - for main food elements
Secondary: #FFF5E6 (soft cream) - for backgrounds/highlights
Accent: #8B4513 (warm brown) - for depth/shadows
Neutral: #F5F5F5 (off-white) - for plates/bowls
Pop: #FFE4B5 (moccasin) - for garnishes/details

COMPOSITION:
- Icon should be square (1:1 aspect ratio)
- Food item centered, taking up 60-70% of canvas
- Soft drop shadow beneath food (subtle, warm brown)
- No text, no labels, no background patterns
- Clean edges, no busy details

LIGHTING:
- Soft, even lighting from top-left
- Gentle highlights on top surfaces
- Warm color temperature (cozy, inviting)
- No harsh shadows

The icon should be instantly recognizable, beautiful, and cohesive with a warm, friendly app aesthetic. Think: modern food delivery app meets Apple's design language.`;
}

/**
 * Batch generate icons for multiple food items
 * (Processes sequentially to avoid rate limits)
 */
export async function generateFoodIconsBatch(
  foodNames: string[]
): Promise<GeneratedIcon[]> {
  console.log(`[iconGenerator] Batch generating ${foodNames.length} icons`);

  const results: GeneratedIcon[] = [];
  for (const foodName of foodNames) {
    try {
      const icon = await generateFoodIcon(foodName);
      results.push(icon);

      // Rate limiting: wait 1 second between generations
      if (results.length < foodNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[iconGenerator] Failed to generate icon for ${foodName}:`, error);
      // Continue with next item instead of failing entire batch
    }
  }

  return results;
}
