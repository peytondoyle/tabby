import React, { Suspense, lazy } from 'react'

// Lazy load the SharePage component
const SharePage = lazy(() => import('./SharePage').then(m => ({ default: m.SharePage })))

// Lightweight loading fallback for SharePage
const SharePageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 rounded mb-6"></div>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
)

export const LazySharePage: React.FC = () => {
  return (
    <Suspense fallback={<SharePageSkeleton />}>
      <SharePage />
    </Suspense>
  )
}
