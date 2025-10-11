# Billy-Inspired UI Overhaul for Tabby

## What Makes Billy's UI Superior

### 1. **Extreme Simplicity**
- Single action per screen
- No unnecessary UI chrome
- Clear visual hierarchy
- Minimal color palette (black, white, blue accent)

### 2. **Clean Typography**
- Bold, large headings
- Clear price displays
- Minimal text, maximum clarity
- Consistent font weights

### 3. **Intuitive Flow**
1. Welcome → One button: "Scan Receipt"
2. Item List → Toggle between All Items / By Person
3. Assignment → Drag items to people circles
4. Share → Clean summary with share button

### 4. **Smart Visual Elements**
- Emojis for items (instant recognition)
- Circle avatars for people
- Rounded pill buttons for items
- Clean cards with subtle shadows
- Dark mode by default

## Ruthless Changes Needed for Tabby

### REMOVE IMMEDIATELY:
- All the complex UI components
- Multiple navigation patterns
- Excessive animations
- Complicated state management
- All deprecated folders
- Complex virtualization (keep it simple)
- Multiple theme systems
- Overly complex component variations

### IMPLEMENT:
1. **Single App.tsx** - One simple flow
2. **4 Core Screens**:
   - Welcome (scan button only)
   - Items (list with toggle view)
   - Assign (drag and drop)
   - Share (summary and share)
3. **Minimal Components**:
   - Button (one style, blue)
   - ItemPill (rounded, with emoji)
   - PersonCircle (avatar or initial)
   - Card (simple white container)
4. **Dark Theme Only** - No theme toggle
5. **Simple State** - Just items and assignments

## Implementation Plan

### Phase 1: Nuclear Option
- Delete all existing UI code
- Start fresh with Billy-inspired components
- Single file for each core screen
- No complex abstractions

### Phase 2: Core Flow
- Welcome → Scan → Items → Assign → Share
- No side navigation
- No complex modals
- Linear progression

### Phase 3: Polish
- Smooth, simple transitions (fade/slide only)
- Haptic feedback on drag
- Clean loading states
- Error states that don't break flow