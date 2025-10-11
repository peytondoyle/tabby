import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import { deviceDetector } from '@/lib/deviceCapabilities'

interface ListSuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  listType: 'item-list' | 'person-items' | 'dnd-container'
  className?: string
}

/**
 * Device-aware Suspense wrapper for virtualized lists
 * Provides optimized loading states based on device capabilities
 */
const ListSuspenseWrapper: React.FC<ListSuspenseWrapperProps> = ({
  children,
  fallback,
  listType,
  className = ''
}) => {
  const device = deviceDetector.detect()
  
  // Device-aware loading states
  const getFallback = (): React.ReactNode => {
    if (fallback) return fallback
    
    const itemCount = device.processingPower === 'high' ? 8 : 
                     device.processingPower === 'medium' ? 6 : 4
    
    const itemHeight = device.isMobile ? 60 : 80
    const itemSpacing = device.isMobile ? 8 : 12
    
    return (
      <div className={`list-suspense-fallback ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {Array.from({ length: itemCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: i * 0.1,
                duration: 0.3,
                ease: "easeOut"
              }}
              className="bg-surface rounded-lg p-3 animate-pulse"
              style={{ 
                height: itemHeight,
                marginBottom: itemSpacing
              }}
            >
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-3 flex-1">
                  {/* Item icon placeholder */}
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  
                  {/* Item content placeholder */}
                  <div className="flex-1 space-y-2">
                    <div 
                      className="bg-gray-200 rounded"
                      style={{ 
                        height: 16,
                        width: `${60 + Math.random() * 40}%`
                      }}
                    />
                    {listType === 'item-list' && (
                      <div 
                        className="bg-gray-200 rounded"
                        style={{ 
                          height: 12,
                          width: `${30 + Math.random() * 20}%`
                        }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Price placeholder */}
                <div 
                  className="bg-gray-200 rounded flex-shrink-0"
                  style={{ 
                    height: 16,
                    width: 60
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center mt-4"
        >
          <div className="flex items-center gap-2 text-text-tertiary text-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
            />
            <span>Loading {listType.replace('-', ' ')}...</span>
          </div>
        </motion.div>
      </div>
    )
  }
  
  // Device-aware performance hints
  const getPerformanceHints = () => {
    if (device.processingPower === 'low') {
      return {
        // Reduce motion for low-end devices
        style: {
          willChange: 'auto',
          contain: 'layout'
        }
      }
    }
    
    if (device.processingPower === 'medium') {
      return {
        style: {
          willChange: 'transform',
          contain: 'layout style'
        }
      }
    }
    
    // High-end devices
    return {
      style: {
        willChange: 'transform',
        contain: 'layout style paint',
        transform: 'translateZ(0)' // Force GPU acceleration
      }
    }
  }
  
  const performanceHints = getPerformanceHints()
  
  return (
    <div 
      className={`list-suspense-wrapper ${className}`}
      style={performanceHints.style}
    >
      <Suspense fallback={getFallback()}>
        {children}
      </Suspense>
    </div>
  )
}

export default ListSuspenseWrapper
