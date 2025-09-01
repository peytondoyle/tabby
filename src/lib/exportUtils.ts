import html2canvas from 'html2canvas'

/**
 * Convert oklch colors to hex fallbacks for html2canvas compatibility
 */
function getHexFallback(oklchValue: string): string | null {
  // Common oklch to hex mappings for Tailwind colors
  const oklchToHex: Record<string, string> = {
    'oklch(0.9 0.02 240)': '#f1f5f9', // slate-100
    'oklch(0.8 0.02 240)': '#e2e8f0', // slate-200
    'oklch(0.7 0.02 240)': '#cbd5e1', // slate-300
    'oklch(0.6 0.02 240)': '#94a3b8', // slate-400
    'oklch(0.5 0.02 240)': '#64748b', // slate-500
    'oklch(0.4 0.02 240)': '#475569', // slate-600
    'oklch(0.3 0.02 240)': '#334155', // slate-700
    'oklch(0.2 0.02 240)': '#1e293b', // slate-800
    'oklch(0.1 0.02 240)': '#0f172a', // slate-900
    
    // Brand colors (blue)
    'oklch(0.6 0.15 240)': '#3b82f6', // blue-500
    'oklch(0.5 0.15 240)': '#2563eb', // blue-600
    'oklch(0.4 0.15 240)': '#1d4ed8', // blue-700
    
    // Success colors (green)
    'oklch(0.6 0.15 140)': '#22c55e', // green-500
    'oklch(0.5 0.15 140)': '#16a34a', // green-600
    
    // Warning colors (yellow/orange)
    'oklch(0.8 0.15 80)': '#fbbf24', // amber-400
    'oklch(0.7 0.15 80)': '#f59e0b', // amber-500
    
    // Error colors (red)
    'oklch(0.6 0.15 20)': '#ef4444', // red-500
    'oklch(0.5 0.15 20)': '#dc2626', // red-600
    
    // Neutral colors
    'oklch(0.95 0.005 240)': '#fafafa', // gray-50
    'oklch(0.9 0.005 240)': '#f5f5f5', // gray-100
    'oklch(0.8 0.005 240)': '#e5e5e5', // gray-200
    'oklch(0.7 0.005 240)': '#d4d4d4', // gray-300
    'oklch(0.6 0.005 240)': '#a3a3a3', // gray-400
    'oklch(0.5 0.005 240)': '#737373', // gray-500
    'oklch(0.4 0.005 240)': '#525252', // gray-600
    'oklch(0.3 0.005 240)': '#404040', // gray-700
    'oklch(0.2 0.005 240)': '#262626', // gray-800
    'oklch(0.1 0.005 240)': '#171717', // gray-900
    'oklch(0.05 0.005 240)': '#0a0a0a', // gray-950
  }
  
  // Try exact match first
  if (oklchToHex[oklchValue]) {
    return oklchToHex[oklchValue]
  }
  
  // Try partial match (for variations)
  for (const [oklch, hex] of Object.entries(oklchToHex)) {
    if (oklchValue.includes(oklch.substring(0, 20))) { // Match first part
      return hex
    }
  }
  
  // Fallback to a safe default
  return '#000000'
}

export interface ExportOptions {
  filename?: string
  format: 'png' | 'jpeg' | 'pdf'
  quality?: number
  scale?: number
}

/**
 * Export a DOM element as an image or PDF
 */
export async function exportElementAsImage(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<void> {
  try {
    // Temporarily replace oklch colors with hex fallbacks for html2canvas compatibility
    const originalStyles = new Map<string, string>()
    const elementsWithOklch = element.querySelectorAll('*')
    
    elementsWithOklch.forEach(el => {
      const computedStyle = window.getComputedStyle(el)
      const properties = ['color', 'background-color', 'border-color']
      
      properties.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop)
        if (value.includes('oklch')) {
          // Store original style
          originalStyles.set(`${el.tagName}.${prop}`, value)
          
          // Replace with hex fallback
          const fallbackColor = getHexFallback(value)
          if (fallbackColor) {
            ;(el as HTMLElement).style.setProperty(prop, fallbackColor, 'important')
          }
        }
      })
    })

    // Configure html2canvas options for high quality
    const canvas = await html2canvas(element, {
      scale: options.scale || 2, // Higher scale for better quality
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight
    })

    // Restore original styles
    elementsWithOklch.forEach(el => {
      const computedStyle = window.getComputedStyle(el)
      const properties = ['color', 'background-color', 'border-color']
      
      properties.forEach(prop => {
        const key = `${el.tagName}.${prop}`
        if (originalStyles.has(key)) {
          ;(el as HTMLElement).style.removeProperty(prop)
        }
      })
    })

    // Create download link
    const link = document.createElement('a')
    
    if (options.format === 'pdf') {
      // For PDF, we'll convert to image first then create a simple PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = await createSimplePDF(imgData, canvas.width, canvas.height)
      link.href = pdf
      link.download = options.filename || `receipt-${Date.now()}.pdf`
    } else {
      // Direct image export
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png'
      const imageData = canvas.toDataURL(mimeType, options.quality || 0.9)
      link.href = imageData
      link.download = options.filename || `receipt-${Date.now()}.${options.format}`
    }

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export receipt. Please try again.')
  }
}

/**
 * Create a simple PDF from image data
 */
async function createSimplePDF(imgData: string, width: number, height: number): Promise<string> {
  // For a full implementation, you'd use jsPDF or similar
  // For now, we'll create a simple data URL that browsers can handle
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const img = new Image()
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Calculate PDF dimensions (A4 ratio)
      const maxWidth = 794 // A4 width in pixels at 96 DPI
      const maxHeight = 1123 // A4 height in pixels at 96 DPI
      
      let canvasWidth = width
      let canvasHeight = height
      
      // Scale to fit A4 if necessary
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height)
        canvasWidth = width * scale
        canvasHeight = height * scale
      }
      
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      
      // Draw the image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
      
      resolve(canvas.toDataURL('image/png'))
    }
    
    img.onerror = () => reject(new Error('Failed to create PDF'))
    img.src = imgData
  })
}

/**
 * Share content using Web Share API or fallback to clipboard
 */
export async function shareContent(data: {
  title: string
  text: string
  url?: string
  files?: File[]
}): Promise<void> {
  try {
    if (navigator.share && (!data.files || navigator.canShare?.(data))) {
      await navigator.share(data)
    } else {
      // Fallback: copy text to clipboard
      const textContent = `${data.title}\n\n${data.text}${data.url ? `\n\n${data.url}` : ''}`
      await navigator.clipboard.writeText(textContent)
      
      // Show user feedback
      showShareFeedback('Content copied to clipboard!')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled, ignore
      return
    }
    
    // Fallback to clipboard
    try {
      const textContent = `${data.title}\n\n${data.text}${data.url ? `\n\n${data.url}` : ''}`
      await navigator.clipboard.writeText(textContent)
      showShareFeedback('Content copied to clipboard!')
    } catch {
      throw new Error('Unable to share content')
    }
  }
}

/**
 * Show temporary feedback message
 */
function showShareFeedback(message: string): void {
  const feedback = document.createElement('div')
  feedback.textContent = message
  feedback.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-medium'
  
  document.body.appendChild(feedback)
  
  setTimeout(() => {
    feedback.remove()
  }, 3000)
}

/**
 * Export receipt card as image with proper formatting
 */
export async function exportReceiptCard(
  element: HTMLElement,
  personName: string,
  billTitle: string,
  format: 'png' | 'jpeg' | 'pdf' = 'png'
): Promise<void> {
  const filename = `${billTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${personName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_receipt.${format}`
  
  await exportElementAsImage(element, {
    filename,
    format,
    scale: 3, // Higher scale for receipt cards
    quality: 0.95
  })
}

/**
 * Export group receipt as image with proper formatting
 */
export async function exportGroupReceipt(
  element: HTMLElement,
  billTitle: string,
  format: 'png' | 'jpeg' | 'pdf' = 'pdf'
): Promise<void> {
  const filename = `${billTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_group_receipt.${format}`
  
  await exportElementAsImage(element, {
    filename,
    format,
    scale: 2,
    quality: 0.95
  })
}

/**
 * Create shareable text for bill split
 */
export function createShareableText(data: {
  billTitle: string
  location?: string
  date: string
  people: Array<{ name: string; total: number }>
  total: number
}): { title: string; text: string } {
  const title = `${data.billTitle} - Bill Split`
  
  const text = `💰 ${data.billTitle} Bill Split
${data.location ? `📍 ${data.location}` : ''}
📅 ${new Date(data.date).toLocaleDateString()}

👥 ${data.people.length} people • $${data.total.toFixed(2)} total

Split breakdown:
${data.people.map(p => `• ${p.name}: $${p.total.toFixed(2)}`).join('\n')}

Split with Tabby! 🐱`

  return { title, text }
}

/**
 * Create shareable text for individual receipt
 */
export function createIndividualShareText(data: {
  billTitle: string
  location?: string
  date: string
  personName: string
  items: Array<{ label: string; emoji: string; price: number; weight?: number }>
  total: number
}): { title: string; text: string } {
  const title = `Your bill from ${data.billTitle}`
  
  const text = `💰 Your share from ${data.billTitle}
${data.location ? `📍 ${data.location}` : ''}
📅 ${new Date(data.date).toLocaleDateString()}

${data.personName}'s items:
${data.items.map(item => 
  `• ${item.emoji} ${item.label} - $${(item.price * (item.weight || 1)).toFixed(2)}`
).join('\n')}

Your total: $${data.total.toFixed(2)}

Split with Tabby! 🐱`

  return { title, text }
}

/**
 * Show success message
 */
export function showSuccess(message: string): void {
  showShareFeedback(`✅ ${message}`)
}

/**
 * Show error message  
 */
export function showError(message: string): void {
  const feedback = document.createElement('div')
  feedback.textContent = `❌ ${message}`
  feedback.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-medium'
  
  document.body.appendChild(feedback)
  
  setTimeout(() => {
    feedback.remove()
  }, 4000)
}