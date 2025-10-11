import React from 'react';
import './ItemPill.css';

interface ItemPillProps {
  emoji: string;
  name: string;
  price?: number;
  onClick?: () => void;
  selected?: boolean;
  assigned?: boolean;
}

export const ItemPill: React.FC<ItemPillProps> = ({
  emoji,
  name,
  price,
  onClick,
  selected = false,
  assigned = false
}) => {
  return (
    <div
      className={`billy-item-pill ${selected ? 'selected' : ''} ${assigned ? 'assigned' : ''}`}
      onClick={onClick}
    >
      <span className="item-emoji">{emoji}</span>
      <span className="item-name">{name}</span>
      {price !== undefined && (
        <span className="item-price">${price.toFixed(2)}</span>
      )}
    </div>
  );
};