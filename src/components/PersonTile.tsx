import React from 'react';

export function PersonTile({ 
  name, 
  initials, 
  total = 0, 
  children 
}: {
  name: string;
  initials: string;
  total?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass p-4 md:p-5 flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white grid place-items-center font-semibold text-sm">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-base font-medium text-text-primary truncate">{name}</h3>
          <div className="price-tabular text-lg font-semibold shrink-0">
            ${total.toFixed(2)}
          </div>
        </div>
        {children ? (
          <div className="mt-2 text-sm text-text-secondary">{children}</div>
        ) : (
          <div className="text-sm text-text-tertiary">No items assigned</div>
        )}
      </div>
    </div>
  );
}
