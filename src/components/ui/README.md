# UI Components

This directory contains all the primitive UI components for the application.

## Components

### Core Components
- **Button** - Primary action component with variants and states
- **IconButton** - Square button for icons with neutral/danger tones
- **Card** - Container component for grouping content
- **Modal** - Overlay dialog with header/body/footer structure and scrolling support
- **ItemPill** - Interactive pill for selecting items with price display
- **Badge** - Small status/count indicator
- **Avatar** - Circular user avatar with initials and color generation
- **Skeleton** - Loading state placeholders with various patterns

### Motion Components
- **ItemPillMotion** - Motion-enhanced version of ItemPill using Framer Motion

## ItemPill Motion Usage

The `ItemPillMotion` component provides smooth animations for ItemPill interactions. Use it when you need animated pill lists.

### Basic Usage

```tsx
import { ItemPillMotion, ItemPillList } from './components/ui/ItemPillMotion'

function MyComponent() {
  const [items, setItems] = useState([...])

  return (
    <ItemPillList>
      {items.map(item => (
        <ItemPillMotion
          key={item.id}
          id={item.id}
          name={item.name}
          price={item.price}
          motionVariant="scale" // or "slide", "fade", "bounce"
          layout // enables layout animations
          onClick={handleItemClick}
        />
      ))}
    </ItemPillList>
  )
}
```

### Motion Variants

- **scale** - Items scale in/out (default)
- **slide** - Items slide from left/right
- **fade** - Simple opacity transition
- **bounce** - Bouncy scale animation

### CSS-Only Alternative

For projects not using Framer Motion, use the CSS classes:

```tsx
import { itemPillMotionClasses } from './components/ui/ItemPillMotion'

<ItemPill 
  className={`${itemPillMotionClasses.scaleIn} ${itemPillMotionClasses.hover}`}
  // ... other props
/>
```

Available classes:
- `scaleIn`, `scaleOut` - Scale animations
- `slideIn`, `slideOut` - Slide animations  
- `fadeIn`, `fadeOut` - Fade animations
- `bounce` - Bounce animation
- `hover` - Hover scale effect
- `tap` - Tap scale effect

## Avatar Usage

The Avatar component automatically generates initials and colors from names:

```tsx
<Avatar name="John Doe" size="md" />
<Avatar name="Jane Smith" size="lg" />

// Avatar groups with overlapping
<div className="flex -space-x-2">
  <Avatar name="User 1" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
  <Avatar name="User 2" size="sm" className="ring-2 ring-[var(--ui-bg)]" />
</div>
```

## Modal Scrolling

The Modal component supports long content with pinned header and footer:

```tsx
<Modal 
  title="Long Content"
  size="lg"
  footer={<Button>Save</Button>}
>
  {/* Very long content - header/footer stay pinned */}
</Modal>
```

The modal body will scroll while header and footer remain fixed.

## Skeleton Usage

The Skeleton component provides loading states for various UI patterns:

```tsx
// Basic skeleton
<Skeleton width="200px" height="20px" />

// Text lines
<SkeletonText lines={3} />

// Avatar skeleton
<SkeletonAvatar size="md" />

// Complex patterns
<SkeletonCard />
<SkeletonList items={5} showAvatar />
<SkeletonTable rows={4} cols={3} />
```

## Motion Utilities

The motion system provides consistent animations (`src/lib/motion.ts`):

```tsx
import { duration, ease, spring, variants } from '@/lib/motion'

// Use predefined values
const transition = {
  duration: duration.fast,    // 0.15s
  ease: ease.out             // [0, 0, 0.2, 1]
}

// Spring configurations
const springConfig = {
  type: "spring",
  ...spring.standard         // stiffness: 500, damping: 25
}

// Framer Motion variants
<motion.div {...variants.fade} />
<motion.div {...variants.slideUp} />
```

Available constants:
- **Durations**: `instant`, `fast`, `normal`, `slow`, `slower`
- **Easings**: `linear`, `out`, `in`, `inOut`, `bounce`, `gentle`
- **Springs**: `gentle`, `standard`, `bouncy`, `stiff`, `wobbly`

## Design Tokens

All components use CSS custom properties from `src/styles/theme.css`:

- Colors: `--ui-bg`, `--ui-panel`, `--ui-text`, `--ui-primary`, etc.
- Radii: `--r-sm`, `--r-md`, `--r-lg`
- Shadow: `--shadow-1`

Components automatically adapt to light/dark themes through CSS custom properties.

## Accessibility

All components include:
- Keyboard navigation support
- Visible focus indicators
- Proper ARIA attributes
- Screen reader support
- High contrast color combinations

## Examples

Visit `/ui` in the application to see all components with their states and interactions.