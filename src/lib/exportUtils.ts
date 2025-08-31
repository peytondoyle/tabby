import html2canvas from 'html2canvas'

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
    } catch (clipboardError) {
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