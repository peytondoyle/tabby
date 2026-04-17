# ReceiptPanel Component

A modern receipt management component with drag-and-drop upload, item management, and OCR scanning capabilities.

## Features

### Header
- "Receipt" label in ink color
- Small mono text showing venue and date (e.g., "Billy's Cafe • Aug 24, 2025")

### Upload Section
- **Drag & Drop Zone**: Dashed border with rounded corners, hover effects
- **Upload Buttons**: 
  - "Upload Photo/PDF" (primary)
  - "Scan with OCR" (secondary)
- **File Input**: Hidden input supporting images and PDFs
- **Accessibility**: Keyboard navigation and ARIA labels

### Items List
- **ReceiptItemRow Components**: Each item displays:
  - Emoji chip with rounded background
  - Item label (medium font weight)
  - Price (mono font, right-aligned)
  - Delete button (trash icon)
  - Drag handle (six dots icon)
- **Hover Effects**: Background highlight and button opacity changes
- **Focus States**: Ring focus indicator
- **Section Total**: Dotted leaders connecting label to total price

### Empty State
- Centered illustration (🍽️ emoji)
- "Upload a receipt to get started" message

## Implementation Details

### CSS Classes Used
- **Design Tokens**: Uses custom CSS variables from `tokens.css`
- **Leaders Effect**: Custom CSS for dotted lines in totals
- **Button Styles**: `btn-primary` and `btn-secondary` classes
- **Card Layout**: `card` class for container styling

### Component Structure
```
ReceiptPanel/
├── index.tsx          # Main component
└── ReceiptItemRow.tsx # Individual item row
```

### Props Interface
```typescript
interface ReceiptPanelProps {
  billToken?: string
}
```

### State Management
- `items`: Array of receipt items
- `isDragOver`: Drag state for visual feedback
- `editorToken`: Bill editor token for backend integration

### File Handling
- Supports drag & drop for images and PDFs
- File input with multiple file selection
- Placeholder for OCR scanning functionality

## Usage

```tsx
import { ReceiptPanel } from './components/ReceiptPanel'

<ReceiptPanel billToken="your-bill-token" />
```

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus indicators
- Semantic HTML structure
- Drag & drop with keyboard alternatives
