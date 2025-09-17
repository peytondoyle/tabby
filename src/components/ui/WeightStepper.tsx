import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from '@/lib/icons'
import { Button } from './Button'
import { WeightSchema } from '@/lib/schemas'
import { showError } from '@/lib/exportUtils'

interface WeightStepperProps {
  value: number
  onChange: (newValue: number) => void
  min?: number
  max?: number
  step?: number
  debounceMs?: number
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const WeightStepper: React.FC<WeightStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  debounceMs = 300,
  disabled = false,
  className = '',
  size = 'md'
}) => {
  const [localValue, setLocalValue] = useState(value)
  const [isChanging, setIsChanging] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  const debouncedOnChange = useCallback((newValue: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      onChange(newValue)
      setIsChanging(false)
    }, debounceMs)
  }, [onChange, debounceMs])

  // Handle value change
  const handleChange = useCallback((newValue: number) => {
    try {
      // Validate using zod schema
      const validatedValue = WeightSchema.parse(newValue)
      const clampedValue = Math.max(min, Math.min(max, validatedValue))
      
      if (clampedValue !== localValue) {
        setLocalValue(clampedValue)
        setIsChanging(true)
        
        // Clear any existing change timeout
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current)
        }
        
        // Set timeout to show changing state
        changeTimeoutRef.current = setTimeout(() => {
          setIsChanging(false)
        }, 100)
        
        debouncedOnChange(clampedValue)
      }
    } catch (error) {
      // Show validation error
      if (error instanceof Error) {
        showError(error.message)
      }
      // Reset to current valid value
      setLocalValue(value)
    }
  }, [localValue, min, max, debouncedOnChange, value])

  // Handle increment
  const handleIncrement = useCallback(() => {
    if (!disabled) {
      handleChange(localValue + step)
    }
  }, [localValue, step, disabled, handleChange])

  // Handle decrement
  const handleDecrement = useCallback(() => {
    if (!disabled && localValue > min) {
      handleChange(localValue - step)
    }
  }, [localValue, step, min, disabled, handleChange])

  // Handle direct input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value, 10)
    if (!isNaN(inputValue)) {
      handleChange(inputValue)
    }
  }, [handleChange])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current)
      }
    }
  }, [])

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  }

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Decrement button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDecrement}
        disabled={disabled || localValue <= min}
        className={`${sizeClasses[size]} min-w-0 p-1`}
        title={`Decrease weight (min: ${min})`}
      >
        <Minus size={iconSizes[size]} />
      </Button>

      {/* Value display */}
      <div className="relative">
        <input
          type="number"
          value={localValue}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`
            w-12 text-center font-mono bg-transparent border-none outline-none
            ${sizeClasses[size]}
            ${disabled ? 'text-text-muted' : 'text-text-primary'}
            ${isChanging ? 'text-accent' : ''}
          `}
        />
        
        {/* Changing indicator */}
        <AnimatePresence>
          {isChanging && (
            <motion.div
              className="absolute inset-0 bg-accent/10 rounded pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Increment button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleIncrement}
        disabled={disabled || localValue >= max}
        className={`${sizeClasses[size]} min-w-0 p-1`}
        title={`Increase weight (max: ${max})`}
      >
        <Plus size={iconSizes[size]} />
      </Button>
    </div>
  )
}
