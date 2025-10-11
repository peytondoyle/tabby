import React from 'react';

export function ItemRow({ 
  emoji, 
  name, 
  price 
}: { 
  emoji?: string;
  name: string;
  price: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-xl leading-none">{emoji ?? '🍽️'}</span>
        <span className="truncate text-sm">{name}</span>
      </div>
      <span className="price-tabular text-sm shrink-0">${price.toFixed(2)}</span>
    </div>
  );
}
