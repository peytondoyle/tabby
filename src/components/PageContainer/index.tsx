import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  variant?: 'hero' | 'content'
  className?: string
  maxWidth?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  variant = 'content',
  className = '',
  maxWidth = 'max-w-7xl'
}) => {
  if (variant === 'hero') {
    return (
      <div className={`min-h-svh grid place-items-center px-6 ${className}`}>
        <div className={`w-full ${maxWidth} mx-auto`}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${maxWidth} mx-auto px-6 ${className}`}>
      {children}
    </div>
  )
}