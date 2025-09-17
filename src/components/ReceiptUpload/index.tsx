import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileImage, X, Camera, Loader } from '@/lib/icons'
import { logServer } from '@/lib/errorLogger'

interface ReceiptUploadProps {
  onFileSelect: (files: File[]) => void
  onUploadComplete?: (results: UploadResult[]) => void
  maxFiles?: number
  maxSizeBytes?: number
  className?: string
}

interface UploadResult {
  file: File
  url: string
  thumbnail?: string
  ocrText?: string
  confidence?: number
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ 
  onFileSelect,
  onUploadComplete,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([])
  const [uploading, setUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [maxFiles, maxSizeBytes])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [maxFiles, maxSizeBytes])

  const handleFiles = useCallback(async (files: File[]) => {
    // Filter valid files
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf'
      const isValidSize = file.size <= maxSizeBytes
      return isValidType && isValidSize
    })

    if (validFiles.length === 0) return

    // Limit to maxFiles
    const filesToProcess = validFiles.slice(0, maxFiles - uploadedFiles.length)
    
    onFileSelect(filesToProcess)
    
    setUploading(true)
    
    try {
      // Create preview URLs and process files
      const results: UploadResult[] = await Promise.all(
        filesToProcess.map(async (file) => {
          const url = URL.createObjectURL(file)
          
          // Generate thumbnail for images and PDFs
          let thumbnail: string | undefined
          if (file.type.startsWith('image/')) {
            thumbnail = await createImageThumbnail(file)
          } else if (file.type === 'application/pdf') {
            thumbnail = await createPdfThumbnail(file)
          }

          return {
            file,
            url,
            thumbnail,
            // OCR will be added later
            ocrText: undefined,
            confidence: undefined
          }
        })
      )

      setUploadedFiles(prev => [...prev, ...results])
      onUploadComplete?.(results)
    } catch (error) {
      console.error('Error processing files:', error)
      logServer('error', 'Failed to process files', { error, context: 'ReceiptUpload.handleUpload' })
    } finally {
      setUploading(false)
    }
  }, [maxFiles, maxSizeBytes, uploadedFiles.length, onFileSelect, onUploadComplete])

  const createImageThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Calculate thumbnail size (max 200px for better quality)
        const maxSize = 200
        const ratio = Math.min(maxSize / img.width, maxSize / img.height)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio
        
        canvas.width = newWidth
        canvas.height = newHeight
        
        // Use better image scaling
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)
        
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      
      img.onerror = () => {
        // Fallback for unsupported image formats
        resolve('')
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const createPdfThumbnail = async (file: File): Promise<string> => {
    try {
      // For PDFs, we'll create a placeholder thumbnail
      // In a full implementation, you'd use PDF.js to render the first page
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      canvas.width = 200
      canvas.height = 250
      
      // Create a PDF placeholder
      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Add PDF icon
      ctx.fillStyle = '#6c757d'
      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('📄', canvas.width / 2, canvas.height / 2 - 20)
      
      // Add PDF text
      ctx.fillStyle = '#495057'
      ctx.font = '12px Arial'
      ctx.fillText('PDF', canvas.width / 2, canvas.height / 2 + 40)
      ctx.fillText(file.name.substring(0, 20), canvas.width / 2, canvas.height / 2 + 60)
      
      // Add border
      ctx.strokeStyle = '#dee2e6'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, canvas.width, canvas.height)
      
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.error('Error creating PDF thumbnail:', error)
      logServer('error', 'Failed to create PDF thumbnail', { error, context: 'ReceiptUpload.createPdfThumbnail' })
      return ''
    }
  }

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Clean up object URLs
      if (prev[index]?.url) {
        URL.revokeObjectURL(prev[index].url)
      }
      return updated
    })
  }, [])

  const canUploadMore = uploadedFiles.length < maxFiles

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      {canUploadMore && (
        <motion.div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${isDragOver 
              ? 'border-brand bg-brand/5 scale-105' 
              : 'border-line hover:border-brand/50 hover:bg-brand/2'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="space-y-4">
            <motion.div 
              className="mx-auto w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center"
              animate={{ rotate: uploading ? 360 : 0 }}
              transition={{ duration: 2, repeat: uploading ? Infinity : 0, ease: "linear" }}
            >
              {uploading ? (
                <Loader className="w-8 h-8 text-brand" />
              ) : (
                <Upload className="w-8 h-8 text-brand" />
              )}
            </motion.div>
            
            <div>
              <h3 className="text-lg font-medium text-ink mb-1">
                {uploading ? 'Processing receipts...' : 'Upload Receipt'}
              </h3>
              <p className="text-ink-dim text-sm">
                Drag & drop images or PDFs, or click to browse
              </p>
              <p className="text-ink-dim text-xs mt-1">
                Up to {maxFiles} files, max {Math.round(maxSizeBytes / 1024 / 1024)}MB each
              </p>
            </div>

            <div className="flex justify-center gap-4 text-sm text-ink-dim">
              <div className="flex items-center gap-1">
                <FileImage className="w-4 h-4" />
                JPG, PNG, HEIC
              </div>
              <div className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                PDF
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="font-medium text-ink">Uploaded Receipts ({uploadedFiles.length})</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedFiles.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group bg-card rounded-lg border border-line overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-paper flex items-center justify-center">
                    {result.thumbnail ? (
                      <img 
                        src={result.thumbnail} 
                        alt={result.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileImage className="w-8 h-8 text-ink-dim" />
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="p-2">
                    <p className="text-xs font-medium text-ink truncate">
                      {result.file.name}
                    </p>
                    <p className="text-xs text-ink-dim">
                      {(result.file.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  </div>
                  
                  {/* Remove Button */}
                  <motion.button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}