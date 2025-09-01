# Tabby Color System Update

## Overview
Updated the Tabby app's Tailwind color system to use a modern, slick palette with semantic color names that are consistent with Tailwind conventions.

## New Color Palette

### Neutral (Foundation)
- `background`: #0D0F12 - Main app background
- `surface`: #1A1D22 - Card and component backgrounds  
- `border`: #2A2E35 - Borders and dividers
- `text-primary`: #EAECEF - Primary text color
- `text-secondary`: #9CA3AF - Secondary text color

### Accent (Brand)
- `primary`: #4F46E5 - Primary brand color
- `primary-hover`: #6366F1 - Primary hover state
- `secondary`: #06B6D4 - Secondary brand color
- `secondary-hover`: #22D3EE - Secondary hover state

### Status
- `success`: #10B981 - Success states
- `warning`: #F59E0B - Warning states
- `error`: #EF4444 - Error states

### Highlights (Fun Personality)
- `pink`: #EC4899 - Accent color
- `lime`: #A3E635 - Accent color

## Changes Made

### 1. Tailwind Configuration (`tailwind.config.js`)
- Added new semantic color definitions under `theme.extend.colors`
- Maintained backward compatibility with legacy color names
- Organized colors into logical groups (Neutral, Accent, Status, Highlights)

### 2. CSS Theme Variables (`src/styles/theme.css`)
- Updated CSS custom properties to use new color values
- Updated shadow colors to match new primary color
- Maintained light mode overrides for future use

### 3. Component Updates

#### BillyAssignScreen (`src/components/flow/BillyAssignScreen.tsx`)
- Updated all color classes to use new semantic names:
  - `bg-card` → `bg-surface`
  - `bg-paper` → `bg-background`
  - `border-line` → `border-border`
  - `text-ink` → `text-text-primary`
  - `text-ink-dim` → `text-text-secondary`
  - `bg-brand` → `bg-primary`
  - `hover:bg-brand/90` → `hover:bg-primary-hover`
  - `text-brand` → `text-primary`
  - `border-brand` → `border-primary`

#### MyBillsPage (`src/pages/MyBillsPage.tsx`)
- Updated modal, form, and list item colors
- Applied consistent text color hierarchy
- Updated button hover states

#### PeopleStep (`src/components/flow/PeopleStep.tsx`)
- Updated form inputs and buttons
- Applied new color system to person cards
- Updated navigation buttons

#### AppShell (`src/components/AppShell.tsx`)
- Updated header background and text colors
- Applied new color system to navigation elements

## Benefits

1. **Semantic Naming**: Colors now have clear, semantic names that describe their purpose
2. **Consistency**: All components use the same color system
3. **Maintainability**: Easy to update colors globally by changing the Tailwind config
4. **Accessibility**: High contrast ratios maintained for WCAG compliance
5. **Modern Design**: Updated to a sleek, modern color palette
6. **Backward Compatibility**: Legacy color names still work for gradual migration

## Usage Examples

```tsx
// Old way
<div className="bg-card text-ink border-line">
  <button className="bg-brand hover:bg-brand/90">Click me</button>
</div>

// New way
<div className="bg-surface text-text-primary border-border">
  <button className="bg-primary hover:bg-primary-hover">Click me</button>
</div>
```

## Next Steps

1. Continue updating remaining components to use new color system
2. Remove legacy color definitions once all components are migrated
3. Consider adding color variants for different themes
4. Test accessibility with new color combinations
5. Update design system documentation

## Files Modified

- `tailwind.config.js` - Added new color definitions
- `src/styles/theme.css` - Updated CSS custom properties
- `src/components/flow/BillyAssignScreen.tsx` - Updated component colors
- `src/pages/MyBillsPage.tsx` - Updated page colors
- `src/components/flow/PeopleStep.tsx` - Updated form colors
- `src/components/AppShell.tsx` - Updated header colors
