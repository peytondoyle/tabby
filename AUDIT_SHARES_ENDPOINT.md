# Comprehensive Audit: Shares Endpoint 500 Errors

## Executive Summary

**Issue**: Intermittent 500 errors when updating item assignments (shares)
**Severity**: Medium (errors are retried and eventually succeed, but indicate underlying issues)
**Root Cause**: Race condition with **Delete-then-Insert pattern** + no request deduplication

---

## 1. Problem Analysis

### Error Pattern from Logs
```
[Error] Failed to load resource: the server responded with a status of 500 () (shares, line 0)
[Error] [updateReceiptShares] Failed to update shares: – Error: Failed to save assignments
[Error] [persistPeopleAndShares] Failed to persist to database: – Error: Failed to save assignments
```

**Observations**:
- Errors occur **intermittently** during rapid item assignment
- Subsequent retries **succeed**
- Errors happen when assigning multiple items quickly
- Two 500 errors observed in the logs, followed by successful saves

---

## 2. Server-Side Code Analysis

### File: `/api/receipts/[token]/shares.ts`

**Current Flow** (lines 116-145):
```typescript
// 1. DELETE all existing shares for this receipt's items
const { error: deleteError } = await supabaseAdmin
  .from('item_shares')
  .delete()
  .in('item_id', Array.from(itemIds));

// 2. INSERT new shares
const { data: insertedShares, error: insertError } = await supabaseAdmin
  .from('item_shares')
  .insert(sharesToInsert)
  .select();
```

### ⚠️ Critical Issues Identified

#### Issue 1: **Race Condition - Delete-then-Insert Pattern**
**Problem**: Two requests arriving simultaneously can cause:
```
Request A: DELETE all shares for items [1,2,3]
Request B: DELETE all shares for items [1,2,3]  ← Both happen at same time
Request A: INSERT shares for items [1,2]        ← Succeeds
Request B: INSERT shares for items [1,2,3]      ← May VIOLATE unique constraint!
```

**Why it happens**:
- Primary key: `(item_id, person_id)` - see line 10 of init.sql
- Unique index: `idx_item_shares_unique` - see line 10-11 of constraints migration
- If Request A inserts `(item_1, person_X)` and Request B tries to insert the same pair, **unique constraint violation**

#### Issue 2: **No Request Deduplication**
**Problem**: Every drag/drop triggers `persistPeopleAndShares()` which:
1. Calls `updateReceiptPeople()` (updates people list)
2. Calls `updateReceiptShares()` (deletes + inserts all shares)

**Evidence from logs**:
```
[Log] [updateReceiptPeople] Updating people (occurs 15+ times in rapid succession)
[Log] [updateReceiptShares] Updating shares (occurs 15+ times in rapid succession)
```

**Impact**: 15+ concurrent DELETE-INSERT operations on the same table → race conditions

#### Issue 3: **No Atomic Transaction**
**Problem**: DELETE and INSERT are separate operations, not wrapped in a transaction

**Risk**: If DELETE succeeds but INSERT fails, shares are **lost**

---

## 3. Client-Side Code Analysis

### File: `/src/tabby-ui-simple/TabbySimple.tsx`

**Function**: `persistPeopleAndShares()` (lines 53-104)

**Called from 6 locations**:
1. **Line 388**: When adding a person
2. **Line 482**: When removing a person (UnifiedEditModal)
3. **Line 611**: When assigning an item to a person
4. **Line 1100**: When removing a person from people list
5. **Line 1467**: When unassigning an item
6. **Line 1700**: When splitting an item

### ⚠️ Race Condition Triggers

**Scenario 1: Rapid Item Assignment**
```typescript
// User drags 5 items quickly to a person
assignItemToPerson(item1, personA) // → persistPeopleAndShares() #1
assignItemToPerson(item2, personA) // → persistPeopleAndShares() #2
assignItemToPerson(item3, personA) // → persistPeopleAndShares() #3
assignItemToPerson(item4, personA) // → persistPeopleAndShares() #4
assignItemToPerson(item5, personA) // → persistPeopleAndShares() #5
```

**Result**: 5 simultaneous API calls to `/api/receipts/[token]/shares`

**What happens**:
1. All 5 calls DELETE the same item_shares rows
2. All 5 calls try to INSERT overlapping data
3. Primary key conflicts cause 500 errors
4. Client retries → eventual success

---

## 4. Database Constraints Analysis

### Table: `item_shares`

**Schema** (from `init.sql`):
```sql
create table if not exists public.item_shares (
  item_id uuid not null references public.items(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  weight numeric not null default 1,
  primary key (item_id, person_id)  ← COMPOSITE PRIMARY KEY
);
```

**Unique Index** (from `constraints.sql`):
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_shares_unique
ON public.item_shares(item_id, person_id);  ← UNIQUE CONSTRAINT
```

**Check Constraints**:
```sql
-- From constraints.sql
ALTER TABLE public.item_shares
ADD CONSTRAINT check_weight_positive CHECK (weight > 0);
```

### Violation Scenario

**Request A** inserts:
```sql
INSERT INTO item_shares (item_id, person_id, weight) VALUES
  ('uuid-item-1', 'uuid-person-X', 1),
  ('uuid-item-2', 'uuid-person-X', 1);
```

**Request B** (simultaneously) inserts:
```sql
INSERT INTO item_shares (item_id, person_id, weight) VALUES
  ('uuid-item-1', 'uuid-person-X', 1),  ← CONFLICT!
  ('uuid-item-2', 'uuid-person-X', 1),  ← CONFLICT!
  ('uuid-item-3', 'uuid-person-X', 1);
```

**Result**: `unique_violation` error → 500 response

---

## 5. Solutions

### Solution 1: **Use UPSERT Instead of Delete-then-Insert** ⭐ RECOMMENDED

**Change**: Replace DELETE + INSERT with INSERT ... ON CONFLICT DO UPDATE

**Code Change** (`/api/receipts/[token]/shares.ts`):

```typescript
// ❌ BEFORE (lines 116-145)
await supabaseAdmin.from('item_shares').delete().in('item_id', Array.from(itemIds));
await supabaseAdmin.from('item_shares').insert(sharesToInsert).select();

// ✅ AFTER
// Step 1: Get all current shares for this receipt
const { data: existingShares } = await supabaseAdmin
  .from('item_shares')
  .select('item_id, person_id')
  .in('item_id', Array.from(itemIds));

const existingKeys = new Set(
  existingShares?.map(s => `${s.item_id}:${s.person_id}`) || []
);

const newKeys = new Set(
  shares.map(s => `${s.item_id}:${s.person_id}`)
);

// Step 2: Delete shares that no longer exist
const keysToDelete = [...existingKeys].filter(k => !newKeys.has(k));
if (keysToDelete.length > 0) {
  const [itemIds, personIds] = keysToDelete.map(k => {
    const [item_id, person_id] = k.split(':');
    return { item_id, person_id };
  });

  for (const { item_id, person_id } of itemIds) {
    await supabaseAdmin
      .from('item_shares')
      .delete()
      .eq('item_id', item_id)
      .eq('person_id', person_id);
  }
}

// Step 3: UPSERT new/updated shares (atomic!)
if (shares.length > 0) {
  const { data: insertedShares, error: insertError } = await supabaseAdmin
    .from('item_shares')
    .upsert(sharesToInsert, {
      onConflict: 'item_id,person_id',
      ignoreDuplicates: false
    })
    .select();

  if (insertError) {
    console.error('[receipts_shares] Error upserting shares:', insertError);
    // ... handle error
  }
}
```

**Benefits**:
- ✅ No race conditions - UPSERT is atomic
- ✅ Handles concurrent requests gracefully
- ✅ No unique constraint violations

---

### Solution 2: **Add Request Deduplication** ⭐ RECOMMENDED

**Change**: Debounce rapid calls to `persistPeopleAndShares()`

**Code Change** (`/src/tabby-ui-simple/TabbySimple.tsx`):

```typescript
// Add at the top of component
const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Replace persistPeopleAndShares calls with:
const debouncedPersist = useCallback((
  token: string | null,
  people: Person[],
  items: Item[]
) => {
  if (persistTimeoutRef.current) {
    clearTimeout(persistTimeoutRef.current);
  }

  persistTimeoutRef.current = setTimeout(async () => {
    const updatedPeople = await persistPeopleAndShares(token, people, items);
    setPeople(updatedPeople);
  }, 300); // 300ms debounce
}, []);

// Usage example:
assignItemToPerson(itemId, personId) {
  // ... update local state ...
  debouncedPersist(billToken, updatedPeople, updatedItems);
}
```

**Benefits**:
- ✅ Reduces API calls from 15+ to 1-2
- ✅ Improves performance
- ✅ Reduces race condition likelihood

---

### Solution 3: **Add Database Transaction** ⭐ RECOMMENDED

**Change**: Wrap DELETE + INSERT in a transaction

**Code Change** (`/api/receipts/[token]/shares.ts`):

```typescript
// Use Supabase transaction (via RPC)
const { data, error } = await supabaseAdmin.rpc('atomic_update_shares', {
  receipt_id: receipt.id,
  new_shares: sharesToInsert
});
```

**SQL Function** (new migration):
```sql
CREATE OR REPLACE FUNCTION public.atomic_update_shares(
  receipt_id uuid,
  new_shares jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_ids uuid[];
  result jsonb;
BEGIN
  -- Get all item IDs for this receipt
  SELECT array_agg(id) INTO item_ids
  FROM items WHERE receipt_id = atomic_update_shares.receipt_id;

  -- Delete old shares (in transaction)
  DELETE FROM item_shares WHERE item_id = ANY(item_ids);

  -- Insert new shares (in same transaction)
  INSERT INTO item_shares (item_id, person_id, weight)
  SELECT
    (share->>'item_id')::uuid,
    (share->>'person_id')::uuid,
    COALESCE((share->>'weight')::numeric, 1)
  FROM jsonb_array_elements(new_shares) AS share;

  -- Return updated shares
  SELECT jsonb_agg(row_to_json(s))
  INTO result
  FROM item_shares s
  WHERE s.item_id = ANY(item_ids);

  RETURN result;
END;
$$;
```

**Benefits**:
- ✅ ACID guarantees (all or nothing)
- ✅ No partial updates
- ✅ Better data integrity

---

### Solution 4: **Add Retry Logic with Exponential Backoff**

**Change**: Retry failed requests automatically

**Code Change** (`/src/lib/receipts.ts`):

```typescript
export async function updateReceiptShares(
  token: string,
  shares: Array<{ item_id: string; person_id: string; weight?: number }>
): Promise<any> {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[updateReceiptShares] Attempt ${attempt}/${maxRetries}`);

      const response = await apiFetch<{ shares: any[]; count: number }>(
        `/api/receipts/${token}/shares`,
        {
          method: "POST",
          body: { shares: shares.map(s => ({ ...s, weight: s.weight || 1 })) },
        }
      );

      console.log('[updateReceiptShares] Successfully updated shares:', response);
      return response;

    } catch (error) {
      lastError = error;
      console.error(`[updateReceiptShares] Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[updateReceiptShares] All retries failed:', lastError);
  throw lastError;
}
```

**Benefits**:
- ✅ Handles transient errors
- ✅ User sees fewer errors
- ✅ Better UX

---

## 6. Recommended Implementation Plan

### Phase 1: Immediate Fixes (Critical)
1. ✅ **Implement Solution 1** (UPSERT) - Eliminates race conditions
2. ✅ **Implement Solution 2** (Debouncing) - Reduces concurrent requests

### Phase 2: Robustness (High Priority)
3. ✅ **Implement Solution 4** (Retry logic) - Better error handling
4. ✅ **Add monitoring/logging** - Track 500 errors in production

### Phase 3: Long-term (Medium Priority)
5. ✅ **Implement Solution 3** (Transaction) - Better data integrity
6. ✅ **Add optimistic locking** - Prevent lost updates

---

## 7. Testing Checklist

After implementing fixes:

- [ ] Test rapid item assignment (drag 10 items quickly)
- [ ] Test concurrent users on same receipt
- [ ] Test split item assignment
- [ ] Test remove person with items
- [ ] Monitor Vercel logs for 500 errors
- [ ] Load test with 50+ items and 10+ people
- [ ] Test offline → online scenario
- [ ] Test browser refresh mid-assignment

---

## 8. Monitoring Recommendations

Add logging to track:
- Number of concurrent share updates
- Average response time
- Error rate (500s vs 200s)
- Retry attempts needed
- Database constraint violations

---

## 9. Additional Findings

### Performance Issue
**Current**: Every item assignment triggers:
1. `updateReceiptPeople()` - even if people haven't changed
2. `updateReceiptShares()` - for ALL items

**Optimization**: Only call `updateReceiptPeople()` when people actually change

**Impact**: Could reduce API calls by 50%

---

## 10. Conclusion

**Root Cause**: Delete-then-Insert pattern + no deduplication = race conditions

**Impact**: ~13% failure rate during rapid assignments (2/15 requests in logs)

**Fix Priority**:
1. High: UPSERT pattern
2. High: Request debouncing
3. Medium: Retry logic
4. Low: Database transactions

**Estimated Fix Time**: 2-4 hours
**Risk**: Low (changes are backwards compatible)
**Testing Required**: Medium (need to test concurrent scenarios)
