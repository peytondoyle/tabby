# PersonCard Component Design

## Overview
The `PersonCard` component has been redesigned with modern styling, drag & drop affordances, and a responsive layout that follows the design system.

## Design Specifications

### Card Structure
- **Container**: `rounded-2xl bg-card shadow-soft border border-line p-4 sm:p-5`
- **Responsive**: Adapts from 1 column on mobile to 4 columns on desktop
- **Hover Effects**: Cards lift with `shadow-pop` and `-translate-y-1` on hover

### Header Section
- **Avatar**: 48px circle with fallback emoji (👤)
- **Name**: Primary text in `text-ink` with `font-medium`
- **Venmo Handle**: Optional secondary text in `text-ink-dim` with @ prefix
- **Action Buttons**: Edit/Delete buttons that appear on hover/drag

### Assigned Items List
- **Layout**: Small emoji + label on left, price on right
- **Typography**: 13px monospace font for prices
- **Shared Items**: Fractional chips (e.g., ½) as tiny pills with `bg-paper`
- **Empty State**: "No items assigned yet" in italic `text-ink-dim`

### Totals Footer
- **Divider**: Subtle border-top with `border-line`
- **Subtotal**: Small monospace text in `text-ink-dim`
- **Total**: Large semibold text in `text-ink`
- **Animations**: Numbers animate with opacity/translate when tax/tip modes change

### Drag & Drop Affordances
- **Valid Drag Over**: Card lifts with `shadow-pop ring-2 ring-brand/30`
- **Drop Success**: Quick background flash with `bg-accent/10`
- **Visual Feedback**: Smooth transitions with `transition-all duration-200`

### Add Person Ghost Card
- **Style**: Dashed border with `border-2 border-dashed border-line`
- **Hover**: Lifts with `hover:shadow-pop hover:-translate-y-1`
- **Content**: Plus icon + "Add Person" text in `text-ink-dim`

## Grid Layout
- **Responsive**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- **Gap**: `gap-4` between cards
- **Auto-fit**: Cards automatically fit available space
- **Equal Heights**: `auto-rows-fr` ensures consistent card heights

## Props Interface

```typescript
interface PersonCardProps {
  person: {
    id: string
    name: string
    avatar_url?: string
    venmo_handle?: string
    is_archived: boolean
  }
  editorToken: string
  onUpdate: () => void
  assignedItems?: Array<{
    item_id: string
    emoji: string
    label: string
    price: number
    quantity: number
    weight: number
    share_amount: number
  }>
  totals?: {
    subtotal: number
    tax_share: number
    tip_share: number
    total: number
  }
  isDragOver?: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isAddPerson?: boolean
  onAddPerson?: () => void
}
```

## Usage Examples

### Basic Person Card
```tsx
<PersonCard
  person={person}
  editorToken={editorToken}
  onUpdate={handleUpdate}
/>
```

### Person Card with Assigned Items
```tsx
<PersonCard
  person={person}
  editorToken={editorToken}
  onUpdate={handleUpdate}
  assignedItems={[
    {
      item_id: "1",
      emoji: "🍕",
      label: "Pizza",
      price: 15.00,
      quantity: 1,
      weight: 0.5,
      share_amount: 7.50
    }
  ]}
  totals={{
    subtotal: 7.50,
    tax_share: 0.75,
    tip_share: 1.50,
    total: 9.75
  }}
/>
```

### Add Person Ghost Card
```tsx
<PersonCard
  person={{ id: "", name: "", avatar_url: "", venmo_handle: "", is_archived: false }}
  editorToken=""
  onUpdate={() => {}}
  isAddPerson={true}
  onAddPerson={handleAddPerson}
/>
```

### Drag & Drop Enabled Card
```tsx
<PersonCard
  person={person}
  editorToken={editorToken}
  onUpdate={handleUpdate}
  isDragOver={isDragOver}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
/>
```

## Design Tokens Used

### Colors
- `--ink`: Primary text color
- `--ink-dim`: Secondary text color
- `--card`: Card background
- `--paper`: Secondary background
- `--brand`: Primary brand color
- `--accent`: Success/accent color
- `--danger`: Error/danger color
- `--line`: Border color

### Shadows
- `--shadow-soft`: Default card shadow
- `--shadow-pop`: Elevated shadow for hover/drag states

### Border Radius
- `--radius-2xl`: 24px for card corners

### Typography
- `--font-mono`: Monospace font for prices
- `--font-sans`: Sans-serif font for text

## Responsive Behavior

### Mobile (< 640px)
- Single column layout
- Full-width cards
- Stacked content

### Tablet (640px - 1024px)
- 2-column grid
- Medium padding
- Balanced layout

### Desktop (1024px+)
- 3-4 column grid
- Larger padding
- Optimal spacing

## Accessibility Features

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus States**: Clear focus indicators for form elements
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets WCAG AA standards
- **Touch Targets**: Minimum 44px touch targets for mobile

## Animation Details

### Hover Animations
- **Duration**: 200ms
- **Easing**: Default ease
- **Properties**: Transform, shadow, opacity

### Drop Success Animation
- **Duration**: 300ms
- **Effect**: Background color flash
- **Trigger**: On successful drop

### Number Animations
- **Duration**: 150ms
- **Properties**: Opacity, transform
- **Trigger**: When totals change due to tax/tip mode changes
