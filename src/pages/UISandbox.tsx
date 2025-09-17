import React, { useState } from 'react'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ItemPill } from '../components/ui/ItemPill'
import { ItemPillMotion, ItemPillList, itemPillMotionClasses } from '../components/ui/ItemPillMotion'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonList, 
  SkeletonButton, 
  SkeletonPill, 
  SkeletonTable 
} from '../components/ui/Skeleton'
import { duration, spring } from '../lib/motion'

export const UISandbox: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [scrollModalOpen, setScrollModalOpen] = useState(false)
  const [selectedPills, setSelectedPills] = useState<string[]>(['2'])
  const [motionPills, setMotionPills] = useState<string[]>(['motion-1', 'motion-2'])
  const [motionVariant, setMotionVariant] = useState<'slide' | 'scale' | 'fade' | 'bounce'>('scale')

  const togglePill = (id: string) => {
    setSelectedPills(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    )
  }

  const toggleMotionPill = (id: string) => {
    setMotionPills(prev => prev.filter(p => p !== id))
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <header>
          <h1 className="text-3xl font-bold text-[var(--ui-text)] mb-4">
            UI Component Sandbox
          </h1>
          <p className="text-[var(--ui-text-dim)]">
            Interactive showcase of all component states and variants
          </p>
        </header>

        {/* Button Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Button</h2>
          
          {/* Variants */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Sizes</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          {/* States */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">States</h3>
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button full>Full Width</Button>
            </div>
          </div>

          {/* With Icons */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">With Icons</h3>
            <div className="flex flex-wrap gap-4">
              <Button 
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                }
              >
                Add Item
              </Button>
              <Button 
                variant="secondary"
                rightIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                }
              >
                External Link
              </Button>
              <Button 
                variant="destructive"
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </section>

        {/* IconButton Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">IconButton</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Tones & Sizes</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2">
                <IconButton tone="neutral" size="sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </IconButton>
                <IconButton tone="neutral" size="md">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </IconButton>
              </div>
              <div className="flex gap-2">
                <IconButton tone="danger" size="sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                </IconButton>
                <IconButton tone="danger" size="md">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                </IconButton>
              </div>
              <IconButton disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </IconButton>
            </div>
          </div>
        </section>

        {/* Card Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Card</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <h3 className="font-semibold text-[var(--ui-text)] mb-2">Basic Card</h3>
              <p className="text-[var(--ui-text-dim)] mb-4">
                A simple card with some content and actions.
              </p>
              <div className="flex gap-2">
                <Button size="sm">Action</Button>
                <Button variant="ghost" size="sm">Cancel</Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-[var(--ui-text)]">Card with Icon</h3>
                <IconButton size="sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </IconButton>
              </div>
              <p className="text-[var(--ui-text-dim)]">
                Cards can contain any content and components.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[var(--ui-text)] mb-2">Interactive Card</h3>
              <p className="text-[var(--ui-text-dim)] mb-4">
                Cards can be interactive and clickable.
              </p>
              <div className="text-sm text-[var(--ui-primary)]">
                ← Hover to see elevation change
              </div>
            </Card>
          </div>
        </section>

        {/* ItemPill Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">ItemPill</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Interactive States</h3>
            <div className="flex flex-wrap gap-3">
              <ItemPill
                id="1"
                name="Pizza Margherita"
                price={14.99}
                icon="🍕"
                selected={selectedPills.includes('1')}
                onClick={togglePill}
              />
              <ItemPill
                id="2"
                name="Caesar Salad"
                price={12.50}
                icon="🥗"
                selected={selectedPills.includes('2')}
                onClick={togglePill}
              />
              <ItemPill
                id="3"
                name="Assigned Item"
                price={8.99}
                icon="☕"
                assigned
                onClick={togglePill}
              />
              <ItemPill
                id="4"
                name="Burger Deluxe"
                price={16.75}
                icon="🍔"
                selected={selectedPills.includes('4')}
                onClick={togglePill}
              />
            </div>
            <p className="text-sm text-[var(--ui-text-dim)] mt-2">
              Click pills to select/deselect. Note the assigned state is non-interactive.
            </p>
          </div>
        </section>

        {/* Motion Variants Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">ItemPill Motion Variants</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Motion Controls</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {(['scale', 'slide', 'fade', 'bounce'] as const).map((variant) => (
                <Button
                  key={variant}
                  variant={motionVariant === variant ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setMotionVariant(variant)}
                >
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  const newId = `motion-${Date.now()}`;
                  setMotionPills(prev => [...prev, newId]);
                }}
              >
                Add Pill
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMotionPills(prev => prev.slice(0, -1));
                }}
                disabled={motionPills.length === 0}
              >
                Remove Pill
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Framer Motion Variant: {motionVariant}</h3>
            <ItemPillList className="mb-4">
              {motionPills.map((id, index) => (
                <ItemPillMotion
                  key={id}
                  id={id}
                  name={`Motion Item ${index + 1}`}
                  price={9.99 + index * 2}
                  icon="✨"
                  motionVariant={motionVariant}
                  layout
                  onClick={toggleMotionPill}
                />
              ))}
            </ItemPillList>
            <p className="text-sm text-[var(--ui-text-dim)]">
              Click pills to remove them. Try different motion variants and add/remove pills to see animations.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">CSS-Only Motion Classes</h3>
            <Card className="p-6">
              <p className="text-[var(--ui-text-dim)] mb-4">
                For projects not using framer-motion, use these CSS classes:
              </p>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <code className="bg-[var(--ui-panel-2)] px-2 py-1 rounded text-[var(--ui-primary)]">
                    {itemPillMotionClasses.scaleIn}
                  </code>
                  <span className="text-[var(--ui-text-dim)]">Scale in animation</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="bg-[var(--ui-panel-2)] px-2 py-1 rounded text-[var(--ui-primary)]">
                    {itemPillMotionClasses.slideIn}
                  </code>
                  <span className="text-[var(--ui-text-dim)]">Slide in animation</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="bg-[var(--ui-panel-2)] px-2 py-1 rounded text-[var(--ui-primary)]">
                    {itemPillMotionClasses.hover}
                  </code>
                  <span className="text-[var(--ui-text-dim)]">Hover scale effect</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Badge Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Badge</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Variants & Sizes</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <Badge>Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="warning">Warning</Badge>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="sm">99+</Badge>
                <Badge variant="primary" size="md">New</Badge>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ui-text)]">Notifications</span>
                  <Badge variant="danger" dot />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ui-text)]">Status</span>
                  <Badge variant="success" dot />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ui-text)]">Messages</span>
                  <Badge variant="primary">12</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Usage Examples</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-[var(--ui-text)]">Pizza Orders</h4>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-[var(--ui-text-dim)] text-sm mt-1">
                  Currently processing orders
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-[var(--ui-text)]">Notifications</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">5</Badge>
                    <Badge variant="danger" dot />
                  </div>
                </div>
                <p className="text-[var(--ui-text-dim)] text-sm mt-1">
                  Unread messages and alerts
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Avatar Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Avatar</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Sizes</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col items-center gap-2">
                <Avatar name="John Doe" size="sm" />
                <span className="text-sm text-[var(--ui-text-dim)]">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar name="Jane Smith" size="md" />
                <span className="text-sm text-[var(--ui-text-dim)]">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar name="Bob Johnson" size="lg" />
                <span className="text-sm text-[var(--ui-text-dim)]">Large</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Color Variations</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Avatar name="Alice Cooper" />
              <Avatar name="Charlie Brown" />
              <Avatar name="Diana Prince" />
              <Avatar name="Edward Norton" />
              <Avatar name="Fiona Apple" />
              <Avatar name="George Washington" />
              <Avatar name="Helen Keller" />
              <Avatar name="Isaac Newton" />
            </div>
            <p className="text-sm text-[var(--ui-text-dim)] mt-2">
              Colors are automatically generated based on the name for consistency.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Usage Examples</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name="Sarah Wilson" />
                  <div>
                    <h4 className="font-medium text-[var(--ui-text)]">Sarah Wilson</h4>
                    <p className="text-sm text-[var(--ui-text-dim)]">Project Manager</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name="Michael Chen" size="lg" />
                  <div>
                    <h4 className="font-medium text-[var(--ui-text)]">Michael Chen</h4>
                    <p className="text-sm text-[var(--ui-text-dim)]">Senior Developer</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="success" size="sm">Online</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Avatar Groups</h3>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                <Avatar name="User One" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
                <Avatar name="User Two" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
                <Avatar name="User Three" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
                <Avatar name="User Four" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
              </div>
              <span className="ml-3 text-sm text-[var(--ui-text-dim)]">+12 more</span>
            </div>
            <p className="text-sm text-[var(--ui-text-dim)] mt-2">
              Overlapping avatars for showing team members or collaborators.
            </p>
          </div>
        </section>

        {/* Skeleton Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Skeleton (Loading States)</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Basic Skeleton Types</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">Text Lines</h4>
                <SkeletonText lines={3} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">Avatar</h4>
                <div className="flex gap-2">
                  <SkeletonAvatar size="sm" />
                  <SkeletonAvatar size="md" />
                  <SkeletonAvatar size="lg" />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">Buttons</h4>
                <div className="flex gap-2">
                  <SkeletonButton size="sm" />
                  <SkeletonButton size="md" />
                  <SkeletonButton size="lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Custom Skeletons</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">Rectangle</h4>
                <Skeleton variant="rectangle" height="4rem" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">Custom Size</h4>
                <Skeleton width="80%" height="2rem" radius="lg" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--ui-text)]">No Animation</h4>
                <Skeleton height="2rem" animate={false} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Complex Patterns</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">Card Skeleton</h4>
                <SkeletonCard />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">Card without Avatar</h4>
                <SkeletonCard showAvatar={false} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">List Patterns</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">Simple List</h4>
                <SkeletonList items={3} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">List with Avatars</h4>
                <SkeletonList items={3} showAvatar />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Specialized Skeletons</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">Item Pills</h4>
                <div className="flex flex-wrap gap-2">
                  <SkeletonPill />
                  <SkeletonPill />
                  <SkeletonPill />
                  <SkeletonPill />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--ui-text)] mb-3">Table</h4>
                <SkeletonTable rows={4} cols={3} />
              </div>
            </div>
          </div>
        </section>

        {/* Motion Utilities Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Motion Utilities</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Duration Constants</h3>
            <Card className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-[var(--ui-text)] mb-2">Available Durations</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <code className="text-[var(--ui-primary)]">duration.instant</code>
                      <span className="text-[var(--ui-text-dim)]">{duration.instant}s (50ms)</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-[var(--ui-primary)]">duration.fast</code>
                      <span className="text-[var(--ui-text-dim)]">{duration.fast}s (150ms)</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-[var(--ui-primary)]">duration.normal</code>
                      <span className="text-[var(--ui-text-dim)]">{duration.normal}s (250ms)</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-[var(--ui-primary)]">duration.slow</code>
                      <span className="text-[var(--ui-text-dim)]">{duration.slow}s (400ms)</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-[var(--ui-primary)]">duration.slower</code>
                      <span className="text-[var(--ui-text-dim)]">{duration.slower}s (600ms)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[var(--ui-text)] mb-2">Easing Functions</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="text-[var(--ui-primary)]">ease.linear</code> - Linear timing</div>
                    <div><code className="text-[var(--ui-primary)]">ease.out</code> - Standard ease out</div>
                    <div><code className="text-[var(--ui-primary)]">ease.in</code> - Ease in</div>
                    <div><code className="text-[var(--ui-primary)]">ease.inOut</code> - Ease in and out</div>
                    <div><code className="text-[var(--ui-primary)]">ease.bounce</code> - Bounce effect</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Spring Configurations</h3>
            <Card className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(spring).map(([name, config]) => (
                  <div key={name} className="p-3 bg-[var(--ui-panel-2)] rounded-[var(--r-md)]">
                    <h4 className="font-medium text-[var(--ui-text)] mb-2">spring.{name}</h4>
                    <div className="text-sm text-[var(--ui-text-dim)] space-y-1">
                      <div>Stiffness: {config.stiffness}</div>
                      <div>Damping: {config.damping}</div>
                      {'bounce' in config && config.bounce && <div>Bounce: {config.bounce}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[var(--ui-text)] mb-4">Usage Examples</h3>
            <Card className="p-6">
              <h4 className="font-medium text-[var(--ui-text)] mb-3">Import and Use</h4>
              <div className="bg-[var(--ui-panel-2)] p-4 rounded-[var(--r-md)] overflow-x-auto">
                <pre className="text-sm text-[var(--ui-text)]">
{`import { duration, ease, spring } from '@/lib/motion'

// Basic transition
const fadeTransition = {
  duration: duration.fast,
  ease: ease.out
}

// Spring animation
const buttonSpring = {
  type: "spring",
  ...spring.standard
}

// Custom easing
const slideTransition = {
  duration: duration.normal,
  ease: ease.gentle
}`}
                </pre>
              </div>
            </Card>
          </div>
        </section>

        {/* Modal Component */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Modal</h2>
          
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setModalOpen(true)}>
              Open Standard Modal
            </Button>
            <Button variant="destructive" onClick={() => setDangerModalOpen(true)}>
              Open Danger Modal
            </Button>
            <Button variant="secondary" onClick={() => setScrollModalOpen(true)}>
              Open Scrolling Modal
            </Button>
          </div>

          {/* Standard Modal */}
          <Modal 
            open={modalOpen} 
            onClose={() => setModalOpen(false)}
            title="Standard Modal"
            size="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-[var(--ui-text)]">
                This is a standard modal dialog with header, body, and footer sections.
              </p>
              <Card className="p-4">
                <p className="text-[var(--ui-text-dim)]">
                  Cards and other components work perfectly inside modals.
                </p>
              </Card>
              <div className="flex gap-2">
                <ItemPill
                  id="modal-1"
                  name="Modal Item"
                  price={19.99}
                  icon="⭐"
                />
              </div>
            </div>
          </Modal>
          
          {/* Danger Modal */}
          <Modal 
            open={dangerModalOpen} 
            onClose={() => setDangerModalOpen(false)}
            title="Confirm Deletion"
            size="sm"
            danger
            footer={
              <>
                <Button variant="secondary" onClick={() => setDangerModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => setDangerModalOpen(false)}>
                  Delete Forever
                </Button>
              </>
            }
          >
            <p className="text-[var(--ui-text)]">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
          </Modal>
          
          {/* Scrolling Modal */}
          <Modal 
            open={scrollModalOpen} 
            onClose={() => setScrollModalOpen(false)}
            title="Long Content Modal - Scrolling Demo"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setScrollModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setScrollModalOpen(false)}>
                  Save Changes
                </Button>
              </>
            }
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-[var(--ui-text)] mb-3">Modal Scrolling Behavior</h4>
                <p className="text-[var(--ui-text-dim)] mb-4">
                  This modal demonstrates how the header and footer remain pinned while the content area scrolls.
                  The modal can handle very long content gracefully.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--ui-text)] mb-3">Team Members</h4>
                <div className="space-y-3">
                  {[
                    'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis',
                    'Frank Miller', 'Grace Wilson', 'Henry Moore', 'Ivy Taylor', 'Jack Anderson',
                    'Kate Thomas', 'Liam Jackson', 'Maya White', 'Noah Harris', 'Olivia Martin',
                    'Paul Thompson', 'Quinn Garcia', 'Ruby Martinez', 'Sam Robinson', 'Tara Clark'
                  ].map((name, index) => (
                    <Card key={name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={name} size="sm" />
                          <div>
                            <h5 className="font-medium text-[var(--ui-text)]">{name}</h5>
                            <p className="text-sm text-[var(--ui-text-dim)]">
                              {index % 3 === 0 ? 'Manager' : index % 3 === 1 ? 'Developer' : 'Designer'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={index % 4 === 0 ? 'success' : index % 4 === 1 ? 'primary' : index % 4 === 2 ? 'warning' : 'default'}
                            size="sm"
                          >
                            {index % 4 === 0 ? 'Active' : index % 4 === 1 ? 'Busy' : index % 4 === 2 ? 'Away' : 'Offline'}
                          </Badge>
                          <IconButton size="sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </IconButton>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--ui-text)] mb-3">Recent Items</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Morning Coffee', price: 4.50, icon: '☕' },
                    { name: 'Lunch Special', price: 12.99, icon: '🍽️' },
                    { name: 'Afternoon Snack', price: 6.75, icon: '🍪' },
                    { name: 'Dinner Combo', price: 18.50, icon: '🍝' },
                    { name: 'Late Night Treat', price: 8.25, icon: '🍰' },
                    { name: 'Weekend Brunch', price: 15.00, icon: '🥐' },
                  ].map((item, index) => (
                    <ItemPill
                      key={`modal-item-${index}`}
                      id={`modal-item-${index}`}
                      name={item.name}
                      price={item.price}
                      icon={item.icon}
                      selected={index === 1}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--ui-text)] mb-3">Additional Content</h4>
                <p className="text-[var(--ui-text-dim)] mb-4">
                  Notice how the header with the title "Long Content Modal - Scrolling Demo" stays fixed at the top,
                  and the footer with "Cancel" and "Save Changes" buttons remains pinned at the bottom.
                </p>
                <p className="text-[var(--ui-text-dim)] mb-4">
                  This creates a predictable user experience where important navigation and actions are always visible,
                  regardless of content length.
                </p>
                <Card className="p-4">
                  <h5 className="font-medium text-[var(--ui-text)] mb-2">Technical Implementation</h5>
                  <p className="text-sm text-[var(--ui-text-dim)]">
                    The modal uses flexbox with <code className="bg-[var(--ui-panel-2)] px-1 rounded">flex-shrink-0</code> on 
                    header/footer and <code className="bg-[var(--ui-panel-2)] px-1 rounded">flex-1 overflow-y-auto</code> on 
                    the body to achieve this pinned behavior.
                  </p>
                </Card>
              </div>
            </div>
          </Modal>
        </section>

        {/* Focus & Accessibility Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Accessibility & Focus</h2>
          
          <Card className="p-6">
            <h3 className="font-semibold text-[var(--ui-text)] mb-4">Keyboard Navigation</h3>
            <p className="text-[var(--ui-text-dim)] mb-4">
              Try using Tab, Enter, Space, and Escape keys to navigate:
            </p>
            <div className="flex flex-wrap gap-4">
              <Button>Focusable Button</Button>
              <IconButton>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </IconButton>
              <ItemPill
                id="focus-test"
                name="Focusable Pill"
                price={5.99}
                icon="⌨️"
              />
            </div>
            <p className="text-sm text-[var(--ui-text-dim)] mt-4">
              All components show visible focus rings and support keyboard interaction.
            </p>
          </Card>
        </section>

        {/* Design Tokens Reference */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--ui-text)] mb-6">Design Tokens</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-semibold text-[var(--ui-text)] mb-4">Colors in Use</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-[var(--ui-primary)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--ui-primary</code>
                  <span className="text-[var(--ui-text)]">Primary actions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-[var(--ui-danger)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--ui-danger</code>
                  <span className="text-[var(--ui-text)]">Destructive actions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-[var(--ui-panel)] border border-[var(--ui-border)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--ui-panel</code>
                  <span className="text-[var(--ui-text)]">Component backgrounds</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold text-[var(--ui-text)] mb-4">Border Radii</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-sm)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--r-sm</code>
                  <span className="text-[var(--ui-text)]">Small elements</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-md)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--r-md</code>
                  <span className="text-[var(--ui-text)]">Buttons, inputs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 bg-[var(--ui-panel-2)] border border-[var(--ui-border)] rounded-[var(--r-lg)]"></div>
                  <code className="text-[var(--ui-text-dim)]">--r-lg</code>
                  <span className="text-[var(--ui-text)]">Cards, modals</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

      </div>
    </div>
  )
}

export default UISandbox