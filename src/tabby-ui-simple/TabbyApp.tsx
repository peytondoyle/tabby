import React, { useState } from 'react';
import { Welcome } from './screens/Welcome';
import { ItemList } from './screens/ItemList';
import { AssignItems } from './screens/AssignItems';
import { parseReceipt, createReceiptFromReceipt, type ParseResult } from '../lib/receiptScanning';
import './theme.css';

type Screen = 'welcome' | 'upload' | 'scanning' | 'items' | 'assign' | 'share';

interface Person {
  id: string;
  name: string;
  image?: string;
  items: Array<{
    id: string;
    emoji: string;
    name: string;
    price: number;
  }>;
  total: number;
}

export const BillyApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [scanResult, setScanResult] = useState<ParseResult | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleScanReceipt = async () => {
    setCurrentScreen('upload');
  };

  const handleFileSelect = async (file: File) => {
    setCurrentScreen('scanning');
    setError(null);
    setScanProgress('Selecting…');

    try {
      // Use real scanning API
      const result = await parseReceipt(file, (progress) => {
        setScanProgress(progress);
      });

      setScanResult(result);

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

      const id = await createReceiptFromReceipt(receiptData);
      setBillId(id);

      setCurrentScreen('items');
    } catch (error) {
      console.error('Scan failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan receipt');
      setCurrentScreen('welcome');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <>
            <Welcome onScanReceipt={handleScanReceipt} />
            {error && (
              <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                right: '20px',
                padding: '16px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '12px',
                color: '#ff6b6b',
                fontSize: '14px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}
          </>
        );

      case 'upload':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '24px',
            background: 'var(--tabby-black)',
          }}>
            <h2 style={{
              color: 'var(--tabby-white)',
              fontSize: 'var(--tabby-size-2xl)',
              marginBottom: '24px',
            }}>
              Upload Receipt
            </h2>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '300px',
              height: '300px',
              border: '2px dashed rgba(255,255,255,0.3)',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--tabby-blue)';
              e.currentTarget.style.background = 'rgba(0,122,255,0.05)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'transparent';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith('image/')) {
                handleFileSelect(file);
              }
            }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
              />
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>📸</span>
              <span style={{ color: 'var(--tabby-white)', fontSize: '18px' }}>
                Tap to upload or drag & drop
              </span>
              <span style={{ color: 'var(--tabby-gray)', fontSize: '14px', marginTop: '8px' }}>
                JPG, PNG, HEIC up to 10MB
              </span>
            </label>
            <button
              onClick={() => setCurrentScreen('welcome')}
              style={{
                marginTop: '32px',
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'var(--tabby-white)',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        );

      case 'scanning':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--tabby-black)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '24px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              📸
            </div>
            <h2 style={{ color: 'var(--tabby-white)', fontSize: 'var(--tabby-size-xl)' }}>
              Scanning Receipt...
            </h2>
            <p style={{ color: 'var(--tabby-gray)', marginTop: '12px' }}>
              {scanProgress || 'Processing your receipt'}
            </p>
          </div>
        );

      case 'items':
        if (!scanResult) {
          setCurrentScreen('welcome');
          return null;
        }

        const items = scanResult.items.map(item => ({
          id: item.id,
          emoji: item.emoji || '🍽️',
          name: item.label,
          price: item.price
        }));

        return (
          <ItemList
            items={items}
            people={people}
            onNext={() => setCurrentScreen('assign')}
            restaurantName={scanResult.place || "Restaurant"}
            location=""
            date={scanResult.date || new Date().toLocaleDateString()}
            subtotal={scanResult.subtotal || 0}
            tax={scanResult.tax || 0}
            tip={scanResult.tip || 0}
            total={scanResult.total || 0}
          />
        );

      case 'assign':
        if (!scanResult) {
          setCurrentScreen('welcome');
          return null;
        }

        const assignItems = scanResult.items.map(item => ({
          id: item.id,
          emoji: item.emoji || '🍽️',
          name: item.label,
          price: item.price
        }));

        return (
          <AssignItems
            items={assignItems}
            onNext={() => setCurrentScreen('share')}
            onBack={() => setCurrentScreen('items')}
            restaurantName={scanResult.place || "Restaurant"}
            location=""
          />
        );

      case 'share':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '24px',
            background: 'var(--tabby-black)',
          }}>
            <h2 style={{ color: 'var(--tabby-white)' }}>Share Bill</h2>
            {billId && (
              <>
                <p style={{ color: 'var(--tabby-gray)', marginTop: '12px' }}>
                  Share this link with your friends:
                </p>
                <div style={{
                  marginTop: '16px',
                  padding: '12px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  color: 'var(--tabby-blue)',
                }}>
                  {window.location.origin}/receipt/{billId}
                </div>
              </>
            )}
            <button
              onClick={() => {
                setCurrentScreen('welcome');
                setScanResult(null);
                setBillId(null);
                setPeople([]);
                setError(null);
              }}
              style={{
                marginTop: '24px',
                padding: '16px 32px',
                background: 'var(--tabby-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              Start New Bill
            </button>
          </div>
        );

      default:
        return <Welcome onScanReceipt={handleScanReceipt} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tabby-black)' }}>
      {renderScreen()}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};