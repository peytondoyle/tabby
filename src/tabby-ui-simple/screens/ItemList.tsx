import React, { useState } from 'react';
import { ItemPill } from '../components/ItemPill';
import './ItemList.css';

interface Item {
  id: string;
  emoji: string;
  name: string;
  price: number;
}

interface Person {
  id: string;
  name: string;
  image?: string;
  items: Item[];
  total: number;
}

interface ItemListProps {
  items: Item[];
  people: Person[];
  onNext: () => void;
  restaurantName?: string;
  location?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  people,
  onNext,
  restaurantName = "Restaurant",
  location = "",
  date = new Date().toLocaleDateString(),
  subtotal = 0,
  tax = 0,
  tip = 0,
  total = 0
}) => {
  const [view, setView] = useState<'items' | 'people'>('items');

  return (
    <div className="billy-item-list">
      <div className="list-header">
        <div className="restaurant-info">
          <h1 className="restaurant-name">{restaurantName}</h1>
          <p className="restaurant-meta">
            {location && `${location} • `}{date}
          </p>
        </div>
        <button className="menu-button">•••</button>
      </div>

      <div className="list-content">
        {view === 'items' ? (
          <>
            <div className="items-section">
              {items.map((item) => (
                <ItemPill
                  key={item.id}
                  emoji={item.emoji}
                  name={item.name}
                  price={item.price}
                />
              ))}
            </div>

            <div className="totals-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Sales Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Tip:</span>
                <span>${tip.toFixed(2)}</span>
              </div>
              <div className="total-row total">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="people-section">
            {people.map((person) => (
              <div key={person.id} className="person-card">
                <div className="person-header">
                  {person.image ? (
                    <img src={person.image} alt={person.name} className="person-avatar" />
                  ) : (
                    <div className="person-avatar-placeholder">
                      {person.name[0].toUpperCase()}
                    </div>
                  )}
                  <h3>{person.name}</h3>
                </div>
                <div className="person-items">
                  {person.items.map((item) => (
                    <div key={item.id} className="person-item">
                      <span>{item.emoji} {item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="person-total">${person.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="list-footer">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'items' ? 'active' : ''}`}
            onClick={() => setView('items')}
          >
            All Items
          </button>
          <button
            className={`toggle-btn ${view === 'people' ? 'active' : ''}`}
            onClick={() => setView('people')}
          >
            By Person
          </button>
        </div>

        <button className="share-button" onClick={onNext}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8.68 13.34L15.32 9.66M8.68 10.66L15.32 14.34M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};