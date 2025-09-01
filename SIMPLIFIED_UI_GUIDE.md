# Billy Simplified UI Guide

## Philosophy: "Less is More"

Billy's UI should feel **clean**, **modern**, and **effortless** - not clunky or overworked.

## Core Principles

### 1. **Simplify First**
- Remove features before adding them
- Every UI element should have a clear purpose
- If it's not essential, it's not needed

### 2. **Consistent Spacing**
- Use the 8px grid system: 8px, 16px, 24px, 32px, 48px, 64px
- Maintain consistent margins and padding throughout
- Avoid arbitrary spacing values

### 3. **Clean Typography**
- Use only 2-3 font sizes: large (24px+), medium (16px), small (14px)
- Stick to one font family (system sans-serif)
- Maintain clear hierarchy without over-engineering

### 4. **Modern Color Palette**
- **Primary**: Blue (#4F46E5) - for actions and highlights
- **Primary Hover**: Blue (#6366F1) - for hover states
- **Secondary**: Cyan (#06B6D4) - for secondary actions
- **Secondary Hover**: Cyan (#22D3EE) - for secondary hover states
- **Background**: Dark (#0D0F12) - main background
- **Surface**: Dark gray (#1A1D22) - cards and panels
- **Border**: Medium gray (#2A2E35) - subtle separators
- **Text Primary**: White (#EAECEF) - main text
- **Text Secondary**: Light gray (#9CA3AF) - secondary text
- **Success**: Green (#10B981) - success states
- **Warning**: Orange (#F59E0B) - warning states
- **Error**: Red (#EF4444) - error states
- **Pink**: (#EC4899) - fun personality highlights
- **Lime**: (#A3E635) - fun personality highlights

## Component Guidelines

### Buttons
- **Primary**: Blue background, white text, rounded corners (16px)
- **Secondary**: Transparent background, blue text, blue border
- **Size**: Minimum 44px height for touch targets
- **Padding**: 16px horizontal, 12px vertical
- **Hover**: Always use semantic hover colors (primary-hover, secondary-hover)

### Cards
- **Background**: Surface color (#1A1D22)
- **Border**: Subtle border (#2A2E35)
- **Radius**: 16px (rounded-xl)
- **Padding**: 24px (p-6)
- **Shadow**: None or very subtle

### Layout
- **Container**: Max-width 1024px (max-w-4xl)
- **Gutters**: 24px (px-6)
- **Sections**: 32px margin between (mb-8)
- **Grid gaps**: 16px (gap-4)

## What NOT to Do

❌ **Don't add complex animations** - simple transitions only
❌ **Don't use multiple selection modes** - one clear interaction pattern
❌ **Don't overcrowd with buttons** - max 2-3 actions per screen
❌ **Don't use inconsistent spacing** - stick to the 8px grid
❌ **Don't add unnecessary borders/shadows** - keep it flat and clean
❌ **Don't use too many colors** - stick to the core palette
❌ **Don't use legacy color names** - use semantic colors (text-primary, not ink)

## What TO Do

✅ **Do use consistent spacing** - 8px grid system
✅ **Do make touch targets large** - minimum 44px
✅ **Do use clear visual hierarchy** - size and weight differences
✅ **Do provide clear feedback** - simple hover states
✅ **Do keep interactions intuitive** - tap to assign, not complex selection
✅ **Do use generous whitespace** - let content breathe
✅ **Do use semantic color classes** - text-text-primary, bg-surface, etc.
✅ **Do use hover states consistently** - primary-hover, secondary-hover

## Color Usage Examples

```tsx
// Good: Using semantic colors
<div className="bg-surface border border-border">
  <h2 className="text-text-primary">Title</h2>
  <p className="text-text-secondary">Description</p>
  <button className="bg-primary hover:bg-primary-hover text-white">
    Action
  </button>
</div>

// Bad: Using legacy or hardcoded colors
<div className="bg-card border border-line">
  <h2 className="text-ink">Title</h2>
  <p className="text-ink-dim">Description</p>
  <button className="bg-brand hover:bg-brand/90 text-white">
    Action
  </button>
</div>
```

## Remember

Billy should feel like a **breath of fresh air** - not another clunky app. Every pixel should serve a purpose, and every interaction should feel natural and effortless.

**When in doubt, remove it.**
