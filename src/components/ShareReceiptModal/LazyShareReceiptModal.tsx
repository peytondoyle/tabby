import React, { lazy, Suspense } from 'react';

// Lazy load the ShareReceiptModal component
const ShareReceiptModal = lazy(() => import('./index').then(module => ({ default: module.ShareReceiptModal })));

interface LazyShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  date: string;
  items: Array<{
    id: string;
    emoji: string;
    name?: string;
    label?: string;
    price: number;
  }>;
  people: Array<{
    id: string;
    name: string;
    items: string[];
    total: number;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  discount?: number;
  serviceFee?: number;
  total: number;
}

export const LazyShareReceiptModal: React.FC<LazyShareReceiptModalProps> = (props) => {
  // Don't render anything if not open (saves loading the chunk)
  if (!props.isOpen) return null;

  return (
    <Suspense fallback={null}>
      <ShareReceiptModal {...props} />
    </Suspense>
  );
};
