import React, { useState, useEffect } from 'react';
import { useFlowAdapter } from '../adapters/useFlowAdapter';
import Button from '../kit/Button';
import Avatar from '../kit/Avatar';

interface TabbyAssignProps {
  onNext: () => void;
}

export default function TabbyAssign({ onNext }: TabbyAssignProps) {
  const { people, items, computeTotals, assign, unassign, getItemAssignments } = useFlowAdapter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  
  const totals = computeTotals();
  const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0);

  // Show hint if there are unassigned items
  useEffect(() => {
    if (unassignedItems.length > 0) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [unassignedItems.length]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleAssignToPerson = (personId: string) => {
    selectedItems.forEach(itemId => {
      assign(itemId, personId);
    });
    setSelectedItems(new Set());
    
    // Show success feedback
    const person = people.find(p => p.id === personId);
    if (person) {
      // Could add a toast notification here
      console.log(`Assigned ${selectedItems.size} items to ${person.name}`);
    }
  };

  const handleUnassignItem = (itemId: string, personId: string) => {
    unassign(itemId, personId);
  };

  const getPersonItems = (personId: string) => {
    return items.filter(item => getItemAssignments(item.id).includes(personId));
  };

  const getPersonTotal = (personId: string) => {
    return totals.personTotals[personId] || 0;
  };

  const hasAssignedItems = people.some(person => getPersonItems(person.id).length > 0);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0C0D10] text-white">
      {/* Header */}
      <div className="text-center py-8 px-6">
        <h1 className="text-4xl font-bold mb-2">Assign Items</h1>
        <p className="text-lg text-white/70">
          {selectedItems.size > 0
            ? `Tap a person to assign ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}`
            : "Tap items below, then tap a person"
          }
        </p>
        
        {/* Hint chip */}
        {showHint && unassignedItems.length > 0 && (
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm">
            💡 Tap items below, then tap a person
          </div>
        )}
      </div>

      {/* Unassigned Items Pills */}
      {unassignedItems.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-white/90">Unassigned Items</h2>
          <div className="flex flex-wrap gap-3">
            {unassignedItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemToggle(item.id)}
                className={`px-4 py-2 rounded-[18px] border transition-all ${
                  selectedItems.has(item.id)
                    ? 'bg-blue-500/20 border-blue-500 outline-2 outline-blue-500/25'
                    : 'bg-white/6 border-white/14 hover:bg-white/8'
                }`}
              >
                <span className="text-white font-medium">
                  {item.emoji} {item.label} ${item.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* People Cards */}
      <div className="flex-1 px-6 pb-24">
        <div className="grid gap-6 max-w-4xl mx-auto">
          {people.map((person) => {
            const personItems = getPersonItems(person.id);
            const personTotal = getPersonTotal(person.id);
            const isSelected = selectedItems.size > 0;
            
            return (
              <div
                key={person.id}
                className={`bg-[#1C1F27] border rounded-[24px] p-6 shadow-md transition-all ${
                  isSelected 
                    ? 'border-blue-500/50 hover:border-blue-500/70 animate-pulse' 
                    : 'border-white/12 hover:border-white/20'
                }`}
                onClick={() => isSelected && handleAssignToPerson(person.id)}
              >
                {/* Person Header */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar 
                    src={person.avatar} 
                    initials={person.name.charAt(0).toUpperCase()} 
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{person.name}</h3>
                    <p className="text-white/70">
                      {personItems.length} items • <span className="font-mono">${personTotal.toFixed(2)}</span>
                    </p>
                  </div>
                  {personItems.length > 1 && (
                    <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {personItems.length}
                    </div>
                  )}
                </div>

                {/* Assigned Items */}
                {personItems.length > 0 ? (
                  <div className="space-y-2">
                    {personItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.emoji}</span>
                          <span className="text-white/90">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white/90">${item.price.toFixed(2)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassignItem(item.id, person.id);
                            }}
                            className="text-white/50 hover:text-white/80 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-white/50">
                    No items assigned yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0C0D10]/85 backdrop-blur-sm border-t border-white/10 py-4 px-6">
        <Button 
          primary 
          onClick={onNext}
          disabled={!hasAssignedItems}
          className={`w-full h-14 text-lg font-semibold ${
            !hasAssignedItems 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          {hasAssignedItems 
            ? 'Split Bill' 
            : `Assign ${unassignedItems.length} item${unassignedItems.length !== 1 ? 's' : ''} to continue`
          }
        </Button>
      </div>
    </div>
  );
}
