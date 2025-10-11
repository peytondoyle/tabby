/**
 * iOS-Inspired Modal Component
 * Sheet-style from bottom with backdrop blur and smooth spring animation
 */

import React, { useEffect, useRef } from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children?: React.ReactNode
  title?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledModal = styled('div')
const Backdrop = styled('div')
const ModalContent = styled('div')
const Header = styled('div')
const CloseButton = styled('button')

// ============================================================================
// COMPONENT
// ============================================================================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
    } else {
      previousActiveElement.current?.focus()
    }
  }, [isOpen])

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // Backdrop styles (Billy dark theme)
  const backdropStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    zIndex: designTokens.zIndex.modalBackdrop,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: designTokens.spacing[4],
  }

  // Modal content styles (Billy dark theme)
  const modalContentStyles: React.CSSProperties = {
    backgroundColor: designTokens.semantic.background.secondary,
    borderRadius: `${designTokens.borderRadius['3xl']} ${designTokens.borderRadius['3xl']} 0 0`,
    border: `1px solid ${designTokens.semantic.border.subtle}`,
    boxShadow: designTokens.shadows.lg,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateY(0)',
    transition: designTokens.transitions.spring,
    zIndex: designTokens.zIndex.modal,
  }

  // Header styles (Billy dark theme)
  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designTokens.spacing[4],
    borderBottom: `1px solid ${designTokens.semantic.border.subtle}`,
    flexShrink: 0,
  }

  // Title styles (Billy dark theme)
  const titleStyles: React.CSSProperties = {
    fontSize: designTokens.typography.fontSize.lg,
    fontWeight: designTokens.typography.fontWeight.semibold,
    color: designTokens.semantic.text.primary,
    margin: 0,
  }

  // Close button styles (Billy dark theme)
  const closeButtonStyles: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: designTokens.borderRadius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: designTokens.semantic.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: designTokens.typography.fontSize.lg,
    transition: designTokens.transitions.fast,
  }

  // Content styles
  const contentStyles: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: designTokens.spacing[4],
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle close button hover (Billy dark theme)
  const handleCloseButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, {
      backgroundColor: 'rgba(255,255,255,0.08)',
      color: designTokens.semantic.text.primary,
    })
  }

  const handleCloseButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, closeButtonStyles)
  }

  return (
    <Backdrop
      style={backdropStyles}
      onClick={handleBackdropClick}
    >
      <ModalContent
        ref={modalRef}
        style={modalContentStyles}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || showCloseButton) && (
          <Header style={headerStyles}>
            {title && (
              <h2 id="modal-title" style={titleStyles}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <CloseButton
                style={closeButtonStyles}
                onClick={onClose}
                onMouseEnter={handleCloseButtonHover}
                onMouseLeave={handleCloseButtonLeave}
                aria-label="Close modal"
              >
                ×
              </CloseButton>
            )}
          </Header>
        )}
        
        <div style={contentStyles}>
          {children}
        </div>
      </ModalContent>
    </Backdrop>
  )
}

Modal.displayName = 'Modal'
