/**
 * Receipt Export Utilities
 * High-fidelity export with device pixel ratio support
 */

export interface ExportOptions {
  scale?: number
  backgroundColor?: string
  useCORS?: boolean
  allowTaint?: boolean
  logging?: boolean
}

/**
 * Get optimal scale for crisp text rendering
 */
export const getOptimalScale = (): number => {
  return window.devicePixelRatio || 1
}

/**
 * Export receipt with high fidelity
 */
export const exportReceipt = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<string> => {
  const {
    scale = getOptimalScale(),
    backgroundColor = '#FFFFFF',
    useCORS = true,
    allowTaint = false,
    logging = false
  } = options

  // Dynamic import of html2canvas to avoid bundle bloat
  const html2canvas = (await import('html2canvas')).default

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor,
    useCORS,
    allowTaint,
    logging,
    // Ensure crisp text rendering
    foreignObjectRendering: true,
    // Remove shadows and effects for print
    ignoreElements: (element) => {
      return element.classList.contains('stage-shadow') || 
             element.classList.contains('backdrop')
    }
  })

  return canvas.toDataURL('image/png', 1.0)
}

/**
 * Print receipt with print-safe styles
 */
export const printReceipt = (element: HTMLElement): void => {
  // Add print-safe class
  element.classList.add('receipt-export')
  
  // Create print window
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  // Get the element's HTML with print styles
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .receipt-export {
              background: #FFFFFF !important;
              color: #000000 !important;
              box-shadow: none !important;
            }
            .receipt-export .receipt-divider {
              border-color: #EDEDED !important;
            }
            .stage-shadow, .backdrop {
              display: none !important;
            }
            .price-tabular {
              font-variant-numeric: tabular-nums;
              text-align: right;
              min-width: 88px;
            }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `

  printWindow.document.write(printContent)
  printWindow.document.close()
  
  // Print after content loads
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

/**
 * Download receipt as PNG
 */
export const downloadReceipt = async (
  element: HTMLElement,
  filename: string = 'receipt.png',
  options: ExportOptions = {}
): Promise<void> => {
  const dataUrl = await exportReceipt(element, options)
  
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
