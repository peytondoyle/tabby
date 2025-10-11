import React from 'react'
import { useNavigate } from 'react-router-dom'
import { testIds } from '@/lib/testIds'

interface SplashScreenProps {
  onScanReceipt: (mode?: 'camera' | 'gallery') => void
  onClose?: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onScanReceipt, onClose }) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Tabby Logo */}
      <div className="text-center mb-12">
        <div className="mb-6">
          <div className="text-8xl mb-4">🐱</div>
          <h1 className="text-5xl font-bold text-text-primary mb-2">Tabby</h1>
          <p className="text-xl text-text-secondary">Split bills with ease ✨</p>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Welcome!</h2>
        <p className="text-text-secondary text-lg">
          Let's snap a photo of your receipt to start splitting the bill.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        {/* Scan Receipt Button */}
        <button
          onClick={() => onScanReceipt('camera')}
          className="w-full bg-primary hover:bg-primary-hover text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200"
          data-testid={testIds.scanReceiptButton}
        >
          <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
            📷
          </div>
          <span>Scan Receipt</span>
        </button>

        {/* View Bills Button */}
        <button
          onClick={() => navigate('/bills')}
          className="w-full bg-surface border border-border hover:border-primary/50 text-text-primary py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200"
          data-testid={testIds.myBillsLink}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            📋
          </div>
          <span>View My Bills</span>
        </button>

        {/* Close Button (if onClose is provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full bg-background border border-border hover:border-primary/50 text-text-secondary py-2 px-6 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200 mt-2"
            data-testid={testIds.closeModalButton}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              ✕
            </div>
            <span>Close</span>
          </button>
        )}
      </div>
    </div>
  )
}
