/**
 * Smart emoji assignment based on food keywords
 * Migrated from BillyApp.tsx for reuse across components
 */
export function getSmartEmoji(name: string): string {
  const lowerName = name.toLowerCase()

  // Drinks
  if (lowerName.includes('coffee') || lowerName.includes('latte') || lowerName.includes('cappuccino')) return '☕'
  if (lowerName.includes('tea')) return '🍵'
  if (lowerName.includes('soda') || lowerName.includes('coke') || lowerName.includes('pepsi')) return '🥤'
  if (lowerName.includes('juice')) return '🧃'
  if (lowerName.includes('water')) return '💧'
  if (lowerName.includes('beer')) return '🍺'
  if (lowerName.includes('wine')) return '🍷'
  if (lowerName.includes('shake') || lowerName.includes('smoothie')) return '🥤'
  if (lowerName.includes('lemonade')) return '🍋'

  // Main dishes
  if (lowerName.includes('burger') || lowerName.includes('hamburger')) return '🍔'
  if (lowerName.includes('pizza')) return '🍕'
  if (lowerName.includes('sandwich') || lowerName.includes('sub')) return '🥪'
  if (lowerName.includes('taco')) return '🌮'
  if (lowerName.includes('burrito')) return '🌯'
  if (lowerName.includes('chicken')) return '🍗'
  if (lowerName.includes('steak') || lowerName.includes('beef')) return '🥩'
  if (lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('tuna')) return '🐟'
  if (lowerName.includes('shrimp') || lowerName.includes('prawn')) return '🍤'
  if (lowerName.includes('pasta') || lowerName.includes('spaghetti')) return '🍝'
  if (lowerName.includes('noodle') || lowerName.includes('ramen') || lowerName.includes('pho')) return '🍜'
  if (lowerName.includes('rice') || lowerName.includes('fried rice')) return '🍚'
  if (lowerName.includes('sushi') || lowerName.includes('roll')) return '🍣'
  if (lowerName.includes('soup')) return '🍲'
  if (lowerName.includes('curry')) return '🍛'
  if (lowerName.includes('tofu')) return '🥟'

  // Sides
  if (lowerName.includes('fries') || lowerName.includes('chips')) return '🍟'
  if (lowerName.includes('salad')) return '🥗'
  if (lowerName.includes('bread') || lowerName.includes('toast')) return '🍞'
  if (lowerName.includes('egg')) return '🥚'
  if (lowerName.includes('bacon')) return '🥓'
  if (lowerName.includes('vegetable') || lowerName.includes('veggie')) return '🥦'
  if (lowerName.includes('potato')) return '🥔'
  if (lowerName.includes('corn')) return '🌽'

  // Desserts
  if (lowerName.includes('cake')) return '🍰'
  if (lowerName.includes('pie')) return '🥧'
  if (lowerName.includes('ice cream') || lowerName.includes('gelato')) return '🍨'
  if (lowerName.includes('cookie')) return '🍪'
  if (lowerName.includes('donut') || lowerName.includes('doughnut')) return '🍩'
  if (lowerName.includes('chocolate')) return '🍫'

  // Asian specific
  if (lowerName.includes('spring roll') || lowerName.includes('egg roll')) return '🥟'
  if (lowerName.includes('dumpling') || lowerName.includes('wonton')) return '🥟'
  if (lowerName.includes('bao') || lowerName.includes('bun')) return '🥟'
  if (lowerName.includes('tempura')) return '🍤'
  if (lowerName.includes('mapo')) return '🍽️'

  // Default fallback
  return '🍽️'
}

/**
 * Process scan result items with smart emoji assignment
 * Note: items from scan adapter already have { id, name, price, emoji, quantity } structure
 */
export function processScanItems(items: any[]): Array<{ id: string; name: string; price: number; icon: string }> {
  return items.map((item, index) => {
    // Items from scan adapter already have 'name' property, not 'label'
    const itemName = item.name || item.label || 'Unknown Item'
    
    // Clean up item names - remove leading numbers
    let cleanName = itemName.replace(/^[A-Z0-9]+\d*\.?\s*/i, '').trim()

    // Use smart emoji assignment if no emoji provided or if it's the default
    const emoji = item.emoji && item.emoji !== '🍽️' ? item.emoji : getSmartEmoji(cleanName)

    return {
      id: item.id || Date.now().toString() + index,
      name: cleanName,
      price: item.price || 0,
      icon: emoji
    }
  })
}

/**
 * Demo fallback data from BillyApp for testing
 */
export function getDemoItems() {
  return [
    { id: '1', name: 'Chicken with Cashew Nuts', price: 15.35, icon: '🍗' },
    { id: '2', name: 'Shanghai Spring Roll', price: 2.30, icon: '🥟' },
    { id: '3', name: 'Wonton Soup', price: 3.30, icon: '🍲' },
    { id: '4', name: 'Chicken with Broccoli', price: 15.35, icon: '🥦' },
    { id: '5', name: 'Mapo Tofu', price: 13.75, icon: '🍽️' },
    { id: '6', name: 'Vegetable Fried Rice', price: 11.55, icon: '🍚' },
    { id: '7', name: 'Vegetables Spring Roll', price: 2.20, icon: '🥟' }
  ]
}
