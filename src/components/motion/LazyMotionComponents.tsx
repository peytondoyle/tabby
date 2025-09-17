import React, { Suspense, lazy } from 'react'

// Lazy load motion-heavy components
const OptimizedDragDropAssign = lazy(() => 
  import('../DragDropAssign/OptimizedDragDropAssign').then(m => ({ 
    default: m.OptimizedDragDropAssign 
  }))
)

const VirtualizedItemList = lazy(() => 
  import('../VirtualizedItemList').then(m => ({ 
    default: m.VirtualizedItemList 
  }))
)

const VirtualizedPersonItems = lazy(() => 
  import('../VirtualizedItemList/VirtualizedPersonItems').then(m => ({ 
    default: m.VirtualizedPersonItems 
  }))
)

// Lightweight loading fallback for motion components
const MotionSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 bg-gray-200 rounded"></div>
  </div>
)

// Wrapper components with Suspense
export const LazyOptimizedDragDropAssign: React.FC<any> = (props) => (
  <Suspense fallback={<MotionSkeleton className="h-64" />}>
    <OptimizedDragDropAssign {...props} />
  </Suspense>
)

export const LazyVirtualizedItemList: React.FC<any> = (props) => (
  <Suspense fallback={<MotionSkeleton className="h-96" />}>
    <VirtualizedItemList {...props} />
  </Suspense>
)

export const LazyVirtualizedPersonItems: React.FC<any> = (props) => (
  <Suspense fallback={<MotionSkeleton className="h-64" />}>
    <VirtualizedPersonItems {...props} />
  </Suspense>
)
