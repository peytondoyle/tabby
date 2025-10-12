import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { parseReceipt, createReceiptFromReceipt, type ParseResult } from '../lib/receiptScanning';
import { LazyShareReceiptModal as ShareReceiptModal } from '../components/ShareReceiptModal/LazyShareReceiptModal';
import { FoodIcon } from '../lib/foodIcons';
import { getReceiptHistory } from '../lib/receiptHistory';
import { useAuth } from '../lib/authContext';
import { AuthModal } from '../components/AuthModal';
import { HomeButton } from '../components/HomeButton';
import { fetchReceiptByToken, updateReceiptPeople, updateReceiptShares, updateReceiptMetadata } from '../lib/receipts';
import { trackPersonName, getQuickAddSuggestions, getUserIdentity, setUserIdentity } from '../lib/peopleHistory';
import './TabbySimple.css';

interface Item {
  id: string;
  emoji: string;
  name: string;
  price: number;
  assignedTo?: string;
  splitBetween?: string[]; // Array of person IDs sharing this item
}

interface Person {
  id: string;
  name: string;
  items: string[];
  total: number;
}

// Dark, unique color palette for person avatars (inspired by Tabby)
const PERSON_COLORS = [
  '#2C5F7D', // Deep blue
  '#4A6741', // Forest green
  '#6B4C7C', // Deep purple
  '#7C4A44', // Terracotta
  '#5C5C3D', // Olive
  '#4D6B73', // Teal
  '#6B4462', // Plum
  '#5D5C42', // Bronze
  '#3D5A6B', // Steel blue
  '#5B4848', // Brown
];

const getPersonColor = (index: number): string => {
  return PERSON_COLORS[index % PERSON_COLORS.length];
};

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
    // Save people to database and get back Supabase UUIDs
    const peopleResponse = await updateReceiptPeople(token, people.map(p => ({
      id: p.id,
      name: p.name,
      avatar_url: null,
      venmo_handle: null
    })));

    // Update people with Supabase UUIDs
    const updatedPeople: Person[] = peopleResponse.people.map((apiPerson: any, index: number) => {
      const originalPerson = people[index];
      return {
        id: apiPerson.id, // Supabase UUID
        name: apiPerson.name,
        items: originalPerson?.items || [],
        total: originalPerson?.total || 0
      };
    });

    console.log('[persistPeopleAndShares] Updated people with Supabase UUIDs:', updatedPeople);

    // Build shares array using Supabase UUIDs
    const shares = updatedPeople.flatMap(person =>
      person.items.map(itemId => ({
        item_id: itemId,
        person_id: person.id, // Now using Supabase UUID
        weight: items.find(i => i.id === itemId)?.splitBetween?.length || 1
      }))
    );

    // Save shares to database
    await updateReceiptShares(token, shares);

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
  const [step, setStep] = useState<'upload' | 'scanning' | 'editName' | 'people' | 'assign'>('upload');
  const [items, setItems] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showSplitItem, setShowSplitItem] = useState(false);
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [showBillOverview, setShowBillOverview] = useState(false);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const [editableSubtotal, setEditableSubtotal] = useState('');
  const [editableTax, setEditableTax] = useState('');
  const [editableTip, setEditableTip] = useState('');
  const [editableItems, setEditableItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [splitPeople, setSplitPeople] = useState<string[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverPerson, setDragOverPerson] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [total, setTotal] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);
  const [billToken, setBillToken] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState('');
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditingRestaurantName, setIsEditingRestaurantName] = useState(false);
  const [editableRestaurantName, setEditableRestaurantName] = useState('');
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        };
        setPeople([newPerson]);
      }
    }
  }, [step]);

  // Load bill from URL params if on edit route
  useEffect(() => {
    const loadBillFromUrl = async () => {
      // Only load from API if we don't have items already
      if (urlToken && items.length === 0) {
        setIsLoadingBill(true);
        try {
          const billData = await fetchReceiptByToken(urlToken);

          // Handle both 'bill' and 'receipt' keys from API
          const receiptData = billData.bill || billData.receipt;

          if (billData && receiptData) {
            // Load items
            const loadedItems: Item[] = (billData.items || []).map((item: any) => ({
              id: item.id,
              emoji: item.emoji || '🍽️',
              name: item.label || item.name || 'Item',
              price: Number(item.price || item.unit_price || 0),
              assignedTo: undefined,
              splitBetween: undefined
            }));

            setItems(loadedItems);
            setRestaurantName(receiptData.place || receiptData.title || 'Restaurant');
            setSubtotal(Number(receiptData.subtotal || 0));
            setTax(Number(receiptData.sales_tax || 0));
            setTip(Number(receiptData.tip || 0));
            setTotal(Number(receiptData.total_amount || receiptData.subtotal + receiptData.sales_tax + receiptData.tip || 0));
            setBillToken(urlToken);

            // Load people from API if available
            if (billData.people && billData.people.length > 0) {
              console.log('[TabbySimple] Loading people from API:', billData.people);

              // First, apply item assignments from people data
              const updatedItems = loadedItems.map(item => {
                // Find which person(s) have this item
                const assignedPeople = billData.people.filter((p: Person) =>
                  p.items.includes(item.id)
                );

                if (assignedPeople.length > 1) {
                  // Item is split between multiple people
                  return {
                    ...item,
                    assignedTo: assignedPeople[0].id,
                    splitBetween: assignedPeople.map((p: Person) => p.id)
                  };
                } else if (assignedPeople.length === 1) {
                  // Item assigned to one person
                  return {
                    ...item,
                    assignedTo: assignedPeople[0].id
                  };
                }
                return item;
              });

              setItems(updatedItems);

              // Recalculate person totals with actual item prices
              const peopleWithTotals = billData.people.map((person: Person) => {
                const personItems = updatedItems.filter(item => person.items.includes(item.id));
                let itemsSubtotal = 0;

                personItems.forEach(item => {
                  if (item.splitBetween && item.splitBetween.length > 0) {
                    itemsSubtotal += item.price / item.splitBetween.length;
                  } else {
                    itemsSubtotal += item.price;
                  }
                });

                const receiptSubtotal = Number(receiptData.subtotal || 0);
                const proportion = receiptSubtotal > 0 ? itemsSubtotal / receiptSubtotal : 0;
                const personTax = Number(receiptData.sales_tax || 0) * proportion;
                const personTip = Number(receiptData.tip || 0) * proportion;
                const total = itemsSubtotal + personTax + personTip;

                return {
                  ...person,
                  total
                };
              });

              setPeople(peopleWithTotals);
              console.log('[TabbySimple] Recalculated people totals:', peopleWithTotals);
            } else {
              // Fallback to localStorage if no people in API response
              const localShareData = localStorage.getItem(`bill-share-${urlToken}`);
              if (localShareData) {
                try {
                  const shareData = JSON.parse(localShareData);
                  if (shareData.people) {
                    setPeople(shareData.people);
                  }
                  if (shareData.assignments) {
                    // Apply assignments to items
                    setItems(prevItems => prevItems.map(item => ({
                      ...item,
                      assignedTo: shareData.assignments[item.id]
                    })));
                  }
                } catch (e) {
                  console.error('Error loading share data:', e);
                }
              }
            }
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
    setStep('scanning');
    setScanProgress('Scanning receipt...');

    try {
      const result = await parseReceipt(file, (progress) => {
        setScanProgress(progress);
      });

      // Convert to our item format
      const scannedItems: Item[] = result.items.map(item => ({
        id: item.id,
        emoji: item.emoji || '🍽️',
        name: item.label,
        price: item.price,
      }));

      setItems(scannedItems);
      setRestaurantName(result.place || 'Restaurant');
      setSubtotal(result.subtotal || 0);
      setTax(result.tax || 0);
      setTip(result.tip || 0);
      setTotal(result.total || 0);

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
          const updatedItems: Item[] = supabaseItems.map((item: any) => ({
            id: item.id, // Supabase UUID
            emoji: item.emoji || '🍽️',
            name: item.label || item.name || 'Item',
            price: Number(item.price || item.unit_price || 0),
          }));
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

      // Determine next step based on whether people were added during scan
      console.log('Scan complete:', {
        place: result.place,
        needsNameEdit,
        peopleAdded: people.length,
        token
      });

      if (needsNameEdit) {
        setStep('editName');
      } else if (people.length > 0) {
        // If people were added during scanning, skip people step and go to assign
        console.log('[TabbySimple] People added during scan, navigating to assign:', token);
        navigate(`/receipt/${token}/edit`);
      } else {
        // Navigate to people step with token
        console.log('[TabbySimple] Navigating to people step:', token);
        navigate(`/receipt/${token}/people`);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setStep('upload');
    }
  };

  const handleAddPerson = async (name?: string) => {
    const personName = (name || newPersonName).trim();
    if (personName) {
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: personName,
        items: [],
        total: 0,
      };
      const updatedPeople = [...people, newPerson];
      setPeople(updatedPeople);
      trackPersonName(personName); // Track for future suggestions
      setNewPersonName('');
      setShowAddPerson(false);

      // Persist to database and get Supabase UUIDs
      const peopleWithSupabaseIds = await persistPeopleAndShares(billToken, updatedPeople, items);
      setPeople(peopleWithSupabaseIds);
    }
  };

  const handleSaveBillEdits = async () => {
    const newSubtotal = parseFloat(editableSubtotal) || 0;
    const newTax = parseFloat(editableTax) || 0;
    const newTip = parseFloat(editableTip) || 0;
    const newTotal = newSubtotal + newTax + newTip;

    setSubtotal(newSubtotal);
    setTax(newTax);
    setTip(newTip);
    setTotal(newTotal);

    // Persist to database
    if (billToken) {
      try {
        await updateReceiptMetadata(billToken, {
          subtotal: newSubtotal,
          sales_tax: newTax,
          tip: newTip
        });
        console.log('[TabbySimple] Bill totals updated successfully');
      } catch (error) {
        console.error('[TabbySimple] Failed to update bill totals:', error);
      }
    }

    // Recalculate all person totals with new tax/tip
    setPeople(people.map(person => {
      const personItems = items.filter(item => person.items.includes(item.id));
      const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
      const proportion = newSubtotal > 0 ? itemsSubtotal / newSubtotal : 0;
      const personTax = newTax * proportion;
      const personTip = newTip * proportion;
      const total = itemsSubtotal + personTax + personTip;
      return {
        ...person,
        total
      };
    }));

    setIsEditingBill(false);
  };

  const handleSaveReceiptEdits = () => {
    // Update items with edited values
    setItems(editableItems);

    // Recalculate subtotal based on new item prices
    const newSubtotal = editableItems.reduce((sum, item) => sum + item.price, 0);
    setSubtotal(newSubtotal);
    setEditableSubtotal(newSubtotal.toFixed(2));

    // Recalculate total
    const newTotal = newSubtotal + tax + tip;
    setTotal(newTotal);

    // Recalculate all person totals
    setPeople(people.map(person => {
      const personItems = editableItems.filter(item => person.items.includes(item.id));
      const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
      const proportion = newSubtotal > 0 ? itemsSubtotal / newSubtotal : 0;
      const personTax = tax * proportion;
      const personTip = tip * proportion;
      const total = itemsSubtotal + personTax + personTip;
      return {
        ...person,
        total
      };
    }));

    setIsEditingReceipt(false);
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (personId: string) => {
    setDragOverPerson(personId);
  };

  const handleDragLeave = () => {
    setDragOverPerson(null);
  };

  const handleDrop = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    if (draggedItem) {
      assignItemToPerson(draggedItem, personId);
    }
    setDraggedItem(null);
    setDragOverPerson(null);
  };

  const calculatePersonTotal = (personItems: Item[]) => {
    const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
    // Calculate proportional tax and tip
    const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
    const personTax = tax * proportion;
    const personTip = tip * proportion;
    return itemsSubtotal + personTax + personTip;
  };

  const assignItemToPerson = async (itemId: string, personId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, assignedTo: personId } : item
    );
    setItems(updatedItems);

    const updatedPeople = people.map(person => {
      if (person.id === personId) {
        const assignedItems = items.filter(i =>
          i.id === itemId || person.items.includes(i.id)
        );
        const total = calculatePersonTotal(assignedItems);
        return {
          ...person,
          items: [...new Set([...person.items, itemId])],
          total
        };
      }
      // Remove from other people
      if (person.items.includes(itemId)) {
        const remainingItems = person.items.filter(id => id !== itemId);
        const remainingItemsData = items.filter(i => remainingItems.includes(i.id));
        const total = calculatePersonTotal(remainingItemsData);
        return {
          ...person,
          items: remainingItems,
          total
        };
      }
      return person;
    });
    setPeople(updatedPeople);

    // Persist to database and get Supabase UUIDs
    const peopleWithSupabaseIds = await persistPeopleAndShares(billToken, updatedPeople, updatedItems);
    setPeople(peopleWithSupabaseIds);
  };

  const unassignedItems = items.filter(item => !item.assignedTo);
  const allItemsAssigned = unassignedItems.length === 0;

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
                color: 'rgba(255,255,255,0.6)'
              }}>
                {user.email}
              </div>
              <button
                onClick={signOut}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
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
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <span className="upload-icon">📸</span>
            <span className="upload-text">Tap to scan receipt</span>
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
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
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
                  background: 'rgba(0, 122, 255, 0.15)',
                  border: '1px solid rgba(0, 122, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#007AFF',
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
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)';
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
              color: 'rgba(255,255,255,0.9)'
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
                      color: '#fff'
                    }}>
                      {person.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {person.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Suggestions */}
            {quickAddSuggestions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  Quick Add
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {quickAddSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.name}
                      onClick={() => handleAddPerson(suggestion.name)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(0, 122, 255, 0.15)',
                        border: '1px solid rgba(0, 122, 255, 0.3)',
                        borderRadius: '20px',
                        color: '#007AFF',
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
            <div style={{ marginBottom: '12px' }}>
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
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none'
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
                  background: newPersonName.trim() ? 'rgba(0, 122, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${newPersonName.trim() ? 'rgba(0, 122, 255, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px',
                  color: newPersonName.trim() ? '#007AFF' : 'rgba(255,255,255,0.3)',
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
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.7)',
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
              color: 'rgba(255,255,255,0.4)',
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

    return (
      <div className="tabby-simple">
        <HomeButton />
        <div className="header">
          <div>
            <h1>{restaurantName}</h1>
            <p className="date">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

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
              <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontWeight: '500' }}>
                Quick Add
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {quickAddSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion.name}
                    onClick={() => handleAddPerson(suggestion.name)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(0, 122, 255, 0.15)',
                      border: '1px solid rgba(0, 122, 255, 0.3)',
                      borderRadius: '20px',
                      color: '#007AFF',
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
                  <span className="person-name-text">{person.name}</span>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      const updatedPeople = people.filter(p => p.id !== person.id);
                      setPeople(updatedPeople);

                      // Persist to database
                      persistPeopleAndShares(billToken, updatedPeople, items);
                    }}
                  >
                    Remove
                  </button>
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

        <div className="bottom-nav">
          <button
            className="continue-to-assign-btn"
            onClick={() => {
              console.log('[TabbySimple] Continue button clicked', { billToken, peopleCount: people.length });
              if (billToken) {
                // Save current state to localStorage before navigating
                const shareData = {
                  billToken,
                  people: people.map(person => ({
                    id: person.id,
                    name: person.name,
                    items: person.items,
                    total: person.total
                  })),
                  assignments: items.reduce((acc, item) => {
                    if (item.assignedTo) {
                      acc[item.id] = item.assignedTo;
                    }
                    return acc;
                  }, {} as Record<string, string>)
                };
                localStorage.setItem(`bill-share-${billToken}`, JSON.stringify(shareData));
                console.log('[TabbySimple] Navigating to:', `/receipt/${billToken}/edit`);
                navigate(`/receipt/${billToken}/edit`);
              } else {
                console.log('[TabbySimple] No billToken, using setStep');
                setStep('assign');
              }
            }}
            disabled={people.length === 0}
          >
            Continue to Assign Items
          </button>
        </div>

        {/* Add Person Modal */}
        {showAddPerson && (
          <div className="modal-overlay" onClick={() => setShowAddPerson(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add People</h3>
              <input
                type="text"
                placeholder="Enter name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                autoFocus
              />
              <div className="modal-actions">
                <button onClick={handleAddPerson} disabled={!newPersonName.trim()}>
                  Add Person
                </button>
                <button className="contacts-btn">
                  👤 Add from Contacts
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tabby-simple">
      <HomeButton />
      {/* Header */}
      <div className="header">
        <div>
          <h1>{restaurantName}</h1>
          <p className="date">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="header-buttons">
          <button className="receipt-btn" onClick={() => {
            setShowBillOverview(true);
            setIsEditingBill(false);
            setIsEditingReceipt(false);
            setIsEditingRestaurantName(false);
            setEditableSubtotal(subtotal.toFixed(2));
            setEditableTax(tax.toFixed(2));
            setEditableTip(tip.toFixed(2));
            setEditableItems([...items]);
            setEditableRestaurantName(restaurantName);
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="15" y2="17"/>
            </svg>
          </button>
          <button className="menu-btn" onClick={() => setShowManagePeople(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* People Section */}
        <div className="people-section">
          {people.map((person, index) => (
            <div
              key={person.id}
              className={`person-circle ${dragOverPerson === person.id ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(person.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, person.id)}
            >
              <div className="person-avatar" style={{ background: getPersonColor(index) }}>
                {person.name[0].toUpperCase()}
              </div>
              <span className="person-name">{person.name}</span>
              {person.items.length > 0 && (
                <span className="person-count">{person.items.length}</span>
              )}
            </div>
          ))}

          <button
            className="add-person-btn"
            onClick={() => setShowAddPerson(true)}
          >
            +
          </button>
        </div>

        {/* Combined Items and People View */}
        <div className="combined-view">
          {/* Unassigned Items Section */}
          {unassignedItems.length > 0 && (
            <div className="unassigned-section">
              <h3 className="section-title">Unassigned Items</h3>
              <div className="items-grid">
                {unassignedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`item-card ${draggedItem === item.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedItem(item);
                      setSplitPeople([]);
                      setShowSplitItem(true);
                    }}
                    onDoubleClick={() => {
                      setSelectedItem(item);
                      setSplitPeople([]);
                      setShowSplitItem(true);
                    }}
                  >
                    <span className="item-emoji">
                      <FoodIcon itemName={item.name} emoji={item.emoji} size={24} />
                    </span>
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People's Items Section */}
          {people.length > 0 && people.some(p => p.items.length > 0) && (
            <>
              <h3 className="section-title">Assigned Items</h3>
              <div className="people-items-section">
                {people.filter(p => p.items.length > 0).map((person) => {
                const personIndex = people.findIndex(p => p.id === person.id);
                // Get all items for this person based on their items array
                const personItems = items.filter(item => person.items.includes(item.id));

                // Calculate subtotal considering split items
                let itemsSubtotal = 0;
                personItems.forEach(item => {
                  if (item.splitBetween && item.splitBetween.length > 0) {
                    // Divide price by number of people splitting
                    itemsSubtotal += item.price / item.splitBetween.length;
                  } else {
                    itemsSubtotal += item.price;
                  }
                });

                const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
                const personTax = tax * proportion;
                const personTip = tip * proportion;

                return (
                  <div key={person.id} className="person-section" style={{ background: `${getPersonColor(personIndex)}33` }}>
                    <div className="person-header">
                      <span className="person-name-large">{person.name}</span>
                      <span className="person-total">${person.total.toFixed(2)}</span>
                    </div>
                    <div className="person-items">
                      {personItems.map(item => {
                        const isSplit = item.splitBetween && item.splitBetween.length > 1;
                        const splitCount = isSplit ? item.splitBetween!.length : 1;
                        const displayPrice = item.price / splitCount;

                        return (
                          <div
                            key={item.id}
                            className={`person-item ${draggedItem === item.id ? 'dragging' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(item.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
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
                                  const remainingItemsData = items.filter(i => newItems.includes(i.id));

                                  // Recalculate total
                                  let newSubtotal = 0;
                                  remainingItemsData.forEach(ri => {
                                    if (ri.splitBetween && ri.splitBetween.length > 0) {
                                      newSubtotal += ri.price / ri.splitBetween.length;
                                    } else {
                                      newSubtotal += ri.price;
                                    }
                                  });
                                  const newProportion = subtotal > 0 ? newSubtotal / subtotal : 0;
                                  const newTotal = newSubtotal + (tax * newProportion) + (tip * newProportion);

                                  return {
                                    ...p,
                                    items: newItems,
                                    total: newTotal
                                  };
                                }
                                return p;
                              });
                              setPeople(updatedPeople);

                              // Persist to database
                              persistPeopleAndShares(billToken, updatedPeople, updatedItems);
                            }}
                          >
                            <span className="item-emoji-small">
                              <FoodIcon itemName={item.name} emoji={item.emoji} size={18} />
                            </span>
                            <span className="item-name-small">
                              {isSplit && `1/${splitCount} `}{item.name}
                            </span>
                            <span className="item-price-small">${displayPrice.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="person-breakdown">
                      <div className="breakdown-row">
                        <span>Items</span>
                        <span>${itemsSubtotal.toFixed(2)}</span>
                      </div>
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

          {allItemsAssigned && items.length > 0 && (
            <div className="all-assigned">
              🎉 Your bill has been split! 🎊
            </div>
          )}
        </div>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
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
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="status-text">
          {unassignedItems.length > 0
            ? `${unassignedItems.length} items to assign`
            : 'Ready to share!'
          }
        </div>

        <button
          className="share-btn"
          disabled={!allItemsAssigned || people.length === 0}
          onClick={() => setShowShareReceipt(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8.68 13.34L15.32 9.66M8.68 10.66L15.32 14.34M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Add Person Modal */}
      {showAddPerson && (
        <div className="modal-overlay" onClick={() => setShowAddPerson(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add People</h3>

            {/* Quick Add from Recent */}
            {(() => {
              const suggestions = getQuickAddSuggestions(people.map(p => p.name));
              return suggestions.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                    Quick Add
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {suggestions.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleAddPerson(suggestion.name)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(0, 122, 255, 0.15)',
                          border: '1px solid rgba(0, 122, 255, 0.3)',
                          borderRadius: '16px',
                          color: '#007AFF',
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
            <div className="modal-actions">
              <button onClick={handleAddPerson} disabled={!newPersonName.trim()}>
                Add Person
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Item Modal */}
      {showSplitItem && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSplitItem(false)}>
          <div className="modal split-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Split {selectedItem.name}</h3>
            <div className="split-item-badge">
              <span className="item-emoji">
                <FoodIcon itemName={selectedItem.name} emoji={selectedItem.emoji} size={24} />
              </span>
              <span>{selectedItem.name}</span>
              <span className="item-price">${selectedItem.price.toFixed(2)}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px', fontSize: '14px' }}>
              Select at least 2 people to split this item
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
                  if (splitPeople.length >= 2) {
                    // Mark item as split and assigned
                    const updatedItems = items.map(item =>
                      item.id === selectedItem.id
                        ? { ...item, assignedTo: splitPeople[0], splitBetween: splitPeople }
                        : item
                    );
                    setItems(updatedItems);

                    // Add item to all selected people with recalculated totals
                    const updatedPeople = people.map(person => {
                      if (splitPeople.includes(person.id)) {
                        const newItems = [...new Set([...person.items, selectedItem.id])];
                        // Get all items for this person
                        const personItemsData = items
                          .filter(i => newItems.includes(i.id) || i.id === selectedItem.id)
                          .map(i => {
                            // If this is the item being split, update it with splitBetween
                            if (i.id === selectedItem.id) {
                              return { ...i, splitBetween: splitPeople };
                            }
                            return i;
                          });

                        // Calculate subtotal considering split items
                        let itemsSubtotal = 0;
                        personItemsData.forEach(item => {
                          if (item.splitBetween && item.splitBetween.length > 0) {
                            // Divide price by number of people splitting
                            itemsSubtotal += item.price / item.splitBetween.length;
                          } else {
                            itemsSubtotal += item.price;
                          }
                        });

                        const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
                        const personTax = tax * proportion;
                        const personTip = tip * proportion;
                        const total = itemsSubtotal + personTax + personTip;

                        return {
                          ...person,
                          items: newItems,
                          total
                        };
                      }
                      return person;
                    });
                    setPeople(updatedPeople);

                    // Persist to database
                    persistPeopleAndShares(billToken, updatedPeople, updatedItems);

                    setShowSplitItem(false);
                    setSelectedItem(null);
                    setSplitPeople([]);
                  }
                }}
                disabled={splitPeople.length < 2}
              >
                Split Between {splitPeople.length} People
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
                  <span className="person-name-text">{person.name}</span>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      // Remove person and unassign their items
                      const updatedPeople = people.filter(p => p.id !== person.id);
                      const updatedItems = items.map(item =>
                        item.assignedTo === person.id ? { ...item, assignedTo: undefined } : item
                      );
                      setPeople(updatedPeople);
                      setItems(updatedItems);

                      // Persist to database
                      persistPeopleAndShares(billToken, updatedPeople, updatedItems);
                    }}
                  >
                    Remove
                  </button>
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
                      color: '#007AFF',
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
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                    LINE ITEMS
                  </h4>
                  {editableItems.map((item, index) => (
                    <div key={item.id} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
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
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: '#fff',
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
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: '#fff',
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
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: '#fff',
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
                          background: 'rgba(255,59,48,0.15)',
                          border: '1px solid rgba(255,59,48,0.3)',
                          borderRadius: '6px',
                          color: '#FF3B30',
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
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: '#fff',
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
                          background: '#007AFF',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
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
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '6px',
                          color: 'rgba(255,255,255,0.7)',
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
                        <p className="date" style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0 0' }}>
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
                          color: '#007AFF',
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
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  RECEIPT LINK
                </h4>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(0, 122, 255, 0.1)',
                  border: '1px solid rgba(0, 122, 255, 0.3)',
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
                      color: '#007AFF',
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
                        btn.style.color = '#34C759';
                        setTimeout(() => {
                          btn.textContent = originalText;
                          btn.style.color = '#007AFF';
                        }, 2000);
                      } catch (error) {
                        console.error('Error copying to clipboard:', error);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#007AFF',
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
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: '8px',
                  marginBottom: 0
                }}>
                  Share this link to view the receipt anytime
                </p>
              </div>
            )}

            <div className="bill-overview-section">
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
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
                  <span style={{ fontWeight: '600' }}>${person.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bill-overview-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  BILL TOTALS
                </h4>
                {!isEditingBill && (
                  <button
                    onClick={() => setIsEditingBill(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#007AFF',
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
                      onChange={(e) => setEditableSubtotal(e.target.value)}
                      style={{
                        width: '100px',
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
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
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: '#fff',
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
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '15px',
                        fontFamily: "'Courier New', 'Courier', monospace",
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  <div className="bill-overview-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '12px', fontWeight: '600' }}>
                    <span>Total</span>
                    <span>${((parseFloat(editableSubtotal) || 0) + (parseFloat(editableTax) || 0) + (parseFloat(editableTip) || 0)).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bill-overview-row">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="bill-overview-row">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="bill-overview-row">
                    <span>Tip</span>
                    <span>${tip.toFixed(2)}</span>
                  </div>
                  <div className="bill-overview-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '12px', fontWeight: '600' }}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
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
                      setEditableSubtotal(subtotal.toFixed(2));
                      setEditableTax(tax.toFixed(2));
                      setEditableTip(tip.toFixed(2));
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
                          items: person.items,
                          total: person.total
                        })),
                        assignments: items.reduce((acc, item) => {
                          if (item.assignedTo) {
                            acc[item.id] = item.assignedTo;
                          }
                          return acc;
                        }, {} as Record<string, string>)
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
        people={people}
        subtotal={subtotal}
        tax={tax}
        tip={tip}
        total={total}
      />
    </div>
  );
};