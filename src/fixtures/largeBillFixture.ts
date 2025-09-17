import type { Item, Person, BillMeta } from '@/lib/types'

/**
 * Generate a large bill fixture with 150 items for performance testing
 */
export function generateLargeBillFixture() {
  const items: Item[] = []
  const people: Person[] = []
  
  // Generate 150 items with realistic data
  const itemCategories = [
    'Appetizers', 'Salads', 'Soups', 'Main Courses', 'Desserts', 'Beverages',
    'Sides', 'Specials', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'
  ]
  
  const itemNames = [
    // Appetizers
    'Buffalo Wings', 'Mozzarella Sticks', 'Nachos Supreme', 'Spinach Artichoke Dip',
    'Calamari Rings', 'Chicken Tenders', 'Loaded Potato Skins', 'Bruschetta',
    
    // Salads
    'Caesar Salad', 'Garden Salad', 'Cobb Salad', 'Greek Salad', 'Waldorf Salad',
    'Caprese Salad', 'Arugula Salad', 'Kale Caesar',
    
    // Soups
    'Tomato Basil Soup', 'Chicken Noodle', 'Clam Chowder', 'Lobster Bisque',
    'Minestrone', 'French Onion', 'Butternut Squash', 'Gazpacho',
    
    // Main Courses
    'Grilled Salmon', 'Ribeye Steak', 'Chicken Parmesan', 'Fish and Chips',
    'Beef Stir Fry', 'Pasta Carbonara', 'BBQ Ribs', 'Lobster Roll',
    'Burgers', 'Pizza Margherita', 'Tacos', 'Sushi Rolls',
    
    // Desserts
    'Chocolate Cake', 'Cheesecake', 'Tiramisu', 'Ice Cream Sundae',
    'Apple Pie', 'Key Lime Pie', 'Creme Brulee', 'Chocolate Mousse',
    
    // Beverages
    'Coffee', 'Tea', 'Soda', 'Juice', 'Beer', 'Wine', 'Cocktails',
    'Smoothies', 'Milkshakes', 'Energy Drinks',
    
    // Sides
    'French Fries', 'Sweet Potato Fries', 'Onion Rings', 'Mashed Potatoes',
    'Rice Pilaf', 'Steamed Vegetables', 'Mac and Cheese', 'Coleslaw',
    
    // Breakfast
    'Pancakes', 'Waffles', 'French Toast', 'Omelette', 'Eggs Benedict',
    'Breakfast Burrito', 'Avocado Toast', 'Granola Bowl',
    
    // Lunch
    'Club Sandwich', 'BLT', 'Turkey Wrap', 'Chicken Salad',
    'Tuna Melt', 'Grilled Cheese', 'Soup and Salad', 'Quinoa Bowl',
    
    // Dinner
    'Prime Rib', 'Lobster Tail', 'Duck Confit', 'Lamb Chops',
    'Veal Scallopini', 'Rack of Lamb', 'Filet Mignon', 'Rack of Ribs',
    
    // Snacks
    'Popcorn', 'Pretzels', 'Chips', 'Nuts', 'Trail Mix', 'Crackers',
    'Cheese Plate', 'Fruit Bowl'
  ]
  
  // Generate 150 items
  for (let i = 0; i < 150; i++) {
    const category = itemCategories[i % itemCategories.length]
    const nameIndex = i % itemNames.length
    const baseName = itemNames[nameIndex]
    
    // Add variety with numbers and variations
    const variation = i > itemNames.length ? ` #${Math.floor(i / itemNames.length) + 1}` : ''
    const label = `${baseName}${variation}`
    
    // Generate realistic prices (most items between $5-25, some premium items up to $50)
    const isPremium = Math.random() < 0.1 // 10% chance of premium item
    const basePrice = isPremium ? 25 + Math.random() * 25 : 5 + Math.random() * 20
    const price = Math.round(basePrice * 100) / 100 // Round to 2 decimal places
    
    // Add emojis based on category
    const emojis = {
      'Appetizers': ['🍤', '🧀', '🥨', '🍖'],
      'Salads': ['🥗', '🥬', '🥒', '🍅'],
      'Soups': ['🍲', '🥣', '🍵'],
      'Main Courses': ['🍖', '🐟', '🍗', '🍝'],
      'Desserts': ['🍰', '🧁', '🍮', '🍨'],
      'Beverages': ['☕', '🍺', '🥤', '🧃'],
      'Sides': ['🍟', '🥔', '🌽', '🥕'],
      'Breakfast': ['🥞', '🧇', '🍳', '🥓'],
      'Lunch': ['🥪', '🌯', '🥙'],
      'Dinner': ['🥩', '🦞', '🍖', '🐑'],
      'Snacks': ['🍿', '🥨', '🥜', '🧀']
    }
    
    const categoryEmojis = emojis[category as keyof typeof emojis] || ['🍽️']
    const emoji = categoryEmojis[Math.floor(Math.random() * categoryEmojis.length)]
    
    items.push({
      id: `item-${i + 1}`,
      bill_id: 'bill-id',
      label,
      price,
      emoji,
      quantity: 1,
      unit_price: price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
  
  // Generate 8 people for assignment
  const personNames = [
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn'
  ]
  
  for (let i = 0; i < 8; i++) {
    people.push({
      id: `person-${i + 1}`,
      name: personNames[i] || `Person ${i + 1}`,
      avatar: undefined
    })
  }
  
  // Calculate realistic totals
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const tax = Math.round(subtotal * 0.0875 * 100) / 100 // 8.75% tax
  const tip = Math.round(subtotal * 0.18 * 100) / 100 // 18% tip
  const total = subtotal + tax + tip
  
  const billMeta: BillMeta = {
    id: 'bill-id',
    token: 'profile-test-bill',
    title: 'Large Bill Performance Test',
    subtotal,
    tax,
    tip,
    total,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  return {
    items,
    people,
    billMeta,
    // Performance testing metadata
    metadata: {
      itemCount: items.length,
      personCount: people.length,
      totalValue: total,
      averageItemPrice: subtotal / items.length,
      generatedAt: new Date().toISOString()
    }
  }
}

/**
 * Generate a smaller fixture for comparison (10 items)
 */
export function generateSmallBillFixture() {
  const items: Item[] = [
    { id: 'item-1', bill_id: 'bill-id', label: 'Burger', price: 12.99, emoji: '🍔', quantity: 1, unit_price: 12.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-2', bill_id: 'bill-id', label: 'Fries', price: 4.99, emoji: '🍟', quantity: 1, unit_price: 4.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-3', bill_id: 'bill-id', label: 'Coke', price: 2.99, emoji: '🥤', quantity: 1, unit_price: 2.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-4', bill_id: 'bill-id', label: 'Salad', price: 8.99, emoji: '🥗', quantity: 1, unit_price: 8.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-5', bill_id: 'bill-id', label: 'Pizza Slice', price: 3.99, emoji: '🍕', quantity: 1, unit_price: 3.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-6', bill_id: 'bill-id', label: 'Coffee', price: 2.49, emoji: '☕', quantity: 1, unit_price: 2.49, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-7', bill_id: 'bill-id', label: 'Sandwich', price: 9.99, emoji: '🥪', quantity: 1, unit_price: 9.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-8', bill_id: 'bill-id', label: 'Soup', price: 6.99, emoji: '🍲', quantity: 1, unit_price: 6.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-9', bill_id: 'bill-id', label: 'Dessert', price: 5.99, emoji: '🍰', quantity: 1, unit_price: 5.99, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'item-10', bill_id: 'bill-id', label: 'Water', price: 0.00, emoji: '💧', quantity: 1, unit_price: 0.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ]
  
  const people: Person[] = [
    { id: 'person-1', name: 'Alex', avatar: undefined },
    { id: 'person-2', name: 'Sam', avatar: undefined }
  ]
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const tax = Math.round(subtotal * 0.0875 * 100) / 100
  const tip = Math.round(subtotal * 0.18 * 100) / 100
  const total = subtotal + tax + tip
  
  const billMeta: BillMeta = {
    id: 'small-bill-id',
    token: 'small-test-bill',
    title: 'Small Bill Test',
    subtotal,
    tax,
    tip,
    total,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  return {
    items,
    people,
    billMeta,
    metadata: {
      itemCount: items.length,
      personCount: people.length,
      totalValue: total,
      averageItemPrice: subtotal / items.length,
      generatedAt: new Date().toISOString()
    }
  }
}
