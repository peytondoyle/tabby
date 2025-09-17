// Optimized icon imports - only import the icons we actually use
// This reduces bundle size by avoiding the entire lucide-react library

// Core UI icons
export { Plus } from 'lucide-react'
export { Minus } from 'lucide-react'
export { X } from 'lucide-react'
export { ChevronLeft } from 'lucide-react'
export { ChevronRight } from 'lucide-react'

// Action icons
export { Upload } from 'lucide-react'
export { Download } from 'lucide-react'
export { Printer } from 'lucide-react'
export { Copy } from 'lucide-react'
export { Share } from 'lucide-react'
export { Share2 } from 'lucide-react'
export { ExternalLink } from 'lucide-react'

// File/Media icons
export { FileImage } from 'lucide-react'
export { Camera } from 'lucide-react'
export { QrCode } from 'lucide-react'

// UI state icons
export { Loader } from 'lucide-react'
export { Sun } from 'lucide-react'
export { Moon } from 'lucide-react'
export { Settings } from 'lucide-react'

// Navigation icons
export { ArrowLeft } from 'lucide-react'

// Edit icons
export { Edit2 } from 'lucide-react'
export { Trash2 } from 'lucide-react'
export { DollarSign } from 'lucide-react'

// Icon size constants for consistency
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

export type IconSize = keyof typeof ICON_SIZES

// Helper function to get icon size class
export function getIconSizeClass(size: IconSize = 'md'): string {
  return `w-${ICON_SIZES[size] / 4} h-${ICON_SIZES[size] / 4}`
}
