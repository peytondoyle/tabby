import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LazyShareReceiptModal as ShareReceiptModal } from '../components/ShareReceiptModal/LazyShareReceiptModal';
import { fetchReceiptByToken } from '../lib/receipts';
import { HomeButton } from '@/components/HomeButton';
import { computeTotals, type Item as ComputeItem, type Person as ComputePerson, type ItemShare as ComputeItemShare } from '../lib/computeTotals';

interface Item {
  id: string;
  label: string;  // API/database field name
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
  discount: number;
  serviceFee: number;
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

        // Calculate totals - API now returns discount/service_fee from database
        let subtotal = Number(billData.receipt.subtotal || 0);
        let tax = Number(billData.receipt.sales_tax || 0);
        let tip = Number(billData.receipt.tip || 0);
        let discount = Number(billData.receipt.discount || 0);
        let serviceFee = Number(billData.receipt.service_fee || 0);
        let total = subtotal - discount + serviceFee + tax + tip;

        // Try to get people and assignments from localStorage if available
        let people: Person[] = [];

        if (localShareData) {
          try {
            const shareData = JSON.parse(localShareData);
            people = shareData.people || [];
            // Override from localStorage if present (more recent values)
            if (shareData.discount !== undefined) discount = Number(shareData.discount);
            if (shareData.serviceFee !== undefined) serviceFee = Number(shareData.serviceFee);
            // Recalculate total with discount/serviceFee
            if (shareData.subtotal) subtotal = Number(shareData.subtotal);
            if (shareData.tax) tax = Number(shareData.tax);
            if (shareData.tip) tip = Number(shareData.tip);
            total = subtotal - discount + serviceFee + tax + tip;
            console.log('[ReceiptPage] Loaded people from localStorage:', people);
            console.log('[ReceiptPage] Loaded discount/serviceFee:', { discount, serviceFee });
          } catch (e) {
            console.error('Error parsing localStorage share data:', e);
          }
        }

        // If no people from localStorage, try to construct from API data
        if (people.length === 0 && billData.people && billData.people.length > 0) {
          console.log('[ReceiptPage] Building people from API data');
          console.log('[ReceiptPage] Shares from API:', billData.shares);

          // Use centralized computeTotals for accurate calculations with penny reconciliation
          const computeItems: ComputeItem[] = items.map(item => ({
            id: item.id,
            label: item.label,
            price: item.price,
            quantity: 1,
            unit_price: item.price,
            emoji: item.emoji
          }));

          const computePeople: ComputePerson[] = (billData.people || []).map((person: any) => ({
            id: person.id,
            name: person.name,
            is_paid: false
          }));

          const computeShares: ComputeItemShare[] = (billData.shares || []).map((share: any) => ({
            item_id: share.item_id,
            person_id: share.person_id,
            weight: share.weight || 1
          }));

          // Calculate totals using the centralized computation engine
          const billTotals = computeTotals(
            computeItems,
            computeShares,
            computePeople,
            tax,
            tip,
            discount,
            serviceFee,
            'proportional',
            'proportional',
            true
          );

          // Transform to ReceiptPage's expected format
          people = billTotals.person_totals.map(pt => {
            const personItemIds = computeShares
              .filter(share => share.person_id === pt.person_id)
              .map(share => share.item_id);

            const itemShares: ItemShare[] = pt.items.map(item => ({
              itemId: item.item_id,
              weight: item.weight,
              shareAmount: item.share_amount
            }));

            return {
              id: pt.person_id,
              name: pt.name,
              items: personItemIds,
              itemShares,
              total: pt.total
            };
          });
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
          discount,
          serviceFee,
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
        discount={receipt.discount}
        serviceFee={receipt.serviceFee}
        total={receipt.total}
      />
    </>
  );
};
