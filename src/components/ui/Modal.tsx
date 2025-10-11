import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { getMotionConfig, safeTransition } from "@/lib/motionUtils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  danger?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl"
};

export const Modal: React.FC<ModalProps> = ({ 
  open, 
  onClose, 
  title, 
  size = "md", 
  danger = false, 
  footer, 
  children 
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" data-testid="modal-overlay">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={safeTransition({ duration: 0.2 })}
          />
          
          {/* Modal Sheet */}
          <motion.div 
            className={`relative w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col`}
            {...getMotionConfig('slideUp')}
          >
            <Card className="flex flex-col h-full overflow-hidden">
              {/* Header - Pinned */}
              {title && (
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default flex-shrink-0">
                  <h3 className={`text-lg font-semibold ${
                    danger ? "text-danger" : "text-text-primary"
                  }`}>
                    {title}
                  </h3>
                  <IconButton
                    size="sm"
                    tone="neutral"
                    aria-label="Close modal"
                    onClick={onClose}
                    data-testid="close-modal-button"
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M12 4L4 12M4 4L12 12" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </IconButton>
                </div>
              )}
              
              {/* Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {children}
              </div>
              
              {/* Footer - Pinned */}
              {footer && (
                <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-border-default flex-shrink-0">
                  {footer}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

Modal.displayName = "Modal";