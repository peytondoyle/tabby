import React, { useState } from 'react';
import { useFlowAdapter } from '../adapters/useFlowAdapter';
import ReceiptCard from '../kit/ReceiptCard';
import ProgressDots from '../kit/ProgressDots';
import Button from '../kit/Button';

interface ShareModalProps {
  onBack: () => void;
}

export default function ShareModal({ onBack }: ShareModalProps) {
  const { bill, people, items, computeTotals } = useFlowAdapter();
  const [currentView, setCurrentView] = useState(0);
  const totals = computeTotals();

  // Create receipt data for display
  const receiptData = {
    title: bill?.title || 'Receipt',
    location: bill?.place || 'Location',
    date: bill?.date || 'Date',
    items: items.map(item => ({
      emoji: item.emoji,
      name: item.label,
      price: item.price
    })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    tip: totals.tip,
    total: totals.total
  };

  // Create person-specific receipts
  const personReceipts = people.map(person => {
    const personTotal = totals.personTotals[person.id] || 0;
    // For now, show all items for each person - this would be filtered by actual assignments
    const personItems = items;

    return {
      title: `${person.name}'s Bill`,
      location: bill?.place || 'Location',
      date: bill?.date || 'Date',
      items: personItems.map(item => ({
        emoji: item.emoji,
        name: item.label,
        price: item.price
      })),
      subtotal: personTotal,
      tax: 0, // Would need to calculate tax share
      tip: 0, // Would need to calculate tip share
      total: personTotal
    };
  });

  const allViews = [receiptData, ...personReceipts];
  const currentReceipt = allViews[currentView];

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0C0D10] text-white">
      {/* Header */}
      <div className="text-center py-8 px-6">
        <h1 className="text-4xl font-bold mb-2">Share Receipt</h1>
        <p className="text-lg text-white/70">
          {currentView === 0 ? 'Complete receipt' : `${people[currentView - 1]?.name}'s split`}
        </p>
      </div>

      {/* White Receipt Card */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="max-w-[420px] w-full bg-white text-black rounded-[24px] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.32)]">
          {/* Receipt Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="text-xl font-bold text-black font-mono tracking-wider">
                {currentReceipt.title}
              </div>
              <div className="text-sm text-gray-600 font-mono">
                {currentReceipt.location} • {currentReceipt.date}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 mb-6">
            {currentReceipt.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.emoji || '•'}</span>
                  <span className="text-black font-mono">{item.name}</span>
                </div>
                <span className="font-mono text-black">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <hr className="border-gray-300 mb-4" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-mono uppercase tracking-wider">
              <span>Subtotal:</span>
              <span>${currentReceipt.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-mono uppercase tracking-wider">
              <span>SALES TAX:</span>
              <span>${currentReceipt.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-mono uppercase tracking-wider">
              <span>Tip:</span>
              <span>${currentReceipt.tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold font-mono pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span>${currentReceipt.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="mt-6 text-center">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              Split with Tabby
            </span>
          </div>
        </div>
      </div>

      {/* Pager Dots */}
      <div className="text-center mb-8">
        <div className="flex justify-center gap-2">
          {allViews.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentView ? 'bg-blue-500' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0C0D10]/85 backdrop-blur-sm border-t border-white/10 py-4 px-6">
        <div className="flex gap-4 max-w-md mx-auto">
          <Button 
            onClick={onBack} 
            className="flex-1 h-14 text-lg bg-white/10 text-white border border-white/20"
          >
            Back to Assign
          </Button>
          <Button 
            primary 
            className="flex-1 h-14 text-lg"
          >
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
