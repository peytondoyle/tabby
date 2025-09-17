import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateLargeBillFixture, generateSmallBillFixture } from '@/fixtures/largeBillFixture'
import { ProfilerWrapper, usePerformanceMonitor, autoOpenProfiler } from '@/lib/performance'
import { useFlowStore } from '@/lib/flowStore'
import { KeyboardFlow } from '@/components/flow/KeyboardFlow'
import { BillyAssignScreen } from '@/components/flow/BillyAssignScreen'
import { Button } from '@/components/ui/Button'
import { useReducedMotion, getMotionVariants } from '@/lib/accessibility'
import type { Item, Person, PersonTotal } from '@/lib/types'
import { flowItemToItem } from '@/lib/types'

export const ProfilePage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const motionVariants = getMotionVariants(prefersReducedMotion)
  const { startMarker, endMarker, clear, generateReport } = usePerformanceMonitor()
  
  const [isLoading, setIsLoading] = useState(false)
  const [useLargeFixture, setUseLargeFixture] = useState(true)
  const [useKeyboardMode, setUseKeyboardMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [performanceReport, setPerformanceReport] = useState<string>('')
  const [showReport, setShowReport] = useState(false)
  
  const {
    items,
    people,
    setStep,
    replaceItems,
    setPeople,
    setBillMeta,
    assign,
    getItemAssignments,
    computeTotals
  } = useFlowStore()

  // Auto-open profiler in profile mode
  useEffect(() => {
    autoOpenProfiler()
  }, [])

  // Load fixture data
  const loadFixture = useCallback(async (useLarge: boolean) => {
    setIsLoading(true)
    startMarker('load-fixture', { useLarge })
    
    try {
      const fixture = useLarge ? generateLargeBillFixture() : generateSmallBillFixture()
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Load data into store
      replaceItems(fixture.items)
      setPeople(fixture.people)
      setBillMeta(fixture.billMeta)
      setStep('assign')
      
      endMarker('load-fixture')
    } catch (error) {
      console.error('Failed to load fixture:', error)
    } finally {
      setIsLoading(false)
    }
  }, [replaceItems, setPeople, setBillMeta, setStep, startMarker, endMarker])

  // Load fixture on mount
  useEffect(() => {
    loadFixture(useLargeFixture)
  }, [loadFixture, useLargeFixture])

  // Performance handlers
  const handleToggleItemSelection = useCallback((item: Item, index: number) => {
    startMarker('toggle-item-selection', { itemId: item.id, index })
    
    setSelectedItems(prev => {
      const isSelected = prev.includes(item.id)
      const newSelection = isSelected 
        ? prev.filter(id => id !== item.id)
        : [...prev, item.id]
      
      endMarker('toggle-item-selection')
      return newSelection
    })
  }, [startMarker, endMarker])

  const handleClearSelection = useCallback(() => {
    startMarker('clear-selection')
    setSelectedItems([])
    endMarker('clear-selection')
  }, [startMarker, endMarker])

  const handleAssignItem = useCallback((itemId: string, personId: string) => {
    startMarker('assign-item', { itemId, personId })
    assign(itemId, personId, 1)
    endMarker('assign-item')
  }, [assign, startMarker, endMarker])

  const handleUnassignItem = useCallback((itemId: string, personId: string) => {
    startMarker('unassign-item', { itemId, personId })
    // This would need to be implemented in the store
    console.log('Unassign item', itemId, personId)
    endMarker('unassign-item')
  }, [startMarker, endMarker])

  const handlePersonClick = useCallback((person: Person) => {
    startMarker('person-click', { personId: person.id })
    console.log('Person clicked', person)
    endMarker('person-click')
  }, [startMarker, endMarker])

  const handlePersonTotalClick = useCallback((person: Person) => {
    startMarker('person-total-click', { personId: person.id })
    console.log('Person total clicked', person)
    endMarker('person-total-click')
  }, [startMarker, endMarker])

  // Generate performance report
  const generatePerformanceReport = useCallback(() => {
    startMarker('generate-report')
    const report = generateReport()
    setPerformanceReport(report)
    setShowReport(true)
    endMarker('generate-report')
  }, [generateReport, startMarker, endMarker])

  // Clear performance data
  const clearPerformanceData = useCallback(() => {
    clear()
    setPerformanceReport('')
    setShowReport(false)
  }, [clear])

  // Compute totals for keyboard flow
  const billTotals = computeTotals()
  const personTotals: PersonTotal[] = people.map(person => ({
    personId: person.id,
    personName: person.name,
    name: person.name,
    total: billTotals.personTotals[person.id] || 0,
    subtotal: billTotals.personTotals[person.id] || 0,
    tax_share: 0,
    tip_share: 0
  }))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          variants={motionVariants}
          initial="initial"
          animate="animate"
          className="text-center space-y-4"
        >
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <h2 className="text-xl font-bold text-text-primary">Loading Performance Test...</h2>
          <p className="text-text-secondary">Preparing {useLargeFixture ? '150' : '10'} items for testing</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Performance Profiling</h1>
          
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-text-secondary">Fixture Size:</label>
              <Button
                variant={useLargeFixture ? "primary" : "secondary"}
                size="sm"
                onClick={() => setUseLargeFixture(true)}
              >
                150 Items
              </Button>
              <Button
                variant={!useLargeFixture ? "primary" : "secondary"}
                size="sm"
                onClick={() => setUseLargeFixture(false)}
              >
                10 Items
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-text-secondary">Mode:</label>
              <Button
                variant={useKeyboardMode ? "primary" : "secondary"}
                size="sm"
                onClick={() => setUseKeyboardMode(true)}
              >
                Keyboard
              </Button>
              <Button
                variant={!useKeyboardMode ? "primary" : "secondary"}
                size="sm"
                onClick={() => setUseKeyboardMode(false)}
              >
                Mouse
              </Button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadFixture(useLargeFixture)}
            >
              Reload Fixture
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={generatePerformanceReport}
            >
              Generate Report
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={clearPerformanceData}
            >
              Clear Data
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-background p-3 rounded-lg">
              <div className="text-text-secondary">Items</div>
              <div className="font-semibold text-text-primary">{items.length}</div>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="text-text-secondary">People</div>
              <div className="font-semibold text-text-primary">{people.length}</div>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="text-text-secondary">Selected</div>
              <div className="font-semibold text-text-primary" data-testid="selected-count">{selectedItems.length}</div>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <div className="text-text-secondary">Total Value</div>
              <div className="font-semibold text-text-primary">${billTotals.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        <ProfilerWrapper id="main-assign-screen">
          {useKeyboardMode ? (
            <KeyboardFlow
              items={items.map(item => flowItemToItem(item, 'bill-id'))}
              people={people}
              personTotals={personTotals}
              billTotals={billTotals}
              selectedItems={selectedItems}
              onToggleItemSelection={handleToggleItemSelection}
              onClearSelection={handleClearSelection}
              onAssignItem={handleAssignItem}
              onUnassignItem={handleUnassignItem}
              onPersonClick={handlePersonClick}
              onPersonTotalClick={handlePersonTotalClick}
              getItemAssignments={getItemAssignments}
            />
          ) : (
            <BillyAssignScreen onNext={() => {}} onBack={() => {}} />
          )}
        </ProfilerWrapper>
      </div>

      {/* Performance Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-text-primary">Performance Report</h3>
              </div>
              <div className="p-6 overflow-auto max-h-[60vh]">
                <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                  {performanceReport}
                </pre>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowReport(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(performanceReport)
                    alert('Report copied to clipboard!')
                  }}
                >
                  Copy Report
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
