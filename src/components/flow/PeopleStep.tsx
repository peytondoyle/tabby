import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore, type FlowPerson } from '@/lib/flowStore'
import { Button, Card, Modal } from '@/components/design-system'
import { IconButton } from '@/components/design-system'
import { testIds } from '@/lib/testIds'

interface PeopleStepProps {
  onNext: () => void
  onPrev: () => void
  isAnalyzing?: boolean
  analysisComplete?: boolean
}

export const PeopleStep: React.FC<PeopleStepProps> = ({ onNext, onPrev, isAnalyzing = false, analysisComplete = false }) => {
  const { people, addPerson, removePerson } = useFlowStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonVenmo, setNewPersonVenmo] = useState('')

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: FlowPerson = {
        id: `person-${Date.now()}`,
        name: newPersonName.trim(),
        venmo_handle: newPersonVenmo.trim() || undefined
      }

      addPerson(newPerson)
      setNewPersonName('')
      setNewPersonVenmo('')
      setShowAddModal(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPerson()
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setNewPersonName('')
    setNewPersonVenmo('')
  }

  const canProceed = people.length >= 1 && analysisComplete

  return (
    <div className="w-full" data-testid={testIds.stepPeopleRoot}>
      {/* Analysis Progress Banner */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-[var(--ui-primary-muted)] border-[var(--ui-primary)] p-4">
            <div className="flex items-center gap-4">
              <div className="animate-spin w-8 h-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-full"></div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--ui-text)]">Analyzing receipt...</h3>
                <p className="text-sm text-[var(--ui-text-dim)]">Processing items and creating emojis</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Analysis Complete Banner */}
      {!isAnalyzing && analysisComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className="bg-green-500/10 border-green-500/50 p-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">✅</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Receipt analyzed!</h3>
                <p className="text-sm text-[var(--ui-text-dim)]">Ready to assign items</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-2xl font-bold text-[var(--ui-text)] mb-2">Who's splitting the bill?</h2>
        <p className="text-[var(--ui-text-dim)]">
          Add the people you want to split the bill with
        </p>
      </motion.div>

      {/* People List or Empty State */}
      <motion.div 
        className="space-y-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {people.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">👋</div>
            <h3 className="text-lg font-semibold text-[var(--ui-text)] mb-2">Add People First</h3>
            <p className="text-[var(--ui-text-dim)] mb-6">
              Start by adding the people who will split this bill
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              Add People
            </Button>
          </Card>
        ) : (
          people.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--ui-primary)] text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ui-text)]">{person.name}</div>
                      {person.venmo_handle && (
                        <div className="text-sm text-[var(--ui-text-dim)]">@{person.venmo_handle}</div>
                      )}
                    </div>
                  </div>
                  
                  <IconButton
                    size="sm"
                    tone="danger"
                    onClick={() => removePerson(person.id)}
                    aria-label={`Remove ${person.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </IconButton>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Add More People Button (only show when people exist) */}
      {people.length > 0 && (
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => setShowAddModal(true)}
            full
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            }
          >
            Add Another Person
          </Button>
        </div>
      )}

      {/* Add People Modal */}
      <Modal
        open={showAddModal}
        onClose={handleCloseModal}
        title="Add Person"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPerson}
              disabled={!newPersonName.trim()}
            >
              Add Person
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--ui-text)] mb-2">
              Name *
            </label>
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter name"
              className="w-full p-3 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-md)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-dim)] focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ui-text)] mb-2">
              Venmo Handle (Optional)
            </label>
            <input
              type="text"
              value={newPersonVenmo}
              onChange={(e) => setNewPersonVenmo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="username"
              className="w-full p-3 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-md)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-dim)] focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
            />
          </div>
        </div>
      </Modal>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button
          variant="secondary"
          onClick={onPrev}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          }
        >
          Back
        </Button>

        <Button
          onClick={onNext}
          disabled={!canProceed || isAnalyzing}
          full
          rightIcon={
            !isAnalyzing && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )
          }
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Analyzing...
            </span>
          ) : !analysisComplete ? (
            'Waiting for analysis...'
          ) : people.length === 0 ? (
            'Add at least 1 person'
          ) : (
            'Assign Items'
          )}
        </Button>
      </div>
    </div>
  )
}