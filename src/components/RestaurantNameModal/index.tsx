import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Modal, Button } from '@/components/design-system'

interface RestaurantNameModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (name: string) => void
  onSkip: () => void
  currentName?: string
}

export const RestaurantNameModal: React.FC<RestaurantNameModalProps> = ({
  open,
  onClose,
  onSubmit,
  onSkip,
  currentName = ''
}) => {
  const [restaurantName, setRestaurantName] = useState(currentName)

  const handleSubmit = () => {
    if (restaurantName.trim()) {
      onSubmit(restaurantName.trim())
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && restaurantName.trim()) {
      handleSubmit()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Restaurant Name"
      size="sm"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!restaurantName.trim()}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-[var(--ui-text-dim)]">
            Where did you eat? (Optional)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--ui-text)] mb-2">
            Restaurant Name
          </label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Olive Garden, McDonald's, etc."
            className="w-full p-3 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-md)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-dim)] focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
            autoFocus
          />
        </div>
      </motion.div>
    </Modal>
  )
}
