/**
 * PDF to Image Converter
 * Converts PDF files to images for receipt scanning
 */

import { logServer } from './errorLogger'

/**
 * Convert PDF to image using pdf.js
 * Handles multi-page PDFs by stitching all pages vertically into a single image
 */
export async function convertPdfToImage(pdfFile: File): Promise<File> {
  try {
    console.log('[pdf_convert] Starting PDF conversion:', pdfFile.name)

    // Dynamically import pdf.js (only load when needed)
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker source - use the minified version for better performance
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default

    console.log('[pdf_convert] PDF.js loaded, worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc)

    // Read PDF file as array buffer
    const arrayBuffer = await pdfFile.arrayBuffer()

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    console.log('[pdf_convert] PDF loaded, pages:', pdf.numPages)

    // Process all pages (limit to 5 pages to avoid huge images)
    const maxPages = Math.min(pdf.numPages, 5)
    const pageCanvases: HTMLCanvasElement[] = []
    let totalHeight = 0
    let maxWidth = 0

    // Render each page
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`[pdf_convert] Processing page ${pageNum}/${maxPages}`)

      const page = await pdf.getPage(pageNum)

      // Calculate scale to get reasonable image size (768px width)
      const viewport = page.getViewport({ scale: 1.0 })
      const scale = 768 / viewport.width
      const scaledViewport = page.getViewport({ scale })

      // Create canvas for this page
      const pageCanvas = document.createElement('canvas')
      const pageContext = pageCanvas.getContext('2d')

      if (!pageContext) {
        throw new Error('Could not get canvas context')
      }

      pageCanvas.width = scaledViewport.width
      pageCanvas.height = scaledViewport.height

      // Render page to canvas
      const renderContext = {
        canvasContext: pageContext,
        viewport: scaledViewport,
      }

      await page.render(renderContext).promise

      pageCanvases.push(pageCanvas)
      totalHeight += pageCanvas.height
      maxWidth = Math.max(maxWidth, pageCanvas.width)
    }

    // Create combined canvas for all pages
    const combinedCanvas = document.createElement('canvas')
    const combinedContext = combinedCanvas.getContext('2d')

    if (!combinedContext) {
      throw new Error('Could not get combined canvas context')
    }

    // Add small gaps between pages (10px)
    const pageGap = 10
    combinedCanvas.width = maxWidth
    combinedCanvas.height = totalHeight + (pageGap * (pageCanvases.length - 1))

    // Fill background with white
    combinedContext.fillStyle = '#FFFFFF'
    combinedContext.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height)

    // Draw all pages vertically
    let currentY = 0
    for (const pageCanvas of pageCanvases) {
      combinedContext.drawImage(pageCanvas, 0, currentY)
      currentY += pageCanvas.height + pageGap

      // Add subtle separator line between pages
      if (currentY < combinedCanvas.height) {
        combinedContext.strokeStyle = '#E0E0E0'
        combinedContext.lineWidth = 1
        combinedContext.beginPath()
        combinedContext.moveTo(0, currentY - pageGap / 2)
        combinedContext.lineTo(combinedCanvas.width, currentY - pageGap / 2)
        combinedContext.stroke()
      }
    }

    console.log('[pdf_convert] All pages rendered to combined canvas:', {
      width: combinedCanvas.width,
      height: combinedCanvas.height,
      pages: pageCanvases.length
    })

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      combinedCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/jpeg',
        0.70 // Matching image compression quality
      )
    })

    // Create File from blob
    const imageFile = new File(
      [blob],
      pdfFile.name.replace(/\.pdf$/i, '.jpg'),
      { type: 'image/jpeg' }
    )

    console.log('[pdf_convert] PDF converted to image:', {
      originalSize: pdfFile.size,
      imageSize: imageFile.size,
      filename: imageFile.name,
      pagesProcessed: pageCanvases.length,
      totalPages: pdf.numPages
    })

    if (pdf.numPages > maxPages) {
      console.warn(`[pdf_convert] Only first ${maxPages} pages were processed (PDF has ${pdf.numPages} pages)`)
    }

    return imageFile

  } catch (error) {
    console.error('[pdf_convert] PDF conversion failed:', error)

    // Provide more specific error messages
    let errorMessage = 'Failed to convert PDF. Please try a different file.'

    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF structure')) {
        errorMessage = 'The PDF file appears to be corrupted. Please try a different file.'
      } else if (error.message.includes('Password required')) {
        errorMessage = 'This PDF is password protected. Please use an unprotected PDF.'
      } else if (error.message.includes('worker')) {
        errorMessage = 'PDF processing failed. Please refresh the page and try again.'
      } else {
        // Include the actual error for debugging
        errorMessage = `PDF conversion error: ${error.message}`
      }
    }

    logServer('error', 'PDF conversion failed', {
      error: error instanceof Error ? error.message : String(error),
      fileName: pdfFile.name,
      fileSize: pdfFile.size,
      context: 'convertPdfToImage'
    })

    throw new Error(errorMessage)
  }
}
