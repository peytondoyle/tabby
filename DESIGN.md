# iOS 26-Inspired Design System

## Overview

This design system is inspired by iOS 26's clean, minimal aesthetic with a focus on subtle interactions and gorgeous visual design. The system uses CSS-in-JS for maximum flexibility and type safety.

## Core Principles

1. **Minimal & Clean** - No unnecessary visual noise
2. **Subtle Interactions** - Gentle animations and hover states
3. **Type Safety** - All design tokens are TypeScript constants
4. **iOS Aesthetic** - Clean lines, subtle shadows, rounded corners
5. **Light Mode Only** - Simplified color palette

## Design Tokens

All design tokens are defined in `src/styles/ios-design.ts`:

- **Colors**: iOS-inspired grays and primary blue (#007AFF)
- **Spacing**: 4px base scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px)
- **Typography**: SF Pro Display font stack
- **Border Radius**: iOS standard (6, 10, 12, 16, 20, 24px)
- **Shadows**: Subtle iOS-style shadows
- **Transitions**: Fast (100ms), Base (200ms), Slow (300ms), Spring (400ms)

## Components

### Core Components
- `Button` - Primary, secondary, ghost variants
- `Card` - Default, elevated, glass variants
- `Avatar` - Circular with gradient fallbacks
- `Badge` - Pill-shaped with semantic colors
- `Input` - Clean borders with focus states
- `Modal` - Sheet-style from bottom

### Layout Components
- `Stack` - Vertical/horizontal spacing
- `Container` - Max-width content wrapper
- `Spacer` - Flexible spacing

## Usage

```tsx
import { Button, Card, Stack } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

// Use design tokens for custom styling
const customStyle = {
  backgroundColor: designTokens.semantic.background.primary,
  padding: designTokens.spacing[4],
  borderRadius: designTokens.borderRadius.lg,
}
```

## Motion

The motion system provides subtle, iOS-inspired animations:

```tsx
import { springs, variants, patterns } from '@/lib/motion'

// Use predefined variants
<motion.div variants={variants.fadeInUp} />

// Use spring presets
<motion.div transition={springs.subtle} />

// Use common patterns
<motion.div variants={patterns.button} />
```

## Migration Notes

- All legacy CSS files have been removed
- Versioned components (V2, V3, Modern) have been deleted
- Components now use CSS-in-JS with design tokens
- Tailwind is minimal and used only for utility classes
- No dark mode complexity - light mode only
