import { getSupabaseServiceClient } from './supabase.js';
import { generateFoodIcon, type GeneratedIcon } from './iconGenerator.js';

export interface FoodIconCacheEntry {
  id: string;
  food_name: string;
  icon_url: string;
  usage_count: number;
}

/**
 * Get an icon for a food item (from cache or generate new)
 * This is the main entry point for getting food icons
 */
export async function getFoodIcon(foodName: string): Promise<string> {
  const normalized = normalizeFoodName(foodName);
  console.log(`[foodIconsService] Getting icon for: ${foodName} (normalized: ${normalized})`);

  const supabase = getSupabaseServiceClient();

  // Check cache first using RPC
  const { data: cacheResult, error: cacheError } = await supabase
    .rpc('get_or_reserve_food_icon', {
      p_food_name: normalized,
      p_name_variants: [foodName, normalized],
    })
    .single<{ icon_id: string | null; icon_url: string | null; needs_generation: boolean }>();

  if (cacheError) {
    console.error('[foodIconsService] Cache lookup error:', cacheError);
    // Fall back to emoji on error
    return '';
  }

  // If icon exists in cache, return it
  if (cacheResult && !cacheResult.needs_generation && cacheResult.icon_url) {
    console.log('[foodIconsService] Cache HIT:', normalized);
    return cacheResult.icon_url;
  }

  // Cache MISS - generate new icon
  console.log('[foodIconsService] Cache MISS - generating new icon:', normalized);

  try {
    const generatedIcon = await generateFoodIcon(foodName);

    // Store in database for future use
    const { data: storedId, error: storeError } = await supabase
      .rpc('store_food_icon', {
        p_food_name: normalized,
        p_name_variants: [foodName, normalized],
        p_icon_url: generatedIcon.url,
        p_prompt: generatedIcon.prompt,
        p_model: generatedIcon.model,
        p_size: generatedIcon.size,
        p_quality: generatedIcon.quality,
      });

    if (storeError) {
      console.error('[foodIconsService] Failed to store icon:', storeError);
      // Still return the generated URL even if storage fails
    } else {
      console.log('[foodIconsService] Stored icon with ID:', storedId);
    }

    return generatedIcon.url;
  } catch (error) {
    console.error('[foodIconsService] Icon generation failed:', error);
    // Return empty string to fall back to emoji
    return '';
  }
}

/**
 * Batch lookup icons for multiple food items
 * Returns map of food_name -> icon_url
 */
export async function getFoodIconsBatch(
  foodNames: string[]
): Promise<Map<string, string>> {
  const normalized = foodNames.map(name => normalizeFoodName(name));
  console.log(`[foodIconsService] Batch lookup for ${foodNames.length} items`);

  const supabase = getSupabaseServiceClient();

  const { data: icons, error } = await supabase
    .rpc('get_food_icons_batch', {
      p_food_names: normalized,
    });

  if (error) {
    console.error('[foodIconsService] Batch lookup error:', error);
    return new Map();
  }

  // Build map of food_name -> icon_url
  const iconMap = new Map<string, string>();
  if (icons && Array.isArray(icons)) {
    for (const icon of icons) {
      if (icon && typeof icon === 'object' && 'food_name' in icon && 'icon_url' in icon) {
        iconMap.set(icon.food_name as string, icon.icon_url as string);
      }
    }
  }

  console.log(`[foodIconsService] Found ${iconMap.size}/${foodNames.length} icons in cache`);
  return iconMap;
}

/**
 * Generate icons for multiple food items (with caching)
 * Returns array of { foodName, iconUrl }
 */
export async function generateAndCacheFoodIcons(
  foodNames: string[]
): Promise<Array<{ foodName: string; iconUrl: string }>> {
  console.log(`[foodIconsService] generateAndCacheFoodIcons called with ${foodNames.length} items`);
  const results: Array<{ foodName: string; iconUrl: string }> = [];

  for (const foodName of foodNames) {
    try {
      console.log(`[foodIconsService] Processing: ${foodName}`);
      const iconUrl = await getFoodIcon(foodName);
      console.log(`[foodIconsService] Got icon for ${foodName}: ${iconUrl ? 'success' : 'empty'}`);
      results.push({ foodName, iconUrl });
    } catch (error: any) {
      console.error(`[foodIconsService] Failed for ${foodName}:`, {
        message: error?.message,
        name: error?.name,
        code: error?.code
      });
      results.push({ foodName, iconUrl: '' });
    }
  }

  console.log(`[foodIconsService] Completed. Returning ${results.length} results`);
  return results;
}

/**
 * Normalize food name for consistent cache lookups
 */
function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/[^\w\s-]/g, ''); // remove special chars except spaces and hyphens
}

/**
 * Pre-generate icons for common food items (admin/batch operation)
 */
export async function preGenerateCommonIcons(foodNames: string[]): Promise<void> {
  console.log(`[foodIconsService] Pre-generating ${foodNames.length} common icons`);

  for (const foodName of foodNames) {
    try {
      await getFoodIcon(foodName);
      console.log(`[foodIconsService] ✓ ${foodName}`);

      // Rate limiting: wait 2 seconds between generations
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[foodIconsService] ✗ ${foodName}:`, error);
    }
  }

  console.log('[foodIconsService] Pre-generation complete');
}
