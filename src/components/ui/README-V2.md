# UI Components V2

This directory contains the next generation of UI components for the Tabby Share Bill application. These components follow the "Liquid Glass" design system and provide enhanced accessibility, better motion, and improved user experience.

## Components

### GlassCardV2
Enhanced glass card component with improved visual effects and motion.

**Features:**
- Better glass effects with backdrop blur
- Improved motion animations
- Enhanced accessibility with proper focus states
- Consistent rounded corners (20px radius)
- Better shadow system

**Usage:**
```tsx
import { GlassCardV2 } from '@/components/ui/GlassCardV2'

<GlassCardV2 title="Card Title" variant="strong">
  Content here
</GlassCardV2>
```

### ProgressStepsV2
4-step progress indicator with enhanced accessibility and animations.

**Features:**
- Keyboard navigable with proper ARIA attributes
- Animated progress line
- Pulsing active state indicator
- Checkmark for completed steps
- Responsive design

**Usage:**
```tsx
import { ProgressStepsV2 } from '@/components/ui/ProgressStepsV2'

<ProgressStepsV2 
  current={1} 
  labels={['Upload', 'Scanning', 'Assign', 'Review']} 
/>
```

### ButtonV2
Enhanced button component with multiple variants and states.

**Features:**
- Primary, secondary, and ghost variants
- Loading state with spinner
- Proper focus-visible styling
- Consistent sizing and spacing
- Disabled state handling

**Usage:**
```tsx
import { ButtonV2 } from '@/components/ui/ButtonV2'

<ButtonV2 variant="primary" loading={isLoading}>
  Click me
</ButtonV2>
```

### BadgeV2
Compact status badge component with multiple variants.

**Features:**
- Success, warning, danger, and accent variants
- Multiple sizes (sm, md, lg)
- Smooth animations
- Consistent styling

**Usage:**
```tsx
import { BadgeV2 } from '@/components/ui/BadgeV2'

<BadgeV2 variant="success" size="sm">
  Success
</BadgeV2>
```

### EmptyStateV2
Friendly empty state component with optional actions.

**Features:**
- Customizable icon (emoji or React component)
- Optional action button
- Consistent spacing and typography
- Smooth animations

**Usage:**
```tsx
import { EmptyStateV2 } from '@/components/ui/EmptyStateV2'

<EmptyStateV2 
  icon="🍽️"
  title="No items yet"
  description="Upload a receipt to get started"
  action={{ label: "Upload", onClick: handleUpload }}
/>
```

## Design System

### Colors
- Uses CSS custom properties from `tokens.css`
- Supports light and dark modes
- Consistent color palette with semantic naming

### Spacing
- 8px grid system
- Consistent padding and margins
- Responsive spacing scales

### Typography
- Consistent font weights and sizes
- Proper line heights and letter spacing
- Accessible color contrast ratios

### Motion
- Subtle animations with 180ms duration
- Easing functions for natural feel
- Reduced motion support

## Migration from V1

V1 components are deprecated and will be removed in a future version. To migrate:

1. Replace `GlassCard` with `GlassCardV2`
2. Replace `ProgressSteps` with `ProgressStepsV2`
3. Replace `Button` with `ButtonV2`
4. Update any custom styling to use the new design tokens

## Accessibility

All V2 components include:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance (AA level)

## Testing

Components are tested with:
- Playwright E2E tests
- Accessibility audits
- Visual regression tests
- Cross-browser compatibility
