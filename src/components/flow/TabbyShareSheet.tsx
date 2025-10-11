/**
 * iOS-Inspired Tabby Share Sheet
 * Migrated to use new design system components
 */

import React from 'react'
import { useFlowStore } from '@/lib/flowStore'
import { Button, Card, Container, Stack, Spacer } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

interface TabbyShareSheetProps {
  onNext?: () => void
  onPrev?: () => void
  isOpen?: boolean
  onClose?: () => void
  onDone?: () => void
  selectedItems?: string[]
  onAssignSelected?: (selectedItems: string[], personId?: string) => void
}

interface ReceiptLineItemProps {
  name: string
  price: number
  className?: string
}

const ReceiptLineItem: React.FC<ReceiptLineItemProps> = ({ name, price, className = '' }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: designTokens.spacing[4],
      padding: `${designTokens.spacing[2]} 0`,
      ...(className && { fontWeight: designTokens.typography.fontWeight.bold }),
    }}>
      <span style={{
        flex: 1,
        color: designTokens.semantic.text.primary,
        fontFamily: designTokens.typography.fontFamily.mono,
      }}>
        {name}
      </span>
      <div style={{
        flex: 1,
        borderBottom: `1px solid ${designTokens.semantic.border.default}`,
        margin: `0 ${designTokens.spacing[2]}`,
        minWidth: '20px',
      }} />
      <span style={{
        fontFamily: designTokens.typography.fontFamily.mono,
        color: designTokens.semantic.text.primary,
        fontWeight: designTokens.typography.fontWeight.medium,
      }}>
        ${price.toFixed(2)}
      </span>
    </div>
  )
}

interface TotalLineProps {
  label: string
  amount: number
  isGrandTotal?: boolean
}

const TotalLine: React.FC<TotalLineProps> = ({ label, amount, isGrandTotal = false }) => {
  const styles: React.CSSProperties = isGrandTotal
    ? {
        fontWeight: designTokens.typography.fontWeight.bold,
        fontSize: designTokens.typography.fontSize.lg,
        color: designTokens.semantic.text.primary,
        borderTop: `2px solid ${designTokens.semantic.border.default}`,
        paddingTop: designTokens.spacing[3],
        marginTop: designTokens.spacing[2],
      }
    : {
        color: designTokens.semantic.text.secondary,
        fontSize: designTokens.typography.fontSize.sm,
      }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${designTokens.spacing[1]} 0`,
      ...styles,
    }}>
      <span>{label}</span>
      <span style={{
        fontFamily: designTokens.typography.fontFamily.mono,
        fontWeight: designTokens.typography.fontWeight.medium,
      }}>
        ${amount.toFixed(2)}
      </span>
    </div>
  )
}

export const TabbyShareSheet: React.FC<TabbyShareSheetProps> = ({ onNext, onPrev }) => {
  const { items, people, getItemAssignments, getTotalForPerson } = useFlowStore()
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const taxRate = 0.08875 // NY tax rate as example
  const tipRate = 0.18 // 18% tip as example
  const tax = subtotal * taxRate
  const tip = subtotal * tipRate
  const total = subtotal + tax + tip

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: designTokens.semantic.background.primary,
      padding: designTokens.spacing[4],
    }}>
      <Container size="lg">
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: designTokens.spacing[8],
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: designTokens.spacing[4],
          }}>
            🧾
          </div>
          <h2 style={{
            fontSize: designTokens.typography.fontSize['3xl'],
            fontWeight: designTokens.typography.fontWeight.bold,
            color: designTokens.semantic.text.primary,
            margin: 0,
            marginBottom: designTokens.spacing[2],
          }}>
            Receipt Ready
          </h2>
          <p style={{
            color: designTokens.semantic.text.secondary,
          }}>
            Review your bill split and share the receipt
          </p>
        </div>

        {/* Receipt Card */}
        <div style={{ marginBottom: designTokens.spacing[8] }}>
          <Card
            variant="elevated"
            padding="lg"
            style={{
              fontFamily: designTokens.typography.fontFamily.mono,
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            {/* Receipt Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: designTokens.spacing[8],
              paddingBottom: designTokens.spacing[6],
              borderBottom: `2px solid ${designTokens.semantic.border.default}`,
            }}>
              <h3 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                TABBY RECEIPT
              </h3>
              <p style={{
                color: designTokens.semantic.text.secondary,
                fontSize: designTokens.typography.fontSize.sm,
              }}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })} • {new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Items Section */}
            <div style={{ marginBottom: designTokens.spacing[8] }}>
              <h4 style={{
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[4],
                textAlign: 'center',
                fontSize: designTokens.typography.fontSize.sm,
                letterSpacing: designTokens.typography.letterSpacing.wide,
              }}>
                ═══ ITEMS ═══
              </h4>
              <Stack direction="vertical" spacing={1}>
                {items.map((item) => {
                  const assignments = getItemAssignments(item.id)
                  const assigneeNames = assignments
                    .map(personId => people.find(p => p.id === personId)?.name)
                    .filter(Boolean)
                    .join(', ')
                  
                  return (
                    <div key={item.id}>
                      <ReceiptLineItem
                        name={`${item.emoji} ${item.label}`}
                        price={item.price}
                      />
                      {assigneeNames && (
                        <div style={{
                          fontSize: designTokens.typography.fontSize.xs,
                          color: designTokens.semantic.text.secondary,
                          marginLeft: designTokens.spacing[4],
                          fontStyle: 'italic',
                        }}>
                          → {assigneeNames}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Stack>
            </div>

            {/* People Section */}
            <div style={{
              marginBottom: designTokens.spacing[8],
              borderTop: `1px dashed ${designTokens.semantic.border.default}`,
              paddingTop: designTokens.spacing[6],
            }}>
              <h4 style={{
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[4],
                textAlign: 'center',
                fontSize: designTokens.typography.fontSize.sm,
                letterSpacing: designTokens.typography.letterSpacing.wide,
              }}>
                ═══ SPLIT BY PERSON ═══
              </h4>
              <Stack direction="vertical" spacing={3}>
                {people.map((person) => {
                  const personTotal = getTotalForPerson(person.id)
                  const personTax = personTotal * (tax / subtotal)
                  const personTip = personTotal * (tip / subtotal)
                  const personGrandTotal = personTotal + personTax + personTip
                  
                  return (
                    <div key={person.id} style={{
                      backgroundColor: designTokens.semantic.background.secondary,
                      padding: designTokens.spacing[3],
                      borderRadius: designTokens.borderRadius.xl,
                      border: `1px solid ${designTokens.semantic.border.subtle}`,
                    }}>
                      <ReceiptLineItem
                        name={`${person.name.charAt(0).toUpperCase()}. ${person.name}`}
                        price={personGrandTotal}
                        className="font-bold"
                      />
                      {person.venmo_handle && (
                        <div style={{
                          fontSize: designTokens.typography.fontSize.xs,
                          color: designTokens.semantic.text.secondary,
                          marginTop: designTokens.spacing[1],
                          textAlign: 'center',
                        }}>
                          💳 Venmo: @{person.venmo_handle}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Stack>
            </div>

            {/* Totals Section */}
            <div style={{
              borderTop: `2px solid ${designTokens.semantic.border.default}`,
              paddingTop: designTokens.spacing[4],
            }}>
              <Stack direction="vertical" spacing={2}>
                <TotalLine label="SUBTOTAL" amount={subtotal} />
                <TotalLine label="TAX (8.875%)" amount={tax} />
                <TotalLine label="TIP (18%)" amount={tip} />
                <TotalLine label="TOTAL" amount={total} isGrandTotal />
              </Stack>
            </div>

            {/* Receipt Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: designTokens.spacing[8],
              paddingTop: designTokens.spacing[6],
              borderTop: `1px dashed ${designTokens.semantic.border.default}`,
            }}>
              <p style={{
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.tertiary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
                letterSpacing: designTokens.typography.letterSpacing.wide,
              }}>
                ═══════════════════════
              </p>
              <p style={{
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.secondary,
                margin: 0,
                marginBottom: designTokens.spacing[1],
              }}>
                SPLIT WITH TABBY
              </p>
              <p style={{
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.tertiary,
                margin: 0,
              }}>
                tabby.app • Thank you!
              </p>
              <p style={{
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.tertiary,
                margin: 0,
                marginTop: designTokens.spacing[2],
                letterSpacing: designTokens.typography.letterSpacing.wide,
              }}>
                ═══════════════════════
              </p>
            </div>
          </Card>
        </div>

        {/* Share Actions */}
        <div style={{ marginBottom: designTokens.spacing[8] }}>
          <Card variant="elevated" padding="lg">
            <div style={{
              textAlign: 'center',
              marginBottom: designTokens.spacing[6],
            }}>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Share Receipt
              </h3>
              <p style={{
                color: designTokens.semantic.text.secondary,
                fontSize: designTokens.typography.fontSize.sm,
              }}>
                Send this receipt to everyone or individual payment requests
              </p>
            </div>
            
            <Stack direction="vertical" spacing={3}>
              <Button
                variant="primary"
                fullWidth
                style={{
                  padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
                  borderRadius: designTokens.borderRadius['2xl'],
                }}
              >
                <Stack direction="horizontal" align="center" spacing={3}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Share Receipt
                </Stack>
              </Button>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: designTokens.spacing[3],
              }}>
                <Button
                  variant="secondary"
                  style={{
                    padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
                    borderRadius: designTokens.borderRadius.xl,
                  }}
                >
                  <Stack direction="horizontal" align="center" spacing={2}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Send Requests
                  </Stack>
                </Button>

                <Button
                  variant="secondary"
                  style={{
                    padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
                    borderRadius: designTokens.borderRadius.xl,
                  }}
                >
                  <Stack direction="horizontal" align="center" spacing={2}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Link
                  </Stack>
                </Button>
              </div>
            </Stack>
          </Card>
        </div>

        {/* Navigation */}
        <Stack direction="horizontal" spacing={4} style={{ marginBottom: designTokens.spacing[8] }}>
          <Button
            variant="secondary"
            onClick={onPrev}
            style={{
              padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
              borderRadius: designTokens.borderRadius['2xl'],
            }}
          >
            <Stack direction="horizontal" align="center" spacing={2}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Back
            </Stack>
          </Button>

          <Button
            variant="primary"
            onClick={onNext}
            style={{
              flex: 1,
              padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
              borderRadius: designTokens.borderRadius['2xl'],
              backgroundColor: designTokens.semantic.status.success,
            }}
          >
            <Stack direction="horizontal" align="center" spacing={3}>
              Finish & Share
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Stack>
          </Button>
        </Stack>
      </Container>
    </div>
  )
}
