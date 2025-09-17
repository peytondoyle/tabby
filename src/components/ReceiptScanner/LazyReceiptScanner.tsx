import React, { Suspense, lazy } from 'react'
import type { ParseResult } from '@/lib/receiptScanning'

// Lazy load the ReceiptScanner component
const ReceiptScanner = lazy(() => import('./index').then(m => ({ default: m.ReceiptScanner })))

interface LazyReceiptScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onParsed: (result: ParseResult) => void
  externalError?: string
}

// Lightweight loading fallback for ReceiptScanner
const ReceiptScannerSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-surface rounded-lg p-8 max-w-md w-full mx-4">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
)

export const LazyReceiptScanner: React.FC<LazyReceiptScannerProps> = (props) => {
  return (
    <Suspense fallback={<ReceiptScannerSkeleton />}>
      <ReceiptScanner {...props} />
    </Suspense>
  )
}
