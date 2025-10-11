# Flow URL Design & State Management

## URL Structure

The flow should use meaningful URLs that allow users to:
1. Share their current step with others
2. Refresh and continue where they left off
3. Navigate using browser back/forward buttons

### Proposed URL Structure:

```
/bill/{billId}                    # Redirects to current step
/bill/{billId}/people              # Add/manage people
/bill/{billId}/assign              # Assign items to people
/bill/{billId}/share               # Share receipt cards
```

## State Persistence Strategy

### 1. URL as Source of Truth
- The URL determines which step is shown
- The bill ID in the URL determines which flow state to load

### 2. Local Storage Persistence
- Save state on every meaningful change
- Load state when navigating to a bill
- Clean up old states after 7 days

### 3. Navigation Handling
- Use `navigate()` to change steps instead of `setStep()`
- Preserve bill ID in all navigation
- Handle browser back/forward naturally

## Implementation Benefits

1. **Shareable Links**: Users can share `/bill/123/assign` to show someone the assignment step
2. **Refresh Recovery**: State persists across refreshes
3. **Natural Navigation**: Browser back/forward work as expected
4. **Bookmarkable**: Users can bookmark specific steps
5. **State Recovery**: If app crashes, users can continue where they left off

## State Sync Strategy

```javascript
// On mount or URL change:
1. Extract billId from URL
2. Load persisted state for that billId
3. Navigate to the step specified in URL
4. Auto-save state changes to localStorage

// On navigation:
1. Save current state
2. Update URL to reflect new step
3. Component re-renders based on URL
```

## Error Recovery

- If bill not found: Redirect to home
- If invalid step: Redirect to current valid step
- If state corrupted: Start fresh with bill data