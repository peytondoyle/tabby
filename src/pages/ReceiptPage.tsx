import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LazyShareReceiptModal as ShareReceiptModal } from '../components/ShareReceiptModal/LazyShareReceiptModal';
import { fetchReceiptByToken } from '../lib/receipts';
import { HomeButton } from '@/components/HomeButton';

interface Item {
  id: string;
  label: string;
  price: number;
  emoji?: string;
}

interface ItemShare {
  itemId: string;
  weight: number;
  shareAmount: number;
}

interface Person {
  id: string;
  name: string;
  items: string[];
  itemShares?: ItemShare[];  // Includes weight and calculated share amount
  total: number;
}

interface ReceiptData {
  token: string;
  restaurantName: string;
  date: string;
  items: Item[];
  people: Person[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export const ReceiptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReceipt = async () => {
      if (!token) {
        setError('No bill token provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching bill with token:', token);

        // Try to load from localStorage first (for recently created bills with assignments)
        const localShareData = localStorage.getItem(`bill-share-${token}`);

        // Fetch bill data from API
        const billData = await fetchReceiptByToken(token);

        if (!billData) {
          setError('Bill not found');
          setLoading(false);
          return;
        }

        console.log('Bill data fetched:', billData);

        // Transform items to match the expected format
        const items: Item[] = (billData.items || []).map((item: any) => ({
          id: item.id,
          label: item.label || item.name || 'Item',
          price: Number(item.price || item.unit_price || 0),
          emoji: item.emoji || item.icon || '🍽️'
        }));

        // Calculate totals
        const subtotal = Number(billData.receipt.subtotal || 0);
        const tax = Number(billData.receipt.sales_tax || 0);
        const tip = Number(billData.receipt.tip || 0);
        const total = subtotal + tax + tip;

        // Try to get people and assignments from localStorage if available
        let people: Person[] = [];

        if (localShareData) {
          try {
            const shareData = JSON.parse(localShareData);
            people = shareData.people || [];
            console.log('Loaded people from localStorage:', people);
          } catch (e) {
            console.error('Error parsing localStorage share data:', e);
          }
        }

        // If no people from localStorage, try to construct from API data
        if (people.length === 0 && billData.people && billData.people.length > 0) {
          // First, calculate total weight for each item (for shared items)
          const itemWeightTotals = new Map<string, number>();
          (billData.shares || []).forEach((share: any) => {
            const current = itemWeightTotals.get(share.item_id) || 0;
            itemWeightTotals.set(share.item_id, current + (share.weight || 1));
          });

          // Pre-calculate item shares with penny reconciliation
          const itemShareMap = new Map<string, Map<string, { weight: number; shareAmount: number }>>();
          items.forEach(item => {
            const itemShares = (billData.shares || []).filter((s: any) => s.item_id === item.id);
            if (itemShares.length === 0) return;

            const totalWeight = itemWeightTotals.get(item.id) || 1;

            // Calculate raw shares and round down
            const shares: Array<{ personId: string; weight: number; rawShare: number; roundedShare: number }> = [];
            let totalRounded = 0;

            itemShares.forEach((share: any) => {
              const weight = share.weight || 1;
              const normalizedWeight = weight / totalWeight;
              const rawShare = item.price * normalizedWeight;
              const roundedShare = Math.floor(rawShare * 100) / 100;
              totalRounded += roundedShare;
              shares.push({ personId: share.person_id, weight: normalizedWeight, rawShare, roundedShare });
            });

            // Distribute remaining pennies to highest fractional parts
            const remainingCents = Math.round((item.price - totalRounded) * 100);
            if (remainingCents > 0) {
              const sortedByFraction = [...shares].sort((a, b) => {
                const fracA = (a.rawShare * 100) % 1;
                const fracB = (b.rawShare * 100) % 1;
                return fracB - fracA;
              });
              for (let i = 0; i < remainingCents && i < sortedByFraction.length; i++) {
                sortedByFraction[i].roundedShare += 0.01;
              }
            }

            // Store in map
            const personMap = new Map<string, { weight: number; shareAmount: number }>();
            shares.forEach(share => personMap.set(share.personId, { weight: share.weight, shareAmount: share.roundedShare }));
            itemShareMap.set(item.id, personMap);
          });

          // Calculate all people subtotals for proper proportional distribution
          const personSubtotals = new Map<string, number>();
          (billData.people || []).forEach((person: any) => {
            let personItemsSubtotal = 0;
            itemShareMap.forEach((personShares) => {
              const share = personShares.get(person.id);
              if (share) personItemsSubtotal += share.shareAmount;
            });
            personSubtotals.set(person.id, personItemsSubtotal);
          });
          const allPeopleSubtotal = Array.from(personSubtotals.values()).reduce((sum, s) => sum + s, 0);

          // Map people from API and calculate their items/totals
          people = (billData.people || []).map((person: any) => {
            const personShares = (billData.shares || []).filter(
              (share: any) => share.person_id === person.id
            );
            const personItemIds = personShares.map((share: any) => share.item_id);

            // Get pre-calculated item shares
            const itemShares: ItemShare[] = personItemIds.map((itemId: string) => {
              const share = itemShareMap.get(itemId)?.get(person.id);
              return {
                itemId,
                weight: share?.weight ?? 1,
                shareAmount: share?.shareAmount ?? 0
              };
            }).filter((s: ItemShare) => s.shareAmount > 0);

            // Calculate person's subtotal from their share amounts
            const itemsSubtotal = itemShares.reduce((sum, share) => sum + share.shareAmount, 0);
            // Use allPeopleSubtotal as denominator to ensure proportions sum to 1.0
            const proportion = allPeopleSubtotal > 0 ? itemsSubtotal / allPeopleSubtotal : 0;
            const personTax = Math.round(tax * proportion * 100) / 100;
            const personTip = Math.round(tip * proportion * 100) / 100;
            const personTotal = Math.round((itemsSubtotal + personTax + personTip) * 100) / 100;

            return {
              id: person.id,
              name: person.name,
              items: personItemIds,
              itemShares,
              total: personTotal
            };
          });

          // Reconcile pennies: ensure person totals sum to grand total
          const grandTotal = subtotal + tax + tip;
          const personTotalsSum = people.reduce((sum, p) => sum + p.total, 0);
          const pennyDiff = Math.round((grandTotal - personTotalsSum) * 100);
          if (pennyDiff !== 0 && people.length > 0) {
            const sortedIndices = people
              .map((_, i) => i)
              .sort((a, b) => people[b].total - people[a].total);
            const penniesPerPerson = Math.floor(Math.abs(pennyDiff) / people.length);
            const remainder = Math.abs(pennyDiff) % people.length;
            const sign = pennyDiff > 0 ? 1 : -1;

            sortedIndices.forEach((idx, i) => {
              const extraPennies = penniesPerPerson + (i < remainder ? 1 : 0);
              people[idx].total = Math.round((people[idx].total + (sign * extraPennies * 0.01)) * 100) / 100;
            });
          }
        }

        const receiptData: ReceiptData = {
          token,
          restaurantName: billData.receipt.place || billData.receipt.title || 'Restaurant',
          date: billData.receipt.date || new Date().toISOString().split('T')[0],
          items,
          people,
          subtotal,
          tax,
          tip,
          total
        };

        setReceipt(receiptData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading receipt:', err);
        setError('Failed to load receipt');
        setLoading(false);
      }
    };

    loadReceipt();
  }, [token]);

  if (loading) {
    return (
      <>
        <HomeButton />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff'
        }}>
          <div>Loading receipt...</div>
        </div>
      </>
    );
  }

  if (error || !receipt) {
    return (
      <>
        <HomeButton />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          gap: '20px'
        }}>
          <div>{error || 'Receipt not found'}</div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#007AFF',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Scan New Receipt
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <HomeButton />
      <ShareReceiptModal
        isOpen={true}
        onClose={() => navigate('/')}
        restaurantName={receipt.restaurantName}
        date={new Date(receipt.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
        items={receipt.items}
        people={receipt.people}
        subtotal={receipt.subtotal}
        tax={receipt.tax}
        tip={receipt.tip}
        total={receipt.total}
      />
    </>
  );
};
