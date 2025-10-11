<!-- f661e3f2-8e26-4c12-8f9e-c8cc2f2d64d6 1fdb45ae-ddae-4ac5-80c8-b23184e5190e -->
# LocalStorage Bill History Implementation

## Overview

Implement a simple localStorage-based "user system" that tracks bills a user creates or accesses on their device, without requiring login. The app already has a `MyBillsPage` component that just needs to be connected to the routing and enhanced with automatic bill tracking.

## Key Files to Modify

### 1. **src/App.tsx** - Add routing for MyBillsPage

Currently the app only has routes for `/`, `/share-bill`, and `/ui-sandbox`. Need to add:

- Route for `/bills` → `MyBillsPage`
- Route for `/bill/:token` → Flow page (for editing bills)
- Update the landing page to link to "My Bills"

### 2. **src/lib/billHistory.ts** (NEW) - Bill tracking utility

Create a new utility module to manage bill history in localStorage:

- `trackBillAccess(bill)` - Save bill metadata to localStorage when accessed
- `getBillHistory()` - Retrieve all tracked bills
- `removeBillFromHistory(token)` - Remove a bill from history
- Store minimal metadata: `{ token, title, place, date, lastAccessed, totalAmount }`

### 3. **src/lib/bills.ts** - Auto-track on create/access

Hook into existing bill creation and fetching:

- In `createBill()` - Automatically track newly created bills
- In `fetchBillByToken()` - Automatically track when bills are accessed
- In `createLocalBill()` - Track local bills too

### 4. **src/pages/MyBillsPage.tsx** - Use history instead of API

Currently fetches from API or localStorage fallback. Update to:

- Load bills from `getBillHistory()` instead
- Keep existing UI (already has bill cards, delete, scanning)
- No need to show sync banner since everything is local
- Keep the "New Receipt" scanner flow

### 5. **src/pages/Flow.tsx** - Connect bill flow route

This page handles bill editing but may not be in the router yet. Ensure it's accessible at `/bill/:token`

## Implementation Steps

1. Create `billHistory.ts` utility with localStorage tracking functions
2. Update `App.tsx` to add `/bills` and `/bill/:token` routes
3. Hook tracking into `bills.ts` creation/fetch functions
4. Update `MyBillsPage` to use bill history
5. Add "My Bills" link to landing page and AppShell navigation
6. Test the full flow: scan → create → track → view in "My Bills"

## Technical Decisions

- **Storage key**: `tabby-bill-history` in localStorage
- **Data structure**: Array of `{ token, title, place, date, lastAccessed, totalAmount }`
- **Privacy**: Only metadata stored, actual bill data fetched by token when needed
- **Persistence**: Device-only, no cross-device sync (as requested)
- **Token-based access**: Existing token system unchanged, history just remembers tokens user has seen

### To-dos

- [x] Create src/lib/billHistory.ts utility for localStorage bill tracking
- [x] Add automatic tracking to bill creation and fetch functions in bills.ts
- [x] Add /bills and /bill/:token routes in App.tsx
- [x] Update MyBillsPage to load from bill history instead of API
- [x] Add 'My Bills' navigation links to landing page and AppShell
