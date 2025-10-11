/**
 * iOS Design System Showcase
 * Clean, minimal demonstration of our new design system components
 */

import React, { useState } from 'react'
import { Button, Card, Badge, Avatar, Modal, Input, Stack, Container, Spacer } from '../components/design-system'
import { designTokens } from '../lib/styled'

const UISandbox: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: designTokens.semantic.background.primary,
      padding: designTokens.spacing[4],
    }}>
      <Container size="lg">
        <Stack direction="vertical" spacing={8}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: designTokens.typography.fontSize['4xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.semantic.text.primary,
              margin: 0,
              marginBottom: designTokens.spacing[2],
            }}>
              iOS Design System
            </h1>
            <p style={{
              fontSize: designTokens.typography.fontSize.lg,
              color: designTokens.semantic.text.secondary,
              margin: 0,
            }}>
              Clean, minimal, and gorgeous design with subtle interactions
            </p>
          </div>

          {/* Buttons Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Buttons
              </h2>
              
              <div>
                <h3 style={{
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[3],
                }}>
                  Variants
                </h3>
                <Stack direction="horizontal" spacing={3} wrap>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                </Stack>
              </div>

              <div>
                <h3 style={{
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[3],
                }}>
                  Sizes
                </h3>
                <Stack direction="horizontal" spacing={3} align="center">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </Stack>
              </div>

              <div>
                <h3 style={{
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[3],
                }}>
                  States
                </h3>
                <Stack direction="horizontal" spacing={3}>
                  <Button variant="primary">Normal</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </Stack>
              </div>
            </Stack>
          </Card>

          {/* Cards Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Cards
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: designTokens.spacing[4],
              }}>
                <Card variant="default" padding="md">
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[2],
                  }}>
                    Default Card
                  </h3>
                  <p style={{
                    color: designTokens.semantic.text.secondary,
                    margin: 0,
                  }}>
                    Clean white background with subtle shadows and rounded corners.
                  </p>
                </Card>

                <Card variant="elevated" padding="md">
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[2],
                  }}>
                    Elevated Card
                  </h3>
                  <p style={{
                    color: designTokens.semantic.text.secondary,
                    margin: 0,
                  }}>
                    Enhanced shadow for more prominent content sections.
                  </p>
                </Card>

                <Card variant="glass" padding="md">
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[2],
                  }}>
                    Glass Card
                  </h3>
                  <p style={{
                    color: designTokens.semantic.text.secondary,
                    margin: 0,
                  }}>
                    Glass effect with backdrop blur for modern aesthetics.
                  </p>
                </Card>
              </div>
            </Stack>
          </Card>

          {/* Form Elements Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Form Elements
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: designTokens.spacing[4],
              }}>
                <div>
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[3],
                  }}>
                    Input Fields
                  </h3>
                  <Stack direction="vertical" spacing={3}>
                    <Input
                      placeholder="Enter your name"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <Input
                      variant="filled"
                      placeholder="Filled variant"
                    />
                    <Input
                      error
                      placeholder="Error state"
                    />
                  </Stack>
                </div>

                <div>
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[3],
                  }}>
                    Avatars
                  </h3>
                  <Stack direction="horizontal" spacing={3} align="center">
                    <Avatar size="sm" fallback="A" />
                    <Avatar size="md" fallback="B" />
                    <Avatar size="lg" fallback="C" />
                    <Avatar size="xl" fallback="D" />
                  </Stack>
                </div>
              </div>
            </Stack>
          </Card>

          {/* Badges Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Badges
              </h2>
              
              <div>
                <h3 style={{
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[3],
                }}>
                  Variants
                </h3>
                <Stack direction="horizontal" spacing={3} wrap>
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                </Stack>
              </div>

              <div>
                <h3 style={{
                  fontSize: designTokens.typography.fontSize.lg,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[3],
                }}>
                  Sizes
                </h3>
                <Stack direction="horizontal" spacing={3} align="center">
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                </Stack>
              </div>
            </Stack>
          </Card>

          {/* Modal Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Modal
              </h2>
              
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>

              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="iOS-Style Modal"
              >
                <Stack direction="vertical" spacing={4}>
                  <p style={{
                    color: designTokens.semantic.text.secondary,
                    margin: 0,
                  }}>
                    This modal slides up from the bottom with a subtle spring animation, 
                    just like iOS native modals.
                  </p>
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Close
                  </Button>
                </Stack>
              </Modal>
            </Stack>
          </Card>

          {/* Design Tokens Section */}
          <Card variant="elevated" padding="lg">
            <Stack direction="vertical" spacing={6}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                Design Tokens
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: designTokens.spacing[4],
              }}>
                <div>
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[3],
                  }}>
                    Colors
                  </h3>
                  <Stack direction="vertical" spacing={2}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: designTokens.spacing[2],
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: designTokens.semantic.interactive.primary,
                        borderRadius: designTokens.borderRadius.sm,
                      }} />
                      <span style={{ fontSize: designTokens.typography.fontSize.sm }}>
                        Primary Blue
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: designTokens.spacing[2],
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: designTokens.semantic.text.primary,
                        borderRadius: designTokens.borderRadius.sm,
                      }} />
                      <span style={{ fontSize: designTokens.typography.fontSize.sm }}>
                        Text Primary
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: designTokens.spacing[2],
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: designTokens.semantic.text.secondary,
                        borderRadius: designTokens.borderRadius.sm,
                      }} />
                      <span style={{ fontSize: designTokens.typography.fontSize.sm }}>
                        Text Secondary
                      </span>
                    </div>
                  </Stack>
                </div>

                <div>
                  <h3 style={{
                    fontSize: designTokens.typography.fontSize.lg,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    color: designTokens.semantic.text.primary,
                    margin: 0,
                    marginBottom: designTokens.spacing[3],
                  }}>
                    Spacing
                  </h3>
                  <Stack direction="vertical" spacing={2}>
                    {[1, 2, 3, 4, 6, 8].map((size) => (
                      <div key={size} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: designTokens.spacing[2],
                      }}>
                        <div style={{
                          width: designTokens.spacing[size],
                          height: '4px',
                          backgroundColor: designTokens.semantic.interactive.primary,
                          borderRadius: designTokens.borderRadius.sm,
                        }} />
                        <span style={{ fontSize: designTokens.typography.fontSize.sm }}>
                          {designTokens.spacing[size]}
                        </span>
                      </div>
                    ))}
                  </Stack>
                </div>
              </div>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </div>
  )
}

export default UISandbox