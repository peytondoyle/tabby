import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShareReceiptModal } from '../components/ShareReceiptModal';
import { fetchReceiptByToken } from '../lib/receipts';
import { HomeButton } from '@/components/HomeButton';

interface Item {
  id: string;
  label: string;
  price: number;
  emoji?: string;
}

interface Person {
  id: string;
  name: string;
  items: string[];
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
        const subtotal = Number(billData.bill.subtotal || 0);
        const tax = Number(billData.bill.sales_tax || 0);
        const tip = Number(billData.bill.tip || 0);
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
          // Map people from API and calculate their items/totals from shares
          people = (billData.people || []).map((person: any) => {
            const personShares = (billData.shares || []).filter(
              (share: any) => share.person_id === person.id
            );
            const personItemIds = personShares.map((share: any) => share.item_id);
            const personItems = items.filter(item => personItemIds.includes(item.id));
            const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
            const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
            const personTax = tax * proportion;
            const personTip = tip * proportion;
            const personTotal = itemsSubtotal + personTax + personTip;

            return {
              id: person.id,
              name: person.name,
              items: personItemIds,
              total: personTotal
            };
          });
        }

        const receiptData: ReceiptData = {
          token,
          restaurantName: billData.bill.place || billData.bill.title || 'Restaurant',
          date: billData.bill.date || new Date().toISOString().split('T')[0],
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
