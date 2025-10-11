/**
 * Formatting utilities for money, dates, and emojis
 */

/**
 * Format a number as currency
 * @example formatMoney(12.5) => "$12.50"
 * @example formatMoney(1234.5, { compact: true }) => "$1.2k"
 */
export function formatMoney(
  amount: number,
  options: {
    currency?: string
    locale?: string
    compact?: boolean
    showCents?: boolean
  } = {}
): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    compact = false,
    showCents = true
  } = options

  if (compact && Math.abs(amount) >= 1000) {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    })
    return formatter.format(amount)
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  })

  return formatter.format(amount)
}

// Keep legacy function for backward compatibility
export const formatPrice = (price: number) => formatMoney(price)

/**
 * Format a date for display
 * @example formatDate(new Date()) => "Today"
 * @example formatDate(new Date(), { format: 'long' }) => "Friday, October 10, 2025"
 * @example formatDate(new Date(), { format: 'short' }) => "Oct 10"
 */
export function formatDate(
  date: Date | string,
  options: {
    format?: 'relative' | 'short' | 'long' | 'time'
    locale?: string
  } = {}
): string {
  const { format = 'short', locale = 'en-US' } = options
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if date is today/yesterday for relative format
  if (format === 'relative') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const targetDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
    const dayDiff = Math.floor((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === 0) return 'Today'
    if (dayDiff === -1) return 'Yesterday'
    if (dayDiff === 1) return 'Tomorrow'
    if (dayDiff > 0 && dayDiff <= 7) {
      return dateObj.toLocaleDateString(locale, { weekday: 'long' })
    }
  }

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric'
      })
    case 'long':
      return dateObj.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'time':
      return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      })
    default:
      // relative but fallback to short for older dates
      return dateObj.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
  }
}

/**
 * Get a consistent emoji size class
 */
export function getEmojiClass(size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const sizeMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }
  return sizeMap[size]
}

/**
 * Normalize and validate emoji
 */
export function normalizeEmoji(emoji: string | undefined | null): string {
  if (!emoji) return '🍽️' // Default food emoji

  // Remove any extra whitespace
  const trimmed = emoji.trim()

  // Check if it's a valid emoji (basic check)
  // More sophisticated validation could use a regex for emoji ranges
  if (trimmed.length === 0) return '🍽️'

  return trimmed
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Format a person's initials
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '?'

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Generate a consistent color for a person based on their ID
 */
export function getPersonColor(personId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-yellow-500'
  ]

  // Simple hash of the ID to get a consistent color
  let hash = 0
  for (let i = 0; i < personId.length; i++) {
    hash = ((hash << 5) - hash) + personId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

/**
 * Format item count
 */
export function formatItemCount(count: number): string {
  return `${count} ${pluralize(count, 'item')}`
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}