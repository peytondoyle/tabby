/**
 * Visual Test Suite for Dark Theme Components
 * Renders all critical atoms/molecules with Billy dark tokens for quick theme drift detection
 */

import React, { useState } from 'react'
import { Button, Card, ItemPill, Modal, Avatar, Badge } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

export const VisualTestSuite: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPill, setSelectedPill] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background text-text-primary p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Dark Theme Visual Test Suite</h1>
        
        {/* Person Cards */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Person Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-3">
                <Avatar size="md" name="John Doe" />
                <div>
                  <h3 className="font-semibold text-text-primary">John Doe</h3>
                  <p className="text-sm text-text-secondary">$24.50</p>
                </div>
              </div>
            </Card>
            
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-3">
                <Avatar size="md" name="Jane Smith" />
                <div>
                  <h3 className="font-semibold text-text-primary">Jane Smith</h3>
                  <p className="text-sm text-text-secondary">$18.75</p>
                </div>
              </div>
            </Card>
            
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                <Avatar size="md" name="Bob Wilson" />
                <div>
                  <h3 className="font-semibold text-text-primary">Bob Wilson</h3>
                  <p className="text-sm text-text-secondary">$31.20</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Item Pills */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Item Pills</h2>
          <div className="flex flex-wrap gap-3">
            <ItemPill
              name="Burger"
              price={12.99}
              selected={selectedPill === 'burger'}
              onClick={() => setSelectedPill(selectedPill === 'burger' ? null : 'burger')}
            />
            <ItemPill
              name="Fries"
              price={4.99}
              isMine={true}
              selected={selectedPill === 'fries'}
              onClick={() => setSelectedPill(selectedPill === 'fries' ? null : 'fries')}
            />
            <ItemPill
              name="Drink"
              price={2.99}
              assigned={true}
              selected={selectedPill === 'drink'}
              onClick={() => setSelectedPill(selectedPill === 'drink' ? null : 'drink')}
            />
            <ItemPill
              name="Salad"
              price={8.99}
              selected={selectedPill === 'salad'}
              onClick={() => setSelectedPill(selectedPill === 'salad' ? null : 'salad')}
            />
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="lg">
              Primary Button
            </Button>
            <Button variant="secondary" size="lg">
              Secondary Button
            </Button>
            <Button variant="ghost" size="lg">
              Ghost Button
            </Button>
            <Button variant="primary" size="md" loading>
              Loading Button
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Disabled Button
            </Button>
          </div>
        </section>

        {/* Receipt Card */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Receipt Card</h2>
          <div className="flex justify-center">
            <Card variant="default" padding="lg" className="max-w-md">
              <div className="text-center">
                <h3 className="text-lg font-bold text-text-primary mb-2">Sample Receipt</h3>
                <p className="text-sm text-text-secondary mb-4">Restaurant Name • Dec 15, 2024</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Burger</span>
                    <span className="font-mono">$12.99</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Fries</span>
                    <span className="font-mono">$4.99</span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-mono">$17.98</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Modal Test */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Modal</h2>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </section>

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Test Modal"
        >
          <div className="space-y-4">
            <p className="text-text-secondary">
              This is a test modal to verify dark theme styling.
            </p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
