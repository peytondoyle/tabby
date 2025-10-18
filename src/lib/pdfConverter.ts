/**
 * PDF to Image Converter
 * Converts PDF files to images for receipt scanning
 */

import { logServer } from './errorLogger'

/**
 * Convert PDF to image using pdf.js
 * Takes first page of PDF and renders to canvas, then converts to JPEG
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

    // Get first page
    const page = await pdf.getPage(1)

    // Calculate scale to get reasonable image size (768px width, matching image compression)
    const viewport = page.getViewport({ scale: 1.0 })
    const scale = 768 / viewport.width
    const scaledViewport = page.getViewport({ scale })

    // Create canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Could not get canvas context')
    }

    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    }

    await page.render(renderContext).promise

    console.log('[pdf_convert] PDF rendered to canvas:', {
      width: canvas.width,
      height: canvas.height
    })

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
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
      filename: imageFile.name
    })

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
