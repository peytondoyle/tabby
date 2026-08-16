import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { parseReceipt, createReceiptFromReceipt, type ParseResult } from '../lib/receiptScanning';
import { LazyShareReceiptModal as ShareReceiptModal } from '../components/ShareReceiptModal/LazyShareReceiptModal';
import { FoodIcon } from '../lib/foodIcons';
import { parsePersonHeadcount } from '../lib/computeTotals';
import { getReceiptHistory } from '../lib/receiptHistory';
import { useAuth } from '../lib/authContext';
import { AuthModal } from '../components/AuthModal';
import { HomeButton } from '../components/HomeButton';
import { fetchReceiptByToken, updateReceiptMetadata, updateReceiptAssignments } from '../lib/receipts';
import { trackPersonName, getQuickAddSuggestions, getUserIdentity, setUserIdentity } from '../lib/peopleHistory';
import { UnifiedEditModal } from '../components/UnifiedEditModal';
import { useBillTotals, getPersonTotal, getPersonBreakdown } from '../lib/useBillTotals';
import { openVenmoRequest } from '../lib/venmo';
import { ProgressSteps } from '../components/design-system/ProgressSteps';
import './TabbySimple.css';

interface Item {
  id: string;
  sourceId?: string;
  emoji: string;
  name: string;        // Display name (maps to 'label' in database)
  price: number;       // LINE TOTAL (unit_price * quantity)
  quantity?: number;   // Pieces on this line — 6 for "6 Peking Dumplings $9.12"
  unit_price?: number; // Per-piece price, only meaningful when quantity > 1
  assignedTo?: string;
  splitBetween?: string[]; // Array of person IDs sharing this item
}

interface SourceItemInput {
  id?: string;
  emoji?: string;
  label?: string;
  name?: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

function toUniqueItems(items: SourceItemInput[]): Item[] {
  const itemCountsBySource = new Map<string, number>();
  const output: Item[] = [];

  items.forEach((item, index) => {
    const sourceId = (item.id && String(item.id).trim()) || `item-${index}`;
    const price = Number(item.price) || 0;
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unitPrice = Number(item.unit_price) || (quantity > 0 ? price / quantity : price);

    for (let i = 0; i < quantity; i++) {
      const instance = itemCountsBySource.get(sourceId) ?? 0;
      itemCountsBySource.set(sourceId, instance + 1);

      output.push({
        id: instance === 0 ? sourceId : `${sourceId}::dup-${instance}`,
        sourceId,
        emoji: item.emoji || '🍽️',
        name: item.name || item.label || 'Item',
        price: unitPrice,
        quantity: 1,
        unit_price: unitPrice,
        assignedTo: undefined,
        splitBetween: undefined
      });
    }
  });

  return output;
}

function buildItemIdPool(items: Item[]): Map<string, string[]> {
  const pool = new Map<string, string[]>();

  for (const item of items) {
    const sourceId = item.sourceId || item.id;
    const existing = pool.get(sourceId) ?? [];
    existing.push(item.id);
    pool.set(sourceId, existing);
  }

  return pool;
}

function resolveItemIdFromAssignments(
  itemId: string,
  itemById: Map<string, Item>,
  itemPool: Map<string, string[]>,
  sourceUsage: Map<string, number>
): string | null {
  const directMatch = itemById.get(itemId);
  if (directMatch) return directMatch.id;

  const idsForSource = itemPool.get(itemId);
  if (!idsForSource || idsForSource.length === 0) {
    return null;
  }

  const index = sourceUsage.get(itemId) ?? 0;
  const safeIndex = Math.min(index, idsForSource.length - 1);
  sourceUsage.set(itemId, index + 1);
  return idsForSource[safeIndex];
}

function toPersistItemId(item: Item): string {
  return item.sourceId || item.id;
}

type PersistedAssignment = {
  itemId: string;
  personId: string;
  weight: number;
};

function normalizeAssignments(rawAssignments: unknown, sourceQuantityById?: Map<string, number>): PersistedAssignment[] {
  if (!rawAssignments) return [];

  if (Array.isArray(rawAssignments)) {
    return rawAssignments.flatMap((entry): PersistedAssignment[] => {
      if (!entry || typeof entry !== 'object') return [];
      const itemId = String((entry as any).itemId || '').trim();
      const personId = String((entry as any).personId || '').trim();
      const weight = Number((entry as any).weight);
      if (!itemId || !personId) return [];
      const defaultWeight = Math.max(1, Math.floor(sourceQuantityById?.get(itemId) ?? 1));
      const normalizedWeight = Number.isFinite(weight)
        ? Math.max(1, Math.floor(weight))
        : defaultWeight;
      return [{ itemId, personId, weight: normalizedWeight }];
    });
  }

  if (typeof rawAssignments === 'object') {
    const sourceEntries = rawAssignments as Record<string, unknown>;
    const output: PersistedAssignment[] = [];

    for (const [itemId, personId] of Object.entries(sourceEntries)) {
      const normalizedItemId = itemId.trim();
      const normalizedPersonId = String(personId || '').trim();
      if (!normalizedItemId || !normalizedPersonId) continue;

      const parsedWeight = Math.max(
        1,
        Math.floor(sourceQuantityById?.get(normalizedItemId) ?? 1)
      );
      output.push({
        itemId: normalizedItemId,
        personId: normalizedPersonId,
        weight: parsedWeight
      });
    }

    return output;
  }

  return [];
}

function buildPersistedAssignments(items: Item[]): PersistedAssignment[] {
  return items.flatMap(item => {
    const participants = getItemParticipants(item);
    return participants.map(personId => ({
      itemId: item.id,
      personId,
      weight: 1
    }));
  });
}

function shareCountFromWeight(weight: unknown, maxCopies: number): number {
  const numeric = typeof weight === 'number' ? weight : Number(weight);
  if (!Number.isFinite(numeric)) return 1;
  const rounded = Math.max(1, Math.floor(numeric + 1e-9));
  return maxCopies > 0 ? Math.min(rounded, maxCopies) : rounded;
}

interface Person {
  id: string;
  name: string;
  items: string[];
  total: number;
  venmo_handle?: string | null;
  headcount?: number;
  personal_credit?: number;
  credit_note?: string;
}

const ITEM_DRAG_MIME = 'application/x-tabby-item-id';
const POINTER_DRAG_THRESHOLD = 8;

type PendingPersist = { token: string | null; people: Person[]; items: Item[] };

function splitAuditMessage(message: string) {
  const [title, ...detailParts] = message.split(/\s+-\s+/);
  return {
    title: title.trim(),
    detail: detailParts.join(' - ').trim(),
  };
}

// Vibrant color palette for person avatars — pops on dark backgrounds
const PERSON_COLORS = [
  'var(--tb-person-1)',
  'var(--tb-person-2)',
  'var(--tb-person-3)',
  'var(--tb-person-4)',
  'var(--tb-person-5)',
  'var(--tb-person-6)',
  'var(--tb-person-7)',
  'var(--tb-person-8)',
  'var(--tb-person-9)',
  'var(--tb-person-10)',
];

function normalizeHeadcount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function getPersonHeadcount(person?: Pick<Person, 'headcount' | 'name'> | null): number {
  if (!person) return 1;
  if (person.headcount !== undefined && person.headcount !== null) {
    return normalizeHeadcount(person.headcount);
  }
  return parsePersonHeadcount(person.name);
}

const getPersonColor = (index: number): string => {
  return PERSON_COLORS[index % PERSON_COLORS.length];
};

function getPersonHeadcountById(people: Person[], personId: string): number {
  const person = people.find(p => p.id === personId);
  return getPersonHeadcount(person);
}

function getItemParticipants(item: Item): string[] {
  if (item.splitBetween && item.splitBetween.length > 0) return item.splitBetween;
  return item.assignedTo ? [item.assignedTo] : [];
}

function getItemShareDenominator(item: Item, people: Person[]): number {
  const participants = getItemParticipants(item);
  if (participants.length === 0) return 0;

  return participants.reduce((sum, personId) => {
    return sum + getPersonHeadcountById(people, personId);
  }, 0);
}

function getPersonShareWeight(item: Item, personId: string, people: Person[]): number {
  const participants = getItemParticipants(item);
  if (participants.length === 0) return 0;
  if (!participants.includes(personId)) return 0;

  return getPersonHeadcountById(people, personId);
}

function removePersonFromItem(item: Item, personId: string): Item {
  if (!item.splitBetween || item.splitBetween.length === 0) {
    if (item.assignedTo === personId) {
      return { ...item, assignedTo: undefined };
    }
    return item;
  }

  const remaining = item.splitBetween.filter(id => id !== personId);
  if (remaining.length === item.splitBetween.length) return item;

  if (remaining.length === 0) {
    return { ...item, splitBetween: undefined, assignedTo: undefined };
  }

  return { ...item, splitBetween: remaining, assignedTo: remaining[0] };
}

/**
 * Helper to persist people and assignments to the database
 * Returns updated people with Supabase UUIDs
 */
async function persistPeopleAndShares(
  token: string | null,
  people: Person[],
  items: Item[]
): Promise<Person[]> {
  if (!token) {
    console.log('[persistPeopleAndShares] No token, skipping database save');
    return people;
  }

  try {
    // Prepare people data for API
    const peoplePayload = people.map(p => ({
      id: p.id,
      name: p.name,
      avatar_url: null,
      venmo_handle: p.venmo_handle ?? null,
      headcount: getPersonHeadcount(p),
      personal_credit: p.personal_credit ?? 0,
      credit_note: p.credit_note ?? null
    }));

    // Build weighted shares array - each person-tab contributes their implied headcount
    const shareWeightsByPerson = new Map<string, Map<string, number>>();

    const addShare = (personId: string, itemId: string, weight: number) => {
      const weightsByItem = shareWeightsByPerson.get(personId) ?? new Map<string, number>();
      weightsByItem.set(itemId, (weightsByItem.get(itemId) || 0) + weight);
      shareWeightsByPerson.set(personId, weightsByItem);
    };

    const itemById = new Map(items.map(item => [item.id, item]));

    for (const person of people) {
      const personWeight = getPersonHeadcount(person);
      const assignedItemIds = new Set(person.items);

      for (const itemId of assignedItemIds) {
        const item = itemById.get(itemId);
        if (!item) continue;
        addShare(person.id, toPersistItemId(item), personWeight);
      }
    }

    const sharesPayload = Array.from(shareWeightsByPerson).flatMap(([personId, weightsByItem]) =>
      Array.from(weightsByItem, ([itemId, weight]) => ({
        item_id: itemId,
        person_id: personId,
        weight
      }))
    );

    // 🚀 COMBINED API CALL - saves people AND shares in one request (2x faster!)
    const response = await updateReceiptAssignments(token, peoplePayload, sharesPayload);

    // Update people with Supabase UUIDs - match by name to preserve items
    const updatedPeople: Person[] = response.people.map((apiPerson: any) => {
      const originalPerson =
        people.find(p => p.id === apiPerson.client_id) ||
        people.find(p => p.name === apiPerson.name);
      return {
        id: apiPerson.id, // Supabase UUID
        name: apiPerson.name,
        items: originalPerson?.items || [],
        total: originalPerson?.total || 0,
        venmo_handle: apiPerson.venmo_handle ?? originalPerson?.venmo_handle ?? null,
        headcount: getPersonHeadcount(apiPerson as Person),
        personal_credit: Number(apiPerson.personal_credit ?? originalPerson?.personal_credit ?? 0) || undefined,
        credit_note: apiPerson.credit_note ?? originalPerson?.credit_note
      };
    });

    console.log('[persistPeopleAndShares] Successfully saved people and shares to database');

    return updatedPeople;
  } catch (error) {
    console.error('[persistPeopleAndShares] Failed to persist to database:', error);
    return people; // Return original people on error
  }
}

export const TabbySimple: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: urlToken } = useParams<{ token: string }>();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<'upload' | 'scanning' | 'scanFailed' | 'editName' | 'people' | 'assign'>('upload');
  const [scanError, setScanError] = useState<string>('');
  const lastFileRef = useRef<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showSplitItem, setShowSplitItem] = useState(false);
  const [showUnifiedEdit, setShowUnifiedEdit] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [creditPersonId, setCreditPersonId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [splitPeople, setSplitPeople] = useState<string[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newVenmoHandle, setNewVenmoHandle] = useState('');
  const [newPersonHeadcount, setNewPersonHeadcount] = useState('1');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState('');
  const [editingPersonHeadcount, setEditingPersonHeadcount] = useState('1');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverPerson, setDragOverPerson] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [billToken, setBillToken] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState('');
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [isEditingRestaurantName, setIsEditingRestaurantName] = useState(false);
  const [editableRestaurantName, setEditableRestaurantName] = useState('');
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [showBillOverview, setShowBillOverview] = useState(false);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [editableItems, setEditableItems] = useState<Item[]>([]);
  const [editableSubtotal, setEditableSubtotal] = useState('0');
  const [editableTax, setEditableTax] = useState('0');
  const [editableTip, setEditableTip] = useState('0');
  const [editableDiscount, setEditableDiscount] = useState('0');
  const [editableServiceFee, setEditableServiceFee] = useState('0');
  const [showDragTooltip, setShowDragTooltip] = useState(false);
  const [toasts, setToasts] = useState<{id: string, emoji: string, item: string, person: string, color: string}[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [scanAudit, setScanAudit] = useState<Pick<ParseResult, 'subtotal' | 'total' | 'validation' | 'fieldConfidence' | 'suggestedCorrections' | 'confidence'> | null>(null);
  const [totalsVerified, setTotalsVerified] = useState(false);
  const prevAllAssignedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce timer for database persistence (prevents race conditions)
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPersistingRef = useRef<boolean>(false);
  const pendingPersistRef = useRef<PendingPersist | null>(null);
  const pointerDragStartRef = useRef<{ itemId: string; x: number; y: number; pointerId: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  // SINGLE SOURCE OF TRUTH: Computed bill totals with penny reconciliation
  // This hook automatically recalculates person totals when items/people/fees change
  const billTotals = useBillTotals({
    items,
    people,
    tax,
    tip,
    discount,
    serviceFee
  });

  // Debounced version of persistPeopleAndShares to prevent rapid concurrent API calls
  // Returns a promise for error handling
  const debouncedPersist = useCallback((
    token: string | null,
    people: Person[],
    items: Item[],
    onError?: (error: unknown) => void
  ) => {
    // Clear any pending persist operation
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    // Store the latest data in case we're already persisting
    pendingPersistRef.current = { token, people, items };

    // Schedule new persist operation after 300ms of inactivity
    persistTimeoutRef.current = setTimeout(async () => {
      // If already persisting, wait for it to complete
      if (isPersistingRef.current) {
        console.log('[debouncedPersist] Already persisting, will retry after completion');
        return;
      }

      isPersistingRef.current = true;
      const currentData = pendingPersistRef.current;
      pendingPersistRef.current = null;

      if (currentData) {
        try {
          const updatedPeople = await persistPeopleAndShares(currentData.token, currentData.people, currentData.items);
          setPeople(updatedPeople);
        } catch (error) {
          console.error('[debouncedPersist] Persist failed:', error);
          onError?.(error);
        } finally {
          isPersistingRef.current = false;

          // If there's pending data, schedule another persist
          const pending = pendingPersistRef.current as PendingPersist | null;
          if (pending) {
            console.log('[debouncedPersist] Found pending data, scheduling another persist');
            debouncedPersist(pending.token, pending.people, pending.items, onError);
          }
        }
      } else {
        isPersistingRef.current = false;
      }
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showAddPerson && !showSplitItem && !showUnifiedEdit && !showShareReceipt && !showAuthModal && !creditPersonId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowAddPerson(false);
      setShowSplitItem(false);
      setShowUnifiedEdit(false);
      setShowShareReceipt(false);
      setShowAuthModal(false);
      setCreditPersonId(null);
      closePersonEditor();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddPerson, showSplitItem, showUnifiedEdit, showShareReceipt, showAuthModal, creditPersonId]);

  // Determine step from URL
  useEffect(() => {
    if (urlToken) {
      const path = location.pathname;
      if (path.includes('/people')) {
        console.log('[TabbySimple] URL shows people step:', urlToken);
        setStep('people');
      } else if (path.includes('/edit')) {
        console.log('[TabbySimple] URL shows assign step:', urlToken);
        setStep('assign');
      }
    } else if (location.pathname === '/') {
      // Reset to upload screen when navigating home
      console.log('[TabbySimple] Navigated to home, resetting to upload');
      setStep('upload');
      setItems([]);
      setPeople([]);
      setBillToken(null);
      setRestaurantName('');
      setScanAudit(null);
      setTotalsVerified(false);
    }
  }, [urlToken, location.pathname]);

  // Auto-add "Me" when reaching people step on new bills
  useEffect(() => {
    if (step === 'people' && people.length === 0) {
      const myName = getUserIdentity();
      if (myName) {
        console.log('[TabbySimple] Auto-adding user identity:', myName);
        const newPerson: Person = {
          id: `person-${Date.now()}`,
          name: myName,
          items: [],
          total: 0,
          headcount: 1,
        };
        setPeople([newPerson]);
      }
    }
  }, [step]);

  // Show drag tooltip for first-time users after 3 seconds of inactivity
  useEffect(() => {
    if (step === 'assign' && items.length > 0 && people.length > 0) {
      const hasSeenHint = localStorage.getItem('tabby-drag-hint-seen');
      // Unassigned = neither solo-assigned nor split between anyone.
      const unassignedItems = items.filter(item =>
        !item.assignedTo && !(item.splitBetween && item.splitBetween.length > 0)
      );

      if (!hasSeenHint && unassignedItems.length > 0) {
        // Show tooltip after 3 seconds of inactivity
        const timer = setTimeout(() => {
          setShowDragTooltip(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [step, items, people]);

  // Load bill from URL params if on edit route
  useEffect(() => {
    const loadBillFromUrl = async () => {
      // Only load from API if we don't have items already
      if (urlToken && items.length === 0) {
        setIsLoadingBill(true);
        try {
          const billData = await fetchReceiptByToken(urlToken);
          if (!billData) return;

          // Handle both 'bill' and 'receipt' keys from API
          const receiptData = ((billData as any).bill || billData.receipt) as any;

          if (billData && receiptData) {
            // Coerce to a finite number — protects against undefined/null/NaN
            // strings from the API silently collapsing to NaN downstream.
            const safeNum = (v: unknown): number => {
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            };

            const sourceItems = Array.isArray(billData.items) ? billData.items : [];
            const sourceQuantitiesById = new Map<string, number>();
            const normalizedSourceItems = sourceItems.map((item: any): SourceItemInput => {
              const quantity = Math.max(1, Math.round(safeNum(item.quantity) || 1));
              const unit_price = safeNum(item.unit_price);
              const sourceId = item.id && String(item.id).trim();
              if (sourceId) {
                sourceQuantitiesById.set(sourceId, quantity);
              }
              return {
                id: item.id,
                emoji: item.emoji || '🍽️',
                label: item.label || item.name || 'Item',
                price: safeNum(item.price ?? (unit_price * quantity)),
                quantity,
                unit_price
              };
            });
            const loadedItems = toUniqueItems(normalizedSourceItems);

            setItems(loadedItems);
            setRestaurantName(receiptData.place || receiptData.title || 'Restaurant');
            setTax(safeNum(receiptData.sales_tax));
            setTip(safeNum(receiptData.tip));
            setDiscount(safeNum(receiptData.discount));
            setServiceFee(safeNum(receiptData.service_fee));
            setBillToken(urlToken);

            let resolvedShareData: any | null = null;
            const localShareData = localStorage.getItem(`bill-share-${urlToken}`);
            if (localShareData) {
              try {
                resolvedShareData = JSON.parse(localShareData);
              } catch (error) {
                console.error('Error loading local share data:', error);
              }
            }

            const loadedPeople = (billData.people ?? []).map((person: any) => ({
              ...person,
              headcount: getPersonHeadcount(person)
            }));
            const loadedPersonById = new Map<string, any>(loadedPeople.map(person => [person.id, person]));
            const itemById = new Map(loadedItems.map(item => [item.id, item]));
            const itemPool = buildItemIdPool(loadedItems);

            const localAssignments = normalizeAssignments(resolvedShareData?.assignments, sourceQuantitiesById);
            const apiAssignments: PersistedAssignment[] = [];
            const apiShares = Array.isArray((billData as any).shares) ? (billData as any).shares as Array<any> : [];

            for (const share of apiShares) {
              if (!share || typeof share !== 'object') continue;

              const rawItemId = String((share as any).item_id || '').trim();
              const personId = String((share as any).person_id || '').trim();
              if (!rawItemId || !personId) continue;

              const maxCopies = sourceQuantitiesById.get(rawItemId) ?? 1;
              const shareCount = shareCountFromWeight((share as any).weight, maxCopies);

              for (let i = 0; i < shareCount; i++) {
                apiAssignments.push({ itemId: rawItemId, personId, weight: 1 });
              }
            }

            const assignments: PersistedAssignment[] = localAssignments.length > 0
              ? localAssignments
              : apiAssignments;

            if (assignments.length === 0 && loadedPeople.length > 0) {
              for (const person of loadedPeople) {
                const personItems = Array.isArray(person.items) ? person.items : [];
                for (const itemId of personItems) {
                  assignments.push({
                    itemId: String(itemId),
                    personId: person.id,
                    weight: Math.max(1, Math.floor(sourceQuantitiesById.get(String(itemId)) ?? 1))
                  });
                }
              }
            }

            const sourceUsage = new Map<string, number>();
            const ownersByItemId = new Map<string, string[]>();

            for (const assignment of assignments) {
              const shareCount = shareCountFromWeight(assignment.weight, sourceQuantitiesById.get(assignment.itemId) ?? 1);
              if (shareCount <= 0) continue;
              for (let i = 0; i < shareCount; i++) {
                const resolvedItemId = resolveItemIdFromAssignments(
                  assignment.itemId,
                  itemById,
                  itemPool,
                  sourceUsage
                );
                if (!resolvedItemId) continue;

                const owners = ownersByItemId.get(resolvedItemId) ?? [];
                if (!owners.includes(assignment.personId)) owners.push(assignment.personId);
                ownersByItemId.set(resolvedItemId, owners);
              }
            }

            const assignmentItems = loadedItems.map(item => {
              const assignedPeople = ownersByItemId.get(item.id) ?? [];
              if (assignedPeople.length > 1) {
                return {
                  ...item,
                  assignedTo: assignedPeople[0],
                  splitBetween: assignedPeople
                };
              }
              if (assignedPeople.length === 1) {
                return {
                  ...item,
                  assignedTo: assignedPeople[0],
                  splitBetween: undefined
                };
              }
              return item;
            });

            setItems(assignmentItems);

            const peopleWithAssignments = new Map<string, Person>();

            const normalizedLocalPeople = Array.isArray(resolvedShareData?.people)
              ? (resolvedShareData.people as Person[]).map((person: any): Person => ({
                  ...person,
                  headcount: getPersonHeadcount(person),
                  items: person.items || [],
                  total: person.total || 0
                }))
              : [];

            const seedPeople = normalizedLocalPeople.length > 0
              ? normalizedLocalPeople
              : loadedPeople;

            for (const person of seedPeople) {
              const existing = peopleWithAssignments.get(person.id);
              if (!existing) {
                const baseItems = Array.isArray(person.items)
                  ? person.items.map((itemId: string) => String(itemId))
                  : [];
                peopleWithAssignments.set(person.id, {
                  ...person,
                  items: baseItems,
                  total: person.total || 0
                });
              }

              const filteredItems = assignmentItems
                .filter(item =>
                  (ownersByItemId.get(item.id) ?? []).includes(person.id)
                )
                .map(item => item.id);

              if (filteredItems.length > 0) {
                const updatedPerson = peopleWithAssignments.get(person.id);
                if (updatedPerson) {
                  updatedPerson.items = filteredItems;
                }
              }
            }

            if (peopleWithAssignments.size === 0 && assignments.length > 0) {
              for (const item of assignmentItems) {
                for (const personId of item.splitBetween || []) {
                  if (!personId) continue;
                  const existing = peopleWithAssignments.get(personId);

                  if (existing) {
                    if (!existing.items.includes(item.id)) {
                      existing.items.push(item.id);
                    }
                  } else {
                    const basePerson = loadedPersonById.get(personId) || {
                      id: personId,
                      name: personId,
                      items: [],
                      total: 0
                    };

                    peopleWithAssignments.set(personId, {
                      ...basePerson,
                      items: [item.id],
                      total: 0
                    });
                  }
                }
              }
            }

            setPeople(Array.from(peopleWithAssignments.values()));
          }
        } catch (error) {
          console.error('Error loading bill:', error);
        } finally {
          setIsLoadingBill(false);
        }
      }
    };

    loadBillFromUrl();
  }, [urlToken]);

  // Show auth modal on first visit (if not authenticated and not dismissed)
  useEffect(() => {
    const hasSeenAuth = localStorage.getItem('tabby-auth-seen');
    if (!user && !hasSeenAuth && step === 'upload') {
      // Show after a brief delay for better UX
      const timer = setTimeout(() => setShowAuthModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, step]);

  const handleFileSelect = async (file: File) => {
    // Keep a reference for retry from the scan-failed screen.
    lastFileRef.current = file;
    // Set step to people immediately, show scan progress there
    setStep('people');
    setScanProgress('Scanning receipt...');

    try {
      const result = await parseReceipt(file, (progress) => {
        setScanProgress(progress);
      });

      // Convert to our item format (quantity metadata comes from the server's
      // parseQuantityItems — one row per receipt line, never N copies).
      const scannedItems = toUniqueItems((result.items || []).map((item): SourceItemInput => ({
        id: item.id,
        emoji: item.emoji || '🍽️',
        name: item.label,
        label: item.label,
        price: Number(item.price) || 0,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? item.price,
      })));

      setItems(scannedItems);
      setRestaurantName(result.place || 'Restaurant');
      setTax(result.tax || 0);
      setTip(result.tip || 0);
      setDiscount(result.discount || 0);
      setServiceFee(result.service_fee || 0);
      setScanAudit({
        subtotal: result.subtotal,
        total: result.total,
        validation: result.validation,
        fieldConfidence: result.fieldConfidence,
        suggestedCorrections: result.suggestedCorrections,
        confidence: result.confidence
      });
      setTotalsVerified(false);

      // Log what was scanned for debugging
      console.log('[TabbySimple] Scan results:', {
        place: result.place,
        subtotal: result.subtotal,
        tax: result.tax,
        tip: result.tip,
        discount: result.discount,
        service_fee: result.service_fee,
        total: result.total,
        itemCount: result.items.length
      });

      // Create bill in backend
      const receiptData = {
        restaurant_name: result.place || "Unknown Restaurant",
        location: result.place || "Unknown Location",
        date: result.date || new Date().toISOString().split('T')[0],
        items: result.items.map(item => ({
          emoji: item.emoji || '🍽️',
          label: item.label,
          price: item.price,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        subtotal: result.subtotal || 0,
        tax: result.tax || 0,
        tip: result.tip || 0,
        discount: result.discount || 0,
        service_fee: result.service_fee || 0,
        total: result.total || 0
      };

      const token = await createReceiptFromReceipt(receiptData, undefined, user?.id);
      console.log('Bill created with token:', token, user?.id ? `(user: ${user.id})` : '(no user)');
      setBillToken(token);

      // Load items with Supabase UUIDs from sessionStorage
      const supabaseItemsJson = sessionStorage.getItem(`receipt-items-${token}`);
      if (supabaseItemsJson) {
        try {
          const supabaseItems = JSON.parse(supabaseItemsJson);
          console.log('[TabbySimple] Loaded items with Supabase UUIDs:', supabaseItems);
          // Update items with Supabase UUIDs
          const updatedItems = toUniqueItems((supabaseItems || []).map((item: any): SourceItemInput => ({
            id: item.id, // Supabase UUID
            emoji: item.emoji || '🍽️',
            name: item.label || item.name || 'Item',
            label: item.label || item.name || 'Item',
            price: Number(item.price) || (Number(item.unit_price || 0) * Math.max(1, Math.round(Number(item.quantity) || 1))),
            quantity: item.quantity,
            unit_price: item.unit_price
          })));
          setItems(updatedItems);
        } catch (error) {
          console.error('[TabbySimple] Failed to load Supabase items:', error);
        }
      }

      // Check if restaurant name needs editing
      const placeLower = (result.place || '').toLowerCase().trim();
      const needsNameEdit = !result.place ||
        placeLower === 'demo restaurant' ||
        placeLower === 'restaurant' ||
        placeLower === 'unknown restaurant' ||
        placeLower === 'store name' ||
        placeLower === 'store';

      // Navigate to appropriate next step
      console.log('Scan complete:', {
        place: result.place,
        needsNameEdit,
        peopleAdded: people.length,
        token
      });

      if (needsNameEdit) {
        setStep('editName');
        setScanProgress('');
      } else {
        // Update URL to include token if we're on people step
        // This ensures the URL is shareable and refreshable
        console.log('[TabbySimple] Scan complete, updating URL with token:', token);
        navigate(`/receipt/${token}/people`, { replace: true });

        // Clear scan progress after navigating
        setScanProgress('');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      const msg = error instanceof Error ? error.message : 'Something went wrong while reading your receipt.';
      setScanError(msg);
      setStep('scanFailed');
      setScanProgress('');
    }
  };

  // Start a blank bill the user can build manually — used from the failure
  // screen when the scanner can't read the photo.
  const startManualBill = () => {
    const nowDate = new Date().toISOString().split('T')[0];
    setItems([]);
    setRestaurantName('');
    setTax(0); setTip(0); setDiscount(0); setServiceFee(0);
    setScanAudit(null);
    setTotalsVerified(false);
    setScanError('');
    setIsEditingRestaurantName(true);
    setEditableRestaurantName('');
    setStep('editName');
    // Clear URL token since this is a fresh bill, not loaded from server
    setBillToken(null);
    void nowDate; // placeholder — we might record this later
  };

  const retryScan = () => {
    setScanError('');
    setScanProgress('');
    if (lastFileRef.current) {
      void handleFileSelect(lastFileRef.current);
    } else {
      setStep('upload');
    }
  };

  const handleAddPerson = async (name?: string, headcount?: number) => {
    // Ensure name is a string before calling trim()
    const nameStr = typeof name === 'string' ? name.trim() : newPersonName.trim();
    if (nameStr) {
      const venmoStr = newVenmoHandle.trim().replace(/^@/, '');
      const resolvedHeadcount = normalizeHeadcount(headcount ?? newPersonHeadcount);
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: nameStr,
        items: [],
        total: 0,
        venmo_handle: venmoStr || null,
        headcount: resolvedHeadcount
      };
      const updatedPeople = [...people, newPerson];
      setPeople(updatedPeople);
      trackPersonName(nameStr); // Track for future suggestions
      setNewPersonName('');
      setNewVenmoHandle('');
      setNewPersonHeadcount('1');
      setShowAddPerson(false);

      // Persist to database (debounced to prevent race conditions)
      debouncedPersist(billToken, updatedPeople, items);
    }
  };

  const openPersonEditor = (person: Person) => {
    setEditingPersonId(person.id);
    setEditingPersonName(person.name);
    setEditingPersonHeadcount(String(getPersonHeadcount(person)));
  };

  const closePersonEditor = () => {
    setEditingPersonId(null);
    setEditingPersonName('');
    setEditingPersonHeadcount('1');
  };

  const savePersonEdit = () => {
    if (!editingPersonId) return;

    const personName = editingPersonName.trim();
    if (!personName) return;

    const headcount = normalizeHeadcount(editingPersonHeadcount);
    const updatedPeople = people.map(person => {
      if (person.id !== editingPersonId) return person;

      const originalName = person.name;
      if (originalName !== personName) {
        trackPersonName(personName);
      }

      return { ...person, name: personName, headcount };
    });

    setPeople(updatedPeople);
    debouncedPersist(billToken, updatedPeople, items);
    closePersonEditor();
  };

  // Unified Edit Modal Handlers
  const handleUnifiedRestaurantSave = async (name: string) => {
    setRestaurantName(name);
    if (billToken) {
      try {
        await updateReceiptMetadata(billToken, { place: name });
        console.log('[TabbySimple] Restaurant name updated successfully');
      } catch (error) {
        console.error('[TabbySimple] Failed to update restaurant name:', error);
        throw error;
      }
    }
  };

  const rebaseTaxTip = (newItems: Item[]) => {
    const oldSubtotal = billTotals?.subtotal ?? 0;
    const newSubtotal = newItems.reduce((sum, it) => sum + it.price, 0);
    if (oldSubtotal <= 0 || newSubtotal <= 0) return;
    const ratio = newSubtotal / oldSubtotal;
    if (Math.abs(ratio - 1) < 0.0001) return;
    setTax(Math.round(tax * ratio * 100) / 100);
    setTip(Math.round(tip * ratio * 100) / 100);
  };

  const handleUnifiedItemsSave = (newItems: Item[]) => {
    rebaseTaxTip(newItems);
    setItems(newItems);
    if (scanAudit) setTotalsVerified(false);
    // Subtotal, total, and person totals are all derived by useBillTotals.
  };

  const handleUnifiedBillTotalsSave = async (data: { subtotal: number; tax: number; tip: number; discount: number; serviceFee: number }) => {
    // Subtotal is derived from items — ignore any subtotal edit from the modal.
    const { tax: newTax, tip: newTip, discount: newDiscount, serviceFee: newServiceFee } = data;
    setTax(newTax);
    setTip(newTip);
    setDiscount(newDiscount);
    setServiceFee(newServiceFee);
    if (scanAudit) setTotalsVerified(false);

    if (billToken) {
      try {
        await updateReceiptMetadata(billToken, {
          subtotal: billTotals?.subtotal ?? 0,
          sales_tax: newTax,
          tip: newTip,
          discount: newDiscount,
          service_fee: newServiceFee
        });
      } catch (error) {
        console.error('[TabbySimple] Failed to update bill totals:', error);
        throw error;
      }
    }
  };

  const handleEditCredit = (personId: string) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    setCreditPersonId(personId);
    setCreditAmount(person.personal_credit ? person.personal_credit.toFixed(2) : '');
    setCreditNote(person.credit_note ?? '');
  };

  const handleSaveCredit = () => {
    if (!creditPersonId) return;

    const trimmed = creditAmount.trim().replace(/^\$/, '');
    const amount = trimmed === '' ? 0 : parseFloat(trimmed);
    if (!Number.isFinite(amount) || amount < 0) return;

    const note = amount > 0 ? creditNote.trim() || undefined : undefined;

    const updatedPeople = people.map(p =>
      p.id === creditPersonId
        ? { ...p, personal_credit: amount || undefined, credit_note: note }
        : p
    );
    setPeople(updatedPeople);
    debouncedPersist(billToken, updatedPeople, items);
    setCreditPersonId(null);
    setCreditAmount('');
    setCreditNote('');
  };

  const handleUnifiedPersonRemove = async (personId: string) => {
    // Remove person and unassign their items
    const updatedPeople = people.filter(p => p.id !== personId);
    const updatedItems = items.map(item => removePersonFromItem(item, personId)
    );
    setPeople(updatedPeople);
    setItems(updatedItems);

    // Persist to database (debounced to prevent race conditions)
    debouncedPersist(billToken, updatedPeople, updatedItems);
  };

  const handleSaveReceiptEdits = () => {
    rebaseTaxTip(editableItems);
    setItems(editableItems);
    setIsEditingReceipt(false);
    if (scanAudit) setTotalsVerified(false);
    // Subtotal and total are derived by useBillTotals.
  };

  const handleSaveBillEdits = async () => {
    // Subtotal edits are ignored — subtotal is derived from items.
    const newTax = parseFloat(editableTax) || 0;
    const newTip = parseFloat(editableTip) || 0;
    const newDiscount = parseFloat(editableDiscount) || 0;
    const newServiceFee = parseFloat(editableServiceFee) || 0;
    setTax(newTax);
    setTip(newTip);
    setDiscount(newDiscount);
    setServiceFee(newServiceFee);
    setIsEditingBill(false);
    if (scanAudit) setTotalsVerified(false);

    if (billToken) {
      try {
        await updateReceiptMetadata(billToken, {
          subtotal: billTotals?.subtotal ?? 0,
          sales_tax: newTax,
          tip: newTip,
          discount: newDiscount,
          service_fee: newServiceFee
        });
      } catch (error) {
        console.error('[TabbySimple] Failed to update bill totals:', error);
      }
    }
  };

  // Toast notification helper
  const addToast = useCallback((emoji: string, itemName: string, personName: string, color: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, emoji, item: itemName, person: personName, color }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 1500);
  }, []);

  // Celebration trigger: detect transition from not-all-assigned → all-assigned
  useEffect(() => {
    const allAssigned = items.length > 0 && items.every(item => item.assignedTo);
    if (allAssigned && !prevAllAssignedRef.current) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    prevAllAssignedRef.current = allAssigned;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(ITEM_DRAG_MIME, itemId);
    e.dataTransfer.setData('text/plain', itemId);

    // Hide tooltip after first drag
    if (showDragTooltip) {
      setShowDragTooltip(false);
      localStorage.setItem('tabby-drag-hint-seen', 'true');
    }
  };

  const clearDragState = useCallback(() => {
    pointerDragStartRef.current = null;
    setDraggedItem(null);
    setDragOverPerson(null);
  }, []);

  useEffect(() => {
    window.addEventListener('dragend', clearDragState);
    window.addEventListener('drop', clearDragState);
    window.addEventListener('pointerup', clearDragState);
    window.addEventListener('pointercancel', clearDragState);
    window.addEventListener('blur', clearDragState);

    return () => {
      window.removeEventListener('dragend', clearDragState);
      window.removeEventListener('drop', clearDragState);
      window.removeEventListener('pointerup', clearDragState);
      window.removeEventListener('pointercancel', clearDragState);
      window.removeEventListener('blur', clearDragState);
    };
  }, [clearDragState]);

  const handleDragEnd = clearDragState;

  const getDropPersonId = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    return (element?.closest('[data-person-id]') as HTMLElement | null)?.dataset.personId ?? null;
  }, []);

  const handlePointerDragStart = (e: React.PointerEvent<HTMLElement>, itemId: string) => {
    if (e.button !== 0) return;
    pointerDragStartRef.current = { itemId, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const start = pointerDragStartRef.current;
    if (!start) return;

    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (distance < POINTER_DRAG_THRESHOLD) return;

    setDraggedItem(start.itemId);
    setDragOverPerson(getDropPersonId(e.clientX, e.clientY));
  };

  const handlePointerDragEnd = (e: React.PointerEvent<HTMLElement>) => {
    const start = pointerDragStartRef.current;
    if (!start) return;

    e.currentTarget.releasePointerCapture?.(start.pointerId);
    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const personId = distance >= POINTER_DRAG_THRESHOLD ? getDropPersonId(e.clientX, e.clientY) : null;

    if (personId) {
      suppressNextClickRef.current = true;
      assignItemToPerson(start.itemId, personId);
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    }

    clearDragState();
  };

  const handlePointerDragCancel = (e: React.PointerEvent<HTMLElement>) => {
    const start = pointerDragStartRef.current;
    if (start) {
      e.currentTarget.releasePointerCapture?.(start.pointerId);
    }

    clearDragState();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (personId: string) => {
    setDragOverPerson(personId);
  };

  const handleDragLeave = () => {
    setDragOverPerson(null);
  };

  const handleDrop = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData(ITEM_DRAG_MIME) || e.dataTransfer.getData('text/plain') || draggedItem;
    if (itemId) {
      assignItemToPerson(itemId, personId);
    }
    clearDragState();
  };

  // NOTE: calculatePersonTotal has been removed - use getPersonTotal(billTotals, personId) instead
  // The useBillTotals hook at line ~153 is the SINGLE SOURCE OF TRUTH for all calculations

  const assignItemToPerson = async (itemId: string, personId: string) => {
    clearDragState();

    // 🚀 OPTIMISTIC UPDATE - Update UI immediately for instant feedback
    const previousItems = items;
    const previousPeople = people;

    // Show toast notification
    const assignedItem = items.find(i => i.id === itemId);
    const assignedPerson = people.find(p => p.id === personId);
    const personIndex = people.findIndex(p => p.id === personId);
    if (assignedItem && assignedPerson) {
      addToast(assignedItem.emoji, assignedItem.name, assignedPerson.name, getPersonColor(personIndex));
    }

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, assignedTo: personId, splitBetween: undefined } : item
    );
    setItems(updatedItems);

    // Update people's items arrays - totals are computed by useBillTotals hook
    const updatedPeople = people.map(person => {
      if (person.id === personId) {
        // Add item to this person
        return {
          ...person,
          items: [...new Set([...person.items, itemId])],
          total: 0 // Will be computed by billTotals hook
        };
      }
      // Remove from other people
      if (person.items.includes(itemId)) {
        return {
          ...person,
          items: person.items.filter(id => id !== itemId),
          total: 0 // Will be computed by billTotals hook
        };
      }
      return person;
    });
    setPeople(updatedPeople);

    // Persist to database in background (debounced)
    // If it fails, rollback the optimistic update
    debouncedPersist(billToken, updatedPeople, updatedItems, (error) => {
      // Rollback on error
      console.error('[assignItemToPerson] Failed to persist, rolling back:', error);
      setItems(previousItems);
      setPeople(previousPeople);
      // TODO: Show user-friendly error toast
    });
  };

  // An item is unassigned when NO ONE owns it — neither solo-assigned nor
  // in anyone's splitBetween. Previously `!item.assignedTo` classified split
  // items as unassigned, so every person's card showed their pre-split share
  // even before the user touched anything.
  const unassignedItems = items.filter(item =>
    !item.assignedTo && !(item.splitBetween && item.splitBetween.length > 0)
  );
  const itemById = new Map(items.map(item => [item.id, item]));
  const itemsByPersonId = new Map(
    people.map(person => [
      person.id,
      person.items
        .map(itemId => itemById.get(itemId))
        .filter((item): item is Item => Boolean(item))
    ])
  );
  const allItemsAssigned = items.length > 0 && unassignedItems.length === 0;
  const scanWarnings = scanAudit?.validation?.warnings ?? [];
  const lowConfidenceFields = Object.entries(scanAudit?.fieldConfidence ?? {})
    .filter(([, confidence]) => confidence === 'low')
    .map(([field]) => field);
  const canShare = allItemsAssigned && people.length > 0 && (!scanAudit || totalsVerified);
  const mathReviewCard = scanAudit ? (
    <section className={`math-review-card ${totalsVerified ? 'math-review-card--verified' : ''}`}>
      <div className="math-review-header">
        <div>
          <p className="math-review-eyebrow">Receipt math</p>
          <h2>{totalsVerified ? 'Totals reviewed' : 'Review before sharing'}</h2>
        </div>
        <button
          type="button"
          className="math-review-action"
          onClick={() => setTotalsVerified(true)}
        >
          {totalsVerified ? 'Reviewed' : 'Mark reviewed'}
        </button>
      </div>
      <div className="math-review-grid">
        <div>
          <span>Items sum</span>
          <strong>${(billTotals?.subtotal ?? 0).toFixed(2)}</strong>
        </div>
        <div>
          <span>Receipt subtotal</span>
          <strong>${(scanAudit.subtotal ?? billTotals?.subtotal ?? 0).toFixed(2)}</strong>
        </div>
        <div>
          <span>Receipt total</span>
          <strong>${(scanAudit.total ?? billTotals?.receipt_total ?? 0).toFixed(2)}</strong>
        </div>
        <div>
          <span>Split total</span>
          <strong>${(billTotals?.grand_total ?? 0).toFixed(2)}</strong>
        </div>
      </div>
      {(scanWarnings.length > 0 || lowConfidenceFields.length > 0 || (scanAudit.suggestedCorrections?.length ?? 0) > 0) && (
        <div className="math-review-notes" role="list" aria-label="Receipt review notes">
          {scanWarnings.map((warning) => {
            const note = splitAuditMessage(warning);
            return (
              <div className="math-review-note math-review-note--warning" role="listitem" key={warning}>
                <span className="math-review-note-icon" aria-hidden="true">!</span>
                <p>
                  <strong>{note.title}</strong>
                  {note.detail && <span>{note.detail}</span>}
                </p>
              </div>
            );
          })}
          {lowConfidenceFields.length > 0 && (
            <div className="math-review-note math-review-note--muted" role="listitem">
              <span className="math-review-note-icon" aria-hidden="true">?</span>
              <p>
                <strong>Low confidence fields</strong>
                <span>{lowConfidenceFields.join(', ')}</span>
              </p>
            </div>
          )}
          {scanAudit.suggestedCorrections?.map((correction) => (
            <div className="math-review-note math-review-note--suggestion" role="listitem" key={`${correction.field}-${correction.suggestedValue}`}>
              <span className="math-review-note-icon" aria-hidden="true">↺</span>
              <p>
                <strong>Suggested {correction.field}</strong>
                <span>{String(correction.suggestedValue)} · {correction.reason}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  ) : null;
  const editPersonModal = editingPersonId ? (
    <div className="modal-overlay" onClick={closePersonEditor}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-person-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="edit-person-title">Edit Person</h3>
        <input
          type="text"
          placeholder="Name"
          value={editingPersonName}
          onChange={(e) => setEditingPersonName(e.target.value)}
          autoFocus
        />
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="Headcount"
          value={editingPersonHeadcount}
          onChange={(e) => setEditingPersonHeadcount(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={savePersonEdit} disabled={!editingPersonName.trim()}>
            Save
          </button>
          <button className="contacts-btn" onClick={closePersonEditor}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Show loading state when loading bill from URL
  if (isLoadingBill) {
    return (
      <div className="tabby-simple">
        <HomeButton />
        <div className="scanning-container">
          <div className="scan-icon">📋</div>
          <h2>Loading Bill</h2>
          <p>Getting your receipt ready...</p>
        </div>
      </div>
    );
  }

  if (step === 'upload' && !urlToken) {
    const historyCount = getReceiptHistory().length;

    return (
      <div className="tabby-simple">
        <div className="upload-container">
          {/* User status indicator */}
          {user && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '13px',
                color: 'var(--tb-ink-muted)'
              }}>
                {user.email}
              </div>
              <button
                onClick={signOut}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--tb-ink-muted)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Sign out
              </button>
            </div>
          )}

          <h1 className="logo">tabby</h1>
          <p className="subtitle">Split bills the easy way</p>

          <label className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <span className="upload-icon">📸</span>
            <span className="upload-text">Snap your receipt</span>
            <span className="upload-hint">Photo · PDF · Screenshot</span>
          </label>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '32px',
            width: '280px'
          }}>
            {historyCount > 0 && (
              <button
                onClick={() => navigate('/receipts')}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'var(--tb-surface-2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'var(--tb-ink)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>📋</span>
                <span>My Receipts ({historyCount})</span>
              </button>
            )}

            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'var(--tb-accent-tint)',
                  border: '1px solid var(--tb-accent-border)',
                  borderRadius: '12px',
                  color: 'var(--tb-accent)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--tb-accent-tint)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--tb-accent-tint)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>🔐</span>
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSkip={() => {
            setShowAuthModal(false);
            localStorage.setItem('tabby-auth-seen', 'true');
          }}
        />
      </div>
    );
  }

  if (step === 'scanFailed') {
    return (
      <div className="tabby-simple">
        <HomeButton />
        <div className="scan-failed">
          <div className="scan-failed-icon">🧾</div>
          <h2 className="scan-failed-title">Couldn't read that receipt</h2>
          <p className="scan-failed-message">
            {scanError || 'The scanner had trouble with this one. Try a clearer photo, or enter items manually.'}
          </p>
          <div className="scan-failed-actions">
            <button className="continue-btn" onClick={retryScan}>
              {lastFileRef.current ? 'Try Again' : 'Scan Another Photo'}
            </button>
            <button className="contacts-btn" onClick={() => fileInputRef.current?.click()}>
              Pick Different Photo
            </button>
            <button className="contacts-btn" onClick={startManualBill}>
              Enter Manually
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'scanning') {
    const quickAddSuggestions = getQuickAddSuggestions(people.map(p => p.name));
    const myName = getUserIdentity();

    return (
      <div className="tabby-simple">
        <HomeButton />
        <div className="scanning-container">
          <div className="scan-icon">📸</div>
          <h2>Scanning Receipt</h2>
          <p style={{ marginBottom: '32px' }}>{scanProgress || 'Processing...'}</p>

          {/* People Management During Scan */}
          <div style={{
            maxWidth: '400px',
            width: '100%',
            marginTop: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--tb-ink)'
            }}>
              Who's splitting? (Add while we scan)
            </h3>

            {/* People circles */}
            {people.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
                justifyContent: 'center'
              }}>
                {people.map((person, index) => (
                  <div key={person.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: getPersonColor(index),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: 'var(--tb-ink)'
                    }}>
                      {person.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--tb-ink-muted)' }}>
                      {person.name} ({getPersonHeadcount(person)}x)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Suggestions */}
            {quickAddSuggestions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--tb-ink-muted)', marginBottom: '8px' }}>
                  Quick Add
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {quickAddSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.name}
                      onClick={() => handleAddPerson(suggestion.name)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--tb-accent-tint)',
                        border: '1px solid var(--tb-accent-border)',
                        borderRadius: '20px',
                        color: 'var(--tb-accent)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      + {suggestion.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input field */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Type a name..."
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newPersonName.trim()) {
                    handleAddPerson();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--tb-surface-2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'var(--tb-ink)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="x"
                value={newPersonHeadcount}
                onChange={(e) => setNewPersonHeadcount(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newPersonName.trim()) {
                    handleAddPerson();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 12px',
                  background: 'var(--tb-surface-2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'var(--tb-ink)',
                  fontSize: '16px',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleAddPerson()}
                disabled={!newPersonName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: newPersonName.trim() ? 'var(--tb-accent-tint)' : 'var(--tb-surface-2)',
                  border: `1px solid ${newPersonName.trim() ? 'var(--tb-accent)' : 'var(--tb-border)'}`,
                  borderRadius: '12px',
                  color: newPersonName.trim() ? 'var(--tb-accent)' : 'var(--tb-ink-dim)',
                  fontSize: '15px',
                  cursor: newPersonName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                Add Person
              </button>
              {!myName && (
                <button
                  onClick={() => {
                    const name = prompt('What should we call you?');
                    if (name && name.trim()) {
                      setUserIdentity(name.trim());
                      handleAddPerson(name.trim());
                    }
                  }}
                  style={{
                    padding: '12px',
                    background: 'var(--tb-surface-2)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'var(--tb-ink-muted)',
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  👤 Me
                </button>
              )}
            </div>

            <p style={{
              fontSize: '12px',
              color: 'var(--tb-ink-dim)',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              You can add more people later
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'editName') {
    const handleContinue = async () => {
      if (!restaurantName.trim() || !billToken) return;

      // Persist restaurant name to database
      try {
        await updateReceiptMetadata(billToken, {
          place: restaurantName.trim()
        });
        console.log('[TabbySimple] Restaurant name saved:', restaurantName.trim());
      } catch (error) {
        console.error('[TabbySimple] Failed to save restaurant name:', error);
      }

      if (people.length > 0) {
        // People were added during scan, go to assign
        navigate(`/receipt/${billToken}/edit`);
      } else {
        // No people yet, go to people step
        navigate(`/receipt/${billToken}/people`);
      }
    };

    return (
      <div className="tabby-simple">
        <HomeButton />
        <div className="scanning-container">
          <h2>Where did you eat?</h2>
          <p className="subtitle">We couldn't detect the restaurant name</p>
          <input
            type="text"
            className="restaurant-name-input"
            placeholder="Enter restaurant name"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleContinue();
              }
            }}
            autoFocus
          />
          <button
            className="continue-btn"
            onClick={handleContinue}
            disabled={!restaurantName.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 'people') {
    const quickAddSuggestions = getQuickAddSuggestions(people.map(p => p.name));
    const myName = getUserIdentity();
    const isScanning = !!scanProgress;

    return (
      <div className="tabby-simple">
        <HomeButton />
        {/* Always show header to prevent layout shift */}
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={{ flex: 1 }}>
              {isEditingRestaurantName ? (
                <input
                  type="text"
                  value={editableRestaurantName}
                  onChange={(e) => setEditableRestaurantName(e.target.value)}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter' && editableRestaurantName.trim()) {
                      setRestaurantName(editableRestaurantName.trim());
                      setIsEditingRestaurantName(false);

                      // Persist to database
                      if (billToken) {
                        try {
                          await updateReceiptMetadata(billToken, {
                            place: editableRestaurantName.trim()
                          });
                          console.log('[TabbySimple] Restaurant name updated successfully');
                        } catch (error) {
                          console.error('[TabbySimple] Failed to update restaurant name:', error);
                        }
                      }
                    }
                  }}
                  onBlur={async () => {
                    if (editableRestaurantName.trim()) {
                      setRestaurantName(editableRestaurantName.trim());
                      setIsEditingRestaurantName(false);

                      // Persist to database
                      if (billToken) {
                        try {
                          await updateReceiptMetadata(billToken, {
                            place: editableRestaurantName.trim()
                          });
                          console.log('[TabbySimple] Restaurant name updated successfully');
                        } catch (error) {
                          console.error('[TabbySimple] Failed to update restaurant name:', error);
                        }
                      }
                    } else {
                      setIsEditingRestaurantName(false);
                    }
                  }}
                  autoFocus
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--tb-border-strong)',
                    color: 'var(--tb-ink)',
                    fontSize: '20px',
                    fontWeight: '700',
                    padding: '0 0 4px 0',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <h1
                  onClick={() => {
                    if (restaurantName) {
                      setEditableRestaurantName(restaurantName);
                      setIsEditingRestaurantName(true);
                    }
                  }}
                  style={{
                    opacity: restaurantName ? 1 : 0.4,
                    transition: 'opacity 0.3s ease',
                    cursor: restaurantName ? 'pointer' : 'default'
                  }}
                  title={restaurantName ? 'Click to edit' : ''}
                >
                  {restaurantName || 'Restaurant name...'}
                  {restaurantName && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                      color: 'var(--tb-ink-dim)',
                      fontWeight: '400'
                    }}>✏️</span>
                  )}
                </h1>
              )}
              <p className="date">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={{ padding: '12px 20px 0' }}>
          <ProgressSteps
            current={1}
            labels={['Scan', 'People', 'Assign', 'Done']}
          />
        </div>

        {mathReviewCard}

        <div className="people-step-container">
          <div className="people-circles">
            {people.map((person, index) => (
              <div key={person.id} className="person-circle-large">
                <div className="person-avatar-large" style={{ background: getPersonColor(index) }}>
                  {person.name[0].toUpperCase()}
                </div>
                <span className="person-name">{person.name}</span>
              </div>
            ))}
          </div>

          <h2 className="add-people-title">Add People</h2>

          {/* Quick Add from Recent */}
          {quickAddSuggestions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--tb-ink-muted)', marginBottom: '12px', fontWeight: '500' }}>
                Quick Add
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {quickAddSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion.name}
                    onClick={() => handleAddPerson(suggestion.name)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--tb-accent-tint)',
                      border: '1px solid var(--tb-accent-border)',
                      borderRadius: '20px',
                      color: 'var(--tb-accent)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    + {suggestion.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current People List */}
          {people.length > 0 && (
            <div className="people-list">
              {people.map((person, index) => (
                <div key={person.id} className="people-list-item">
                  <div className="person-avatar-small" style={{ background: getPersonColor(index) }}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className="person-name-text">
                    {person.name} ({getPersonHeadcount(person)}x)
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openPersonEditor(person)}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--tb-surface-2)',
                        border: '1px solid var(--tb-border-strong)',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => {
                        const updatedPeople = people.filter(p => p.id !== person.id);
                        setPeople(updatedPeople);

                        // Persist to database (debounced to prevent race conditions)
                        debouncedPersist(billToken, updatedPeople, items);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="add-people-actions">
            <button
              className="enter-manually-btn"
              onClick={() => setShowAddPerson(true)}
            >
              ⌨️ Enter Name
            </button>
            {!myName && (
              <button
                className="add-from-contacts-btn"
                onClick={() => {
                  const name = prompt('What should we call you?');
                  if (name && name.trim()) {
                    setNewPersonName(name.trim());
                    setNewPersonHeadcount('1');
                    setUserIdentity(name.trim());
                    handleAddPerson(name.trim());
                  }
                }}
              >
                👤 Set as Me
              </button>
            )}
          </div>
        </div>

        <div className="bottom-nav" style={{ flexDirection: 'column', alignItems: 'center' }}>
          <button
            className="continue-to-assign-btn"
            onClick={() => {
              console.log('[TabbySimple] Continue button clicked', { billToken, peopleCount: people.length });
              if (billToken) {
                // Read per-item shares straight from the computeTotals result.
                const peopleWithShares = people.map(person => {
                  const breakdown = getPersonBreakdown(billTotals, person.id);
                  const itemShares = (breakdown?.items ?? []).map(it => ({
                    itemId: it.item_id,
                    weight: it.weight,
                    shareAmount: it.share_amount
                  }));
                  return {
                    id: person.id,
                    name: person.name,
                    headcount: getPersonHeadcount(person),
                    items: person.items,
                    itemShares,
                    total: getPersonTotal(billTotals, person.id),
                    venmo_handle: person.venmo_handle ?? null,
                    personal_credit: person.personal_credit,
                    credit_note: person.credit_note
                  };
                });

                // Save current state to localStorage before navigating
                const shareData = {
                  billToken,
                  people: peopleWithShares,
                  subtotal: billTotals?.subtotal ?? 0,
                  tax,
                  tip,
                  discount,
                  serviceFee,
                  total: billTotals?.grand_total ?? 0,
                  assignments: buildPersistedAssignments(items)
                };
                console.log('[TabbySimple] Saving to localStorage with itemShares:', peopleWithShares.map(p => ({ name: p.name, itemShares: p.itemShares })));
                localStorage.setItem(`bill-share-${billToken}`, JSON.stringify(shareData));
                console.log('[TabbySimple] Navigating to:', `/receipt/${billToken}/edit`);
                navigate(`/receipt/${billToken}/edit`);
              } else {
                console.log('[TabbySimple] No billToken, using setStep');
                setStep('assign');
              }
            }}
            disabled={people.length === 0 || isScanning}
          >
            {isScanning ? `📸 ${scanProgress}` : 'Continue to Assign Items'}
          </button>
        </div>

        {/* Add Person Modal */}
        {showAddPerson && (
          <div className="modal-overlay" onClick={() => {
            setShowAddPerson(false);
            setNewPersonName('');
            setNewVenmoHandle('');
            setNewPersonHeadcount('1');
          }}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-people-title" onClick={(e) => e.stopPropagation()}>
              <h3 id="add-people-title">Add People</h3>
              <input
                type="text"
                placeholder="Enter name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                autoFocus
              />
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={newPersonHeadcount}
                onChange={(e) => setNewPersonHeadcount(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                placeholder="Headcount"
              />
              <input
                type="text"
                placeholder="Venmo handle (optional)"
                value={newVenmoHandle}
                onChange={(e) => setNewVenmoHandle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <div className="modal-actions">
                <button onClick={() => handleAddPerson()} disabled={!newPersonName.trim()}>
                  Add Person
                </button>
              </div>
            </div>
          </div>
        )}
        {editPersonModal}
      </div>
    );
  }

  return (
    <div className="tabby-simple">
      <HomeButton />
      {/* Header */}
      <div className="header">
        <div>
          {isEditingRestaurantName ? (
            <input
              type="text"
              value={editableRestaurantName}
              onChange={(e) => setEditableRestaurantName(e.target.value)}
              onKeyPress={async (e) => {
                if (e.key === 'Enter' && editableRestaurantName.trim()) {
                  setRestaurantName(editableRestaurantName.trim());
                  setIsEditingRestaurantName(false);

                  // Persist to database
                  if (billToken) {
                    try {
                      await updateReceiptMetadata(billToken, {
                        place: editableRestaurantName.trim()
                      });
                      console.log('[TabbySimple] Restaurant name updated successfully');
                    } catch (error) {
                      console.error('[TabbySimple] Failed to update restaurant name:', error);
                    }
                  }
                }
              }}
              onBlur={async () => {
                if (editableRestaurantName.trim()) {
                  setRestaurantName(editableRestaurantName.trim());
                  setIsEditingRestaurantName(false);

                  // Persist to database
                  if (billToken) {
                    try {
                      await updateReceiptMetadata(billToken, {
                        place: editableRestaurantName.trim()
                      });
                      console.log('[TabbySimple] Restaurant name updated successfully');
                    } catch (error) {
                      console.error('[TabbySimple] Failed to update restaurant name:', error);
                    }
                  }
                } else {
                  setIsEditingRestaurantName(false);
                  setEditableRestaurantName(restaurantName);
                }
              }}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--tb-border-strong)',
                color: 'var(--tb-ink)',
                fontSize: '20px',
                fontWeight: '700',
                padding: '0 0 4px 0',
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <button
              type="button"
              className="header-title-btn"
              onClick={() => {
                setEditableRestaurantName(restaurantName);
                setIsEditingRestaurantName(true);
              }}
              title="Click to edit"
            >
              <span className="header-title-text">{restaurantName || 'Untitled'}</span>
            </button>
          )}
          <p className="date">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="header-buttons">
          <button
            className="header-edit-btn"
            onClick={() => setShowUnifiedEdit(true)}
            aria-label="Edit bill"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{ padding: '12px 20px 0' }}>
        <ProgressSteps
          current={allItemsAssigned ? 3 : 2}
          labels={['Scan', 'People', 'Assign', 'Done']}
        />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {mathReviewCard}
        {/* Combined Items and People View */}
        <div className="combined-view">
          {/* Unassigned Items Section */}
          {unassignedItems.length > 0 && (
            <div className="unassigned-section">
              <h3 className="section-title">Unassigned Items</h3>
              <p style={{
                fontSize: '13px',
                color: 'var(--tb-ink-muted)',
                margin: '-4px 4px 12px 4px',
                fontWeight: '400'
              }}>
                Drag to a person, or tap to choose who (and split)
              </p>
              <div className="items-grid">
                {unassignedItems.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`item-card ${draggedItem === item.id ? 'dragging' : ''} ${showDragTooltip && index === 0 ? 'spotlight-hint' : ''}`}
                    draggable
                    aria-label={`Assign or split ${item.name}, ${item.price.toFixed(2)} dollars`}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onPointerDown={(e) => handlePointerDragStart(e, item.id)}
                    onPointerMove={handlePointerDragMove}
                    onPointerUp={handlePointerDragEnd}
                    onPointerCancel={handlePointerDragCancel}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedItem(item);
                      setSplitPeople([]);
                      setShowSplitItem(true);
                    }}
                    onClick={() => {
                      if (suppressNextClickRef.current) {
                        suppressNextClickRef.current = false;
                        return;
                      }
                      // Desktop: drag suppresses click when the user actually drags.
                      // Touch: tap opens the assign/split picker since HTML5 DnD
                      // doesn't exist on touch.
                      setSelectedItem(item);
                      setSplitPeople([]);
                      setShowSplitItem(true);
                    }}
                    style={{ position: 'relative' }}
                  >
                    {showDragTooltip && index === 0 && (
                      <div className="drag-tooltip">
                        👆 Drag me to a person
                      </div>
                    )}
                    <span className="item-emoji">
                      <FoodIcon itemName={item.name} emoji={item.emoji} size={24} />
                    </span>
                    <div className="item-details">
                      <span className="item-name">
                        {item.name}
                        {item.quantity && item.quantity > 1 && (
                          <span className="item-qty">×{item.quantity}</span>
                        )}
                      </span>
                      <span className="item-price">${item.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* People's Items Section */}
          {people.length > 0 && (
            <>
              <h3 className="section-title">Assigned Items</h3>
              <div className="people-items-section">
                {people.map((person) => {
                const personIndex = people.findIndex(p => p.id === person.id);
                const personItems = itemsByPersonId.get(person.id) ?? [];

                // Get computed breakdown from billTotals (single source of truth)
                const breakdown = getPersonBreakdown(billTotals, person.id);
                const itemsSubtotal = breakdown?.subtotal ?? 0;
                const personDiscount = breakdown?.discount_share ?? 0;
                const personServiceFee = breakdown?.service_fee_share ?? 0;
                const personTax = breakdown?.tax_share ?? 0;
                const personTip = breakdown?.tip_share ?? 0;

                return (
                  <div
                    key={person.id}
                    className={`person-section ${dragOverPerson === person.id ? 'drag-over-section' : ''}`}
                    style={{
                      ['--person-color' as string]: getPersonColor(personIndex),
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(person.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, person.id)}
                    data-person-id={person.id}
                    role="group"
                    aria-label={`${person.name} assigned items drop zone`}
                  >
                    <div className="person-header">
                      <span className="person-name-large">{person.name}</span>
                      <span className="person-total">${getPersonTotal(billTotals, person.id).toFixed(2)}</span>
                      {breakdown && breakdown.personal_credit > 0 && (
                        <span className="credit-chip" title={breakdown.credit_note || 'Personal credit'}>
                          −${breakdown.personal_credit.toFixed(2)} {breakdown.credit_note || 'credit'}
                        </span>
                      )}
                      <div className="person-actions">
                        <button
                          className="credit-btn"
                          onClick={(e) => { e.stopPropagation(); handleEditCredit(person.id); }}
                          aria-label={`${breakdown && breakdown.personal_credit > 0 ? 'Edit' : 'Add'} personal credit for ${person.name}`}
                        >
                          {breakdown && breakdown.personal_credit > 0 ? '✏️ Credit' : '+ Credit'}
                        </button>
                        {person.venmo_handle && getPersonTotal(billTotals, person.id) > 0 && (
                          <button
                            className="venmo-request-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVenmoRequest({
                                handle: person.venmo_handle!,
                                amount: getPersonTotal(billTotals, person.id),
                                note: `${restaurantName || 'Tabby'} split`
                              });
                            }}
                            aria-label={`Request ${getPersonTotal(billTotals, person.id).toFixed(2)} dollars from ${person.name} via Venmo`}
                          >
                            💸 Request
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="person-items">
                      {personItems.length === 0 ? (
                        <div style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: 'var(--tb-ink-dim)',
                          fontSize: '14px',
                          fontStyle: 'italic'
                        }}>
                          Drag items here
                        </div>
                      ) : (
                        personItems.map(item => {
                        const splitParticipants = getItemParticipants(item);
                        const splitDenominator = getItemShareDenominator(item, people);
                        const splitWeight = getPersonShareWeight(item, person.id, people);
                        const isSplit = splitParticipants.length > 1;
                        const sharePrice = isSplit && splitDenominator > 0
                          ? (item.price * splitWeight) / splitDenominator
                          : item.price;

                        return (
                          <button
                            type="button"
                            key={item.id}
                            className="person-item"
                            style={{ borderLeft: `3px solid ${getPersonColor(personIndex)}` }}
                            draggable
                            aria-label={`Remove ${item.name} from ${person.name}`}
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onPointerDown={(e) => handlePointerDragStart(e, item.id)}
                            onPointerMove={handlePointerDragMove}
                            onPointerUp={handlePointerDragEnd}
                            onPointerCancel={handlePointerDragCancel}
                            onClick={() => {
                              if (suppressNextClickRef.current) {
                                suppressNextClickRef.current = false;
                                return;
                              }
                              // Unassign on click
                              let updatedItems;
                              if (isSplit) {
                                // Remove this person from splitBetween
                                const newSplitBetween = item.splitBetween!.filter(id => id !== person.id);
                                if (newSplitBetween.length === 1) {
                                  // If only one person left, make it non-split
                                  updatedItems = items.map(i =>
                                    i.id === item.id ? { ...i, splitBetween: undefined, assignedTo: newSplitBetween[0] } : i
                                  );
                                } else if (newSplitBetween.length === 0) {
                                  // If no one left, unassign completely
                                  updatedItems = items.map(i =>
                                    i.id === item.id ? { ...i, splitBetween: undefined, assignedTo: undefined } : i
                                  );
                                } else {
                                  // Update splitBetween array
                                  updatedItems = items.map(i =>
                                    i.id === item.id ? { ...i, splitBetween: newSplitBetween, assignedTo: newSplitBetween[0] } : i
                                  );
                                }
                              } else {
                                updatedItems = items.map(i =>
                                  i.id === item.id ? { ...i, assignedTo: undefined } : i
                                );
                              }
                              setItems(updatedItems);

                              const updatedPeople = people.map(p => {
                                if (p.id === person.id) {
                                  const newItems = p.items.filter(id => id !== item.id);
                                  const remainingItemsData = updatedItems.filter(i => newItems.includes(i.id));

                                  // Recalculate total
                                  let newSubtotal = 0;
                                  remainingItemsData.forEach(ri => {
                                    const denominator = getItemShareDenominator(ri, updatedPeople);
                                    const weight = getPersonShareWeight(ri, person.id, updatedPeople);

                                    if (denominator > 0 && weight > 0) {
                                      newSubtotal += (ri.price * weight) / denominator;
                                    } else {
                                      newSubtotal += ri.price;
                                    }
                                  });
                                  const prevSubtotal = billTotals?.subtotal ?? 0;
                                  const newProportion = prevSubtotal > 0 ? newSubtotal / prevSubtotal : 0;
                                  // Include discount and serviceFee, and round to avoid floating-point errors
                                  const newTotal = Math.round((newSubtotal - (discount * newProportion) + (serviceFee * newProportion) + (tax * newProportion) + (tip * newProportion)) * 100) / 100;

                                  return {
                                    ...p,
                                    items: newItems,
                                    total: newTotal
                                  };
                                }
                                return p;
                              });
                              setPeople(updatedPeople);

                              // Persist to database (debounced to prevent race conditions)
                              debouncedPersist(billToken, updatedPeople, updatedItems);
                            }}
                          >
                            <span className="item-emoji-small">
                              <FoodIcon itemName={item.name} emoji={item.emoji} size={18} />
                            </span>
                            <span className="item-name-small">
                              {isSplit && splitWeight > 0 ? `${splitWeight}/${splitDenominator} ` : ''}
                              {item.name}
                              {item.quantity && item.quantity > 1 && (
                                <span className="item-qty"> ×{item.quantity}</span>
                              )}
                            </span>
                            <span className="item-price-small">${sharePrice.toFixed(2)}</span>
                          </button>
                        );
                      })
                      )}
                    </div>
                    <div className="person-breakdown">
                      <div className="breakdown-row">
                        <span>Items</span>
                        <span>${itemsSubtotal.toFixed(2)}</span>
                      </div>
                      {personDiscount > 0.01 && (
                        <div className="breakdown-row">
                          <span>Discount</span>
                          <span>-${personDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {personServiceFee > 0.01 && (
                        <div className="breakdown-row">
                          <span>Service Fee</span>
                          <span>${personServiceFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="breakdown-row">
                        <span>Tax</span>
                        <span>${personTax.toFixed(2)}</span>
                      </div>
                      <div className="breakdown-row">
                        <span>Tip</span>
                        <span>${personTip.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}

        </div>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>${(billTotals?.subtotal ?? 0).toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>Tax:</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>Tip:</span>
            <span>${tip.toFixed(2)}</span>
          </div>
          <div className="total-row total">
            <span>Total:</span>
            <span>${(billTotals?.grand_total ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              className="toast"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ borderLeft: `3px solid ${toast.color}` }}
            >
              <span>{toast.emoji}</span>
              <span className="toast-text">{toast.item}</span>
              <span style={{ color: 'var(--tb-ink-dim)' }}>&rarr;</span>
              <span style={{ color: toast.color, fontWeight: 600 }}>{toast.person}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="celebration-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Background pulse */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--tb-white)',
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.05, 0] }}
              transition={{ duration: 0.6 }}
            />
            {/* Particle burst */}
            {Array.from({ length: 30 }).map((_, i) => {
              const angle = (i / 30) * Math.PI * 2;
              const distance = 80 + Math.random() * 120;
              const size = 4 + Math.random() * 8;
              return (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: PERSON_COLORS[i % PERSON_COLORS.length],
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.8 + Math.random() * 0.4, delay: Math.random() * 0.15 }}
                />
              );
            })}
            {/* Celebration text */}
            <motion.div
              style={{
                position: 'relative',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--tb-ink)',
                textAlign: 'center',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              Bill split!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="status-text">
          {scanAudit && !totalsVerified && allItemsAssigned
            ? 'Review math before sharing'
            : unassignedItems.length > 0
            ? `${unassignedItems.length} items to assign`
            : 'Ready to share!'
          }
        </div>

        <button
          className={`share-btn ${canShare ? 'share-ready' : ''}`}
          disabled={!canShare}
          onClick={() => setShowShareReceipt(true)}
          aria-label="Share bill"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8.68 13.34L15.32 9.66M8.68 10.66L15.32 14.34M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Add Person Modal */}
      {showAddPerson && (
        <div className="modal-overlay" onClick={() => {
          setShowAddPerson(false);
          setNewPersonName('');
          setNewVenmoHandle('');
          setNewPersonHeadcount('1');
        }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-people-title-assign" onClick={(e) => e.stopPropagation()}>
            <h3 id="add-people-title-assign">Add People</h3>

            {/* Quick Add from Recent */}
            {(() => {
              const suggestions = getQuickAddSuggestions(people.map(p => p.name));
              return suggestions.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--tb-ink-muted)', marginBottom: '8px' }}>
                    Quick Add
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {suggestions.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleAddPerson(suggestion.name)}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--tb-accent-tint)',
                          border: '1px solid var(--tb-accent-border)',
                          borderRadius: '16px',
                          color: 'var(--tb-accent)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        + {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <input
              type="text"
              placeholder="Enter name"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
              autoFocus
            />
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="Headcount"
              value={newPersonHeadcount}
              onChange={(e) => setNewPersonHeadcount(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
            />
            <input
              type="text"
              placeholder="Venmo handle (optional)"
              value={newVenmoHandle}
              onChange={(e) => setNewVenmoHandle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="modal-actions">
              <button onClick={() => handleAddPerson()} disabled={!newPersonName.trim()}>
                Add Person
              </button>
            </div>
          </div>
        </div>
      )}

      {editPersonModal}

      {creditPersonId && (
        <div className="modal-overlay" onClick={() => setCreditPersonId(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="credit-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="credit-title">Personal credit</h3>
            <p className="modal-help-text">
              {people.find(person => person.id === creditPersonId)?.name ?? 'This person'} gets this amount subtracted after tax, tip, and fees.
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleSaveCredit}>
                Save Credit
              </button>
              <button className="contacts-btn" onClick={() => setCreditPersonId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign/Split Item Modal */}
      {showSplitItem && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSplitItem(false)}>
          <div className="modal split-modal" role="dialog" aria-modal="true" aria-labelledby="split-item-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="split-item-title">Assign {selectedItem.name}</h3>
            <div className="split-item-badge">
              <span className="item-emoji">
                <FoodIcon itemName={selectedItem.name} emoji={selectedItem.emoji} size={24} />
              </span>
              <span>{selectedItem.name}</span>
              <span className="item-price">${selectedItem.price.toFixed(2)}</span>
            </div>
            <p style={{ color: 'var(--tb-ink-muted)', marginBottom: '16px', fontSize: '14px' }}>
              Choose one person to assign it, or several people to split it.
            </p>
            <div className="split-people-list">
              {people.map((person, index) => (
                <label
                  key={person.id}
                  className="split-person-option"
                  onClick={() => {
                    setSplitPeople(prev =>
                      prev.includes(person.id)
                        ? prev.filter(id => id !== person.id)
                        : [...prev, person.id]
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={splitPeople.includes(person.id)}
                    onChange={() => {}}
                  />
                  <div className="person-avatar-small" style={{ background: getPersonColor(index) }}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <span>{person.name}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  if (splitPeople.length === 1) {
                    assignItemToPerson(selectedItem.id, splitPeople[0]);
                    setShowSplitItem(false);
                    setSelectedItem(null);
                    setSplitPeople([]);
                  } else if (splitPeople.length >= 2) {
                    // Mark item as split and assigned
                    const updatedItems = items.map(item =>
                      item.id === selectedItem.id
                        ? { ...item, assignedTo: splitPeople[0], splitBetween: splitPeople }
                        : item
                    );
                    setItems(updatedItems);

                    // Add item to all selected people - totals computed by useBillTotals hook
                    const updatedPeople = people.map(person => {
                      if (splitPeople.includes(person.id)) {
                        const newItems = [...new Set([...person.items, selectedItem.id])];
                        return {
                          ...person,
                          items: newItems,
                          total: 0 // Will be computed by billTotals hook
                        };
                      }
                      return person;
                    });
                    setPeople(updatedPeople);

                    // Persist to database (debounced to prevent race conditions)
                    debouncedPersist(billToken, updatedPeople, updatedItems);

                    setShowSplitItem(false);
                    setSelectedItem(null);
                    setSplitPeople([]);
                  }
                }}
                disabled={splitPeople.length < 1}
              >
                {splitPeople.length === 0
                  ? 'Choose People'
                  : splitPeople.length === 1
                    ? `Assign to ${people.find(person => person.id === splitPeople[0])?.name ?? 'Person'}`
                    : `Split Between ${
                      splitPeople.reduce((sum, personId) => {
                        const person = people.find(p => p.id === personId);
                        return sum + getPersonHeadcount(person);
                      }, 0)
                    } People`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage People Modal */}
      {showManagePeople && (
        <div className="modal-overlay" onClick={() => setShowManagePeople(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Manage People</h3>
            <div className="people-list">
              {people.map((person, index) => (
                <div key={person.id} className="people-list-item">
                  <div className="person-avatar-small" style={{ background: getPersonColor(index) }}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className="person-name-text">{person.name} ({getPersonHeadcount(person)}x)</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openPersonEditor(person)}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--tb-surface-2)',
                        border: '1px solid var(--tb-border-strong)',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => {
                        // Remove person and unassign their items
                        const updatedPeople = people.filter(p => p.id !== person.id);
                        const updatedItems = items.map(item =>
                          removePersonFromItem(item, person.id)
                        );
                        setPeople(updatedPeople);
                        setItems(updatedItems);

                        // Persist to database (debounced to prevent race conditions)
                        debouncedPersist(billToken, updatedPeople, updatedItems);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => {
                setShowManagePeople(false);
                setShowAddPerson(true);
              }}>
                Add Person
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Overview Modal */}
      {showBillOverview && (
        <div className="modal-overlay" onClick={() => setShowBillOverview(false)}>
          <div className="modal bill-overview-modal" onClick={(e) => e.stopPropagation()}>
            {isEditingReceipt ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <button
                    onClick={() => setIsEditingReceipt(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tb-accent)',
                      fontSize: '24px',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1
                    }}
                  >
                    ←
                  </button>
                  <h3 style={{ margin: 0 }}>Edit Receipt</h3>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--tb-ink-muted)' }}>
                    LINE ITEMS
                  </h4>
                  {editableItems.map((item, index) => (
                    <div key={item.id} style={{ marginBottom: '16px', padding: '12px', background: 'var(--tb-surface-2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={item.emoji}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[index] = { ...newItems[index], emoji: e.target.value };
                            setEditableItems(newItems);
                          }}
                          style={{
                            width: '50px',
                            padding: '8px',
                            background: 'var(--tb-surface-2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'var(--tb-ink)',
                            fontSize: '18px',
                            textAlign: 'center'
                          }}
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[index] = { ...newItems[index], name: e.target.value };
                            setEditableItems(newItems);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'var(--tb-surface-2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'var(--tb-ink)',
                            fontSize: '15px'
                          }}
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...editableItems];
                            newItems[index] = { ...newItems[index], price: parseFloat(e.target.value) || 0 };
                            setEditableItems(newItems);
                          }}
                          style={{
                            width: '90px',
                            padding: '8px',
                            background: 'var(--tb-surface-2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'var(--tb-ink)',
                            fontSize: '15px',
                            fontFamily: "'Courier New', 'Courier', monospace",
                            textAlign: 'right'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditableItems(editableItems.filter((_, i) => i !== index));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'var(--tb-danger-tint)',
                          border: '1px solid var(--tb-danger-border)',
                          borderRadius: '6px',
                          color: 'var(--tb-danger)',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove Item
                      </button>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button onClick={handleSaveReceiptEdits}>
                    Save Changes
                  </button>
                  <button
                    className="contacts-btn"
                    onClick={() => {
                      setIsEditingReceipt(false);
                      setEditableItems([...items]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Restaurant Name Header */}
                <div style={{ marginBottom: '24px' }}>
                  {isEditingRestaurantName ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editableRestaurantName}
                        onChange={(e) => setEditableRestaurantName(e.target.value)}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && editableRestaurantName.trim() && billToken) {
                            setRestaurantName(editableRestaurantName.trim());
                            setIsEditingRestaurantName(false);

                            // Persist to database
                            try {
                              await updateReceiptMetadata(billToken, {
                                place: editableRestaurantName.trim()
                              });
                              console.log('[TabbySimple] Restaurant name updated successfully');
                            } catch (error) {
                              console.error('[TabbySimple] Failed to update restaurant name:', error);
                            }
                          }
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: 'var(--tb-surface-2)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'var(--tb-ink)',
                          fontSize: '20px',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (editableRestaurantName.trim() && billToken) {
                            setRestaurantName(editableRestaurantName.trim());
                            setIsEditingRestaurantName(false);

                            // Persist to database
                            try {
                              await updateReceiptMetadata(billToken, {
                                place: editableRestaurantName.trim()
                              });
                              console.log('[TabbySimple] Restaurant name updated successfully');
                            } catch (error) {
                              console.error('[TabbySimple] Failed to update restaurant name:', error);
                            }
                          }
                        }}
                        style={{
                          background: 'var(--tb-accent)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'var(--tb-ink)',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingRestaurantName(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'var(--tb-ink-muted)',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>{restaurantName}</h3>
                        <p className="date" style={{ color: 'var(--tb-ink-muted)', margin: '4px 0 0 0' }}>
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditableRestaurantName(restaurantName);
                          setIsEditingRestaurantName(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--tb-accent)',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '4px 8px'
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

            {/* Receipt Link Section */}
            {billToken && (
              <div className="bill-overview-section" style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--tb-ink-muted)' }}>
                  RECEIPT LINK
                </h4>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--tb-accent-tint)',
                  border: '1px solid var(--tb-accent-border)',
                  borderRadius: '8px'
                }}>
                  <input
                    readOnly
                    value={`${window.location.origin}/receipt/${billToken}`}
                    onClick={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tb-accent)',
                      fontSize: '13px',
                      fontFamily: "'Courier New', 'Courier', monospace",
                      outline: 'none',
                      cursor: 'text'
                    }}
                  />
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/receipt/${billToken}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        // Visual feedback
                        const btn = document.activeElement as HTMLButtonElement;
                        const originalText = btn.textContent;
                        btn.textContent = 'Copied!';
                        btn.style.color = 'var(--tb-success)';
                        setTimeout(() => {
                          btn.textContent = originalText;
                          btn.style.color = 'var(--tb-accent)';
                        }, 2000);
                      } catch (error) {
                        console.error('Error copying to clipboard:', error);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tb-accent)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--tb-ink-muted)',
                  marginTop: '8px',
                  marginBottom: 0
                }}>
                  Share this link to view the receipt anytime
                </p>
              </div>
            )}

            <div className="bill-overview-section">
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--tb-ink-muted)' }}>
                PEOPLE ({people.length})
              </h4>
              {people.map((person, index) => (
                <div key={person.id} className="bill-overview-person">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="person-avatar-small" style={{ background: getPersonColor(index) }}>
                      {person.name[0].toUpperCase()}
                    </div>
                    <span>{person.name}</span>
                  </div>
                  <span style={{ fontWeight: '600' }}>${getPersonTotal(billTotals, person.id).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bill-overview-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--tb-ink-muted)', margin: 0 }}>
                  BILL TOTALS
                </h4>
                {!isEditingBill && (
                  <button
                    onClick={() => {
                      setEditableSubtotal((billTotals?.subtotal ?? 0).toFixed(2));
                      setEditableTax(tax.toFixed(2));
                      setEditableTip(tip.toFixed(2));
                      setEditableDiscount(discount.toFixed(2));
                      setEditableServiceFee(serviceFee.toFixed(2));
                      setIsEditingBill(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tb-accent)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingBill ? (
                <>
                  <div className="bill-overview-row" style={{ marginBottom: '12px' }}>
                    <span>Subtotal</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editableSubtotal}
                      readOnly
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'var(--tb-surface-2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right',
                        opacity: 0.65
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ marginBottom: '12px' }}>
                    <span>Tax</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editableTax}
                      onChange={(e) => setEditableTax(e.target.value)}
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'var(--tb-surface-2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ marginBottom: '12px' }}>
                    <span>Tip</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editableTip}
                      onChange={(e) => setEditableTip(e.target.value)}
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'var(--tb-surface-2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ marginBottom: '12px' }}>
                    <span>Discount</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editableDiscount}
                      onChange={(e) => setEditableDiscount(e.target.value)}
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'var(--tb-surface-2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ marginBottom: '12px' }}>
                    <span>Service fee</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editableServiceFee}
                      onChange={(e) => setEditableServiceFee(e.target.value)}
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'var(--tb-surface-2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--tb-ink)',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ borderTop: '1px solid var(--tb-border)', paddingTop: '12px', marginTop: '12px', fontWeight: '600' }}>
                    <span>Total</span>
                    <span>${((billTotals?.subtotal ?? 0) - (parseFloat(editableDiscount) || 0) + (parseFloat(editableServiceFee) || 0) + (parseFloat(editableTax) || 0) + (parseFloat(editableTip) || 0)).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bill-overview-row">
                    <span>Subtotal</span>
                    <span>${(billTotals?.subtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="bill-overview-row">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="bill-overview-row">
                    <span>Tip</span>
                    <span>${tip.toFixed(2)}</span>
                  </div>
                  {discount > 0.01 && (
                    <div className="bill-overview-row">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {serviceFee > 0.01 && (
                    <div className="bill-overview-row">
                      <span>Service fee</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="bill-overview-row" style={{ borderTop: '1px solid var(--tb-border)', paddingTop: '12px', marginTop: '12px', fontWeight: '600' }}>
                    <span>Total</span>
                    <span>${(billTotals?.grand_total ?? 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              {isEditingBill ? (
                <>
                  <button onClick={handleSaveBillEdits}>
                    Save Changes
                  </button>
                  <button
                    className="contacts-btn"
                    onClick={() => {
                      setIsEditingBill(false);
                      setEditableSubtotal((billTotals?.subtotal ?? 0).toFixed(2));
                      setEditableTax(tax.toFixed(2));
                      setEditableTip(tip.toFixed(2));
                      setEditableDiscount(discount.toFixed(2));
                      setEditableServiceFee(serviceFee.toFixed(2));
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingReceipt(true)}
                    className="contacts-btn"
                  >
                    Edit Receipt Items
                  </button>
                  <button
                    onClick={async () => {
                    console.log('Share button clicked, billToken:', billToken);
                    if (!billToken) {
                      alert('No bill token found. Please try scanning again.');
                      return;
                    }

                    try {
                      // Prepare share data
                      const shareData = {
                        billToken,
                        people: people.map(person => ({
                          id: person.id,
                          name: person.name,
                          headcount: getPersonHeadcount(person),
                          items: person.items,
                          total: getPersonTotal(billTotals, person.id), // Use computed total from hook
                          venmo_handle: person.venmo_handle ?? null,
                          personal_credit: person.personal_credit,
                          credit_note: person.credit_note
                        })),
                        assignments: buildPersistedAssignments(items)
                      };

                      localStorage.setItem(`bill-share-${billToken}`, JSON.stringify(shareData));
                      const shareUrl = `${window.location.origin}/receipt/${billToken}`;

                      if (navigator.share) {
                        await navigator.share({
                          title: `${restaurantName} - Bill Split`,
                          text: `Split the bill from ${restaurantName}`,
                          url: shareUrl
                        });
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Link copied to clipboard!');
                      }

                      setShowBillOverview(false);
                    } catch (error) {
                      console.error('Error sharing bill:', error);
                    }
                  }}
                  disabled={!allItemsAssigned || people.length === 0}
                >
                  Share Bill
                </button>
                </>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unified Edit Modal */}
      <UnifiedEditModal
        isOpen={showUnifiedEdit}
        onClose={() => setShowUnifiedEdit(false)}
        restaurantName={restaurantName}
        onRestaurantNameSave={handleUnifiedRestaurantSave}
        items={items}
        onItemsSave={handleUnifiedItemsSave}
        people={people}
        onPersonAdd={handleAddPerson}
        onPersonRemove={handleUnifiedPersonRemove}
        subtotal={billTotals?.subtotal ?? 0}
        tax={tax}
        tip={tip}
        discount={discount}
        serviceFee={serviceFee}
        total={billTotals?.grand_total ?? 0}
        onBillTotalsSave={handleUnifiedBillTotalsSave}
        billToken={billToken}
        getPersonColor={getPersonColor}
      />

      {/* Share Receipt Modal */}
      <ShareReceiptModal
        isOpen={showShareReceipt}
        onClose={() => setShowShareReceipt(false)}
        restaurantName={restaurantName}
        date={new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
        items={items}
        people={people.map(person => {
          const breakdown = getPersonBreakdown(billTotals, person.id);
          const itemShares = (breakdown?.items ?? []).map(it => ({
            itemId: it.item_id,
            weight: it.weight,
            shareAmount: it.share_amount
          }));
          return { ...person, itemShares };
        })}
        subtotal={billTotals?.subtotal ?? 0}
        tax={tax}
        tip={tip}
        discount={discount}
        serviceFee={serviceFee}
        total={billTotals?.grand_total ?? 0}
        billTotals={billTotals}
      />
    </div>
  );
};
