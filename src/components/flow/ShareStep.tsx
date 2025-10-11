import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { logServer } from '@/lib/errorLogger'
import { PersonCard, GroupCard } from '@/components/ShareCards'
import { exportReceiptCard, exportGroupReceipt } from '@/lib/exportUtils'
import { testIds } from '@/lib/testIds'
import StepErrorBoundary from '@/components/StepErrorBoundary'
import { Button } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

interface ShareStepProps {
  onPrev: () => void
  onBack: () => void
}

export const ShareStep: React.FC<ShareStepProps> = ({ onPrev, onBack }) => {
  const {
    people,
    items,
    bill,
    computeBillTotals,
    getPersonItems: _getPersonItems,
    getItemAssignments
  } = useFlowStore()

  const groupCardRef = useRef<HTMLDivElement>(null)
  const personCardsRef = useRef<{ [personId: string]: HTMLDivElement | null }>({})

  const [isGroupSharing, setIsGroupSharing] = useState(false)
  const [isIndividualSharing, setIsIndividualSharing] = useState(false)

  const { personTotals, billTotal } = computeBillTotals()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getPersonItemsForExport = (personId: string) => {
    return items.filter(item => {
      const assignments = getItemAssignments(item.id)
      return assignments.includes(personId)
    })
  }

  const handleGroupShare = async () => {
    if (groupCardRef.current) {
      setIsGroupSharing(true)
      try {
        await exportGroupReceipt(
          groupCardRef.current,
          bill?.title || 'Group Receipt',
          'png'
        )
      } catch (error) {
        console.error('Export failed:', error)
        logServer('error', 'Group export failed', { error, context: 'ShareStep.handleGroupShare' })
        alert('Export failed. Please try again.')
      } finally {
        setIsGroupSharing(false)
      }
    }
  }

  const handleIndividualShare = async () => {
    setIsIndividualSharing(true)
    try {
      // Export all person cards
      for (const person of people) {
        const cardElement = personCardsRef.current[person.id]
        if (cardElement) {
          try {
            await exportReceiptCard(
              cardElement,
              person.name,
              bill?.title || 'Receipt'
            )
          } catch (error) {
            console.error(`Export failed for ${person.name}:`, error)
            logServer('error', 'Individual export failed', { error, personName: person.name, context: 'ShareStep.handleIndividualShare' })
          }
        }
      }
    } finally {
      setIsIndividualSharing(false)
    }
  }

  const Spinner: React.FC = () => (
    <span style={{ display: 'inline-flex', width: 20, height: 20 }}>
      <span
        className="animate-spin"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '9999px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
        }}
      />
    </span>
  )

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: designTokens.semantic.background.secondary,
    display: 'flex',
  }

  const contentStyle: React.CSSProperties = {
    width: '100%',
  }

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: designTokens.spacing[6],
  }

  const shareCardStyle: React.CSSProperties = {
    maxWidth: '420px',
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: '24px',
    boxShadow: '0 18px 36px rgba(0,0,0,0.32)',
    padding: '24px',
    marginBottom: designTokens.spacing[5],
  }

  const personListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: designTokens.spacing[3],
  }

  const personRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designTokens.spacing[3],
    borderBottom: '1px solid #EDEDED',
  }

  const avatarStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: designTokens.borderRadius.full,
    display: 'grid',
    placeItems: 'center',
    fontWeight: designTokens.typography.fontWeight.bold,
    fontSize: designTokens.typography.fontSize.lg,
    backgroundColor: designTokens.colors.blue[100],
    color: designTokens.colors.blue[700],
  }

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: designTokens.spacing[3],
    alignItems: 'center',
    marginBottom: designTokens.spacing[6],
  }

  return (
    <StepErrorBoundary stepName="Share Step">
      <div style={containerStyle}>
        <div style={contentStyle} data-testid={testIds.stepShareRoot}>
          <motion.div
            style={headerStyle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ fontSize: '3rem', marginBottom: designTokens.spacing[2] }}>🎉</div>
            <h1 style={{
              margin: 0,
              color: designTokens.semantic.text.primary,
              fontSize: designTokens.typography.fontSize['3xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
            }}>
              Share Bill
            </h1>
            <p style={{
              margin: 0,
              color: designTokens.semantic.text.secondary,
              fontSize: designTokens.typography.fontSize.lg,
            }}>
              Export polished receipt cards to share with friends
            </p>
          </motion.div>

          <motion.div
            style={shareCardStyle}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ textAlign: 'center', marginBottom: designTokens.spacing[4] }}>
              <p style={{
                margin: 0,
                color: '#666666',
                fontSize: designTokens.typography.fontSize.sm,
                letterSpacing: designTokens.typography.letterSpacing.wide,
                fontFamily: designTokens.typography.fontFamily.mono,
              }}>
                {bill?.place || 'Ready to share'}
              </p>
              <h2 style={{
                margin: 0,
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                color: '#000000',
                fontFamily: designTokens.typography.fontFamily.mono,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}>
                {bill?.title || 'Tabby Receipt'}
              </h2>
              <p style={{
                marginTop: designTokens.spacing[1],
                color: '#666666',
                fontFamily: designTokens.typography.fontFamily.mono,
              }}>
                Split between {people.length} {people.length === 1 ? 'person' : 'people'}
              </p>
              <div style={{
                marginTop: designTokens.spacing[4],
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                fontFamily: designTokens.typography.fontFamily.mono,
                color: '#000000',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPrice(billTotal)}
              </div>
            </div>

            <div style={personListStyle}>
              {personTotals.map((personTotal) => {
                const person = people.find(p => p.id === personTotal.personId)
                if (!person) return null

                return (
                  <div key={person.id} style={personRowStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[3] }}>
                      <div style={avatarStyle}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{
                          color: '#000000',
                          fontWeight: designTokens.typography.fontWeight.semibold,
                          fontFamily: designTokens.typography.fontFamily.mono,
                        }}>
                          {person.name}
                        </div>
                        <div style={{
                          color: '#666666',
                          fontSize: designTokens.typography.fontSize.sm,
                          fontFamily: designTokens.typography.fontFamily.mono,
                        }}>
                          {getPersonItemsForExport(personTotal.personId).length} items
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: designTokens.typography.fontFamily.mono,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: '#000000',
                      fontSize: designTokens.typography.fontSize.lg,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatPrice(personTotal.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div
            style={actionsStyle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handleGroupShare}
              loading={isGroupSharing}
              data-testid={testIds.groupShareButton}
              style={{ 
                height: '56px',
                padding: `0 ${designTokens.spacing[8]}`,
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                fontFamily: designTokens.typography.fontFamily.mono,
                letterSpacing: designTokens.typography.letterSpacing.wide
              }}
            >
              {isGroupSharing ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: designTokens.spacing[2] }}>
                  <Spinner />
                  Preparing receipt...
                </span>
              ) : (
                'Share Receipt'
              )}
            </Button>
          </motion.div>

          {/* Hidden Cards for Export */}
          <div className="sr-only">
        {/* Group Card */}
        <div ref={groupCardRef}>
          <GroupCard
            groups={personTotals.map(personTotal => {
              const person = people.find(p => p.id === personTotal.personId)!
              const personItems = getPersonItemsForExport(personTotal.personId)
              return {
                person,
                items: personItems,
                subtotal: personTotal.subtotal,
                taxShare: personTotal.taxShare,
                tipShare: personTotal.tipShare,
                total: personTotal.total
              }
            })}
            billTitle={bill?.title}
            billPlace={bill?.place}
            billDate={bill?.date}
            totalAmount={billTotal}
          />
        </div>

        {/* Individual Person Cards */}
        {personTotals.map((personTotal) => {
          const person = people.find(p => p.id === personTotal.personId)!
          const personItems = getPersonItemsForExport(personTotal.personId)
          
          return (
            <div 
              key={person.id} 
              ref={(el: HTMLDivElement | null) => { personCardsRef.current[person.id] = el }}
            >
              <PersonCard
                name={person.name}
                items={personItems}
                subtotal={personTotal.subtotal}
                taxShare={personTotal.taxShare}
                tipShare={personTotal.tipShare}
                total={personTotal.total}
                billTitle={bill?.title}
                billPlace={bill?.place}
                billDate={bill?.date}
              />
            </div>
          )
        })}
      </div>

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onPrev}
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-xl font-medium transition-colors flex items-center gap-2 border border-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              ✅ Done
            </button>
          </div>
        </div>
      </div>
    </StepErrorBoundary>
  )
}
