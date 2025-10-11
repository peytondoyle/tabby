import React, { useState } from 'react';
import { PersonCircle } from './PersonCircle';
import './ItemSplitter.css';

interface Person {
  id: string;
  name: string;
  image?: string;
}

interface ItemSplitterProps {
  itemName: string;
  itemEmoji: string;
  itemPrice: number;
  people: Person[];
  assignedTo: string[];
  onSplit: (personIds: string[]) => void;
  onClose: () => void;
}

export const ItemSplitter: React.FC<ItemSplitterProps> = ({
  itemName,
  itemEmoji,
  itemPrice,
  people,
  assignedTo: initialAssigned,
  onSplit,
  onClose,
}) => {
  const [selectedPeople, setSelectedPeople] = useState<string[]>(initialAssigned);

  const togglePerson = (personId: string) => {
    setSelectedPeople(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleConfirm = () => {
    onSplit(selectedPeople);
    onClose();
  };

  const splitAmount = selectedPeople.length > 0
    ? (itemPrice / selectedPeople.length).toFixed(2)
    : itemPrice.toFixed(2);

  return (
    <div className="item-splitter-overlay" onClick={onClose}>
      <div className="item-splitter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="splitter-header">
          <h3>Split Item</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="item-info">
          <span className="item-emoji-large">{itemEmoji}</span>
          <h4>{itemName}</h4>
          <p className="item-total">${itemPrice.toFixed(2)}</p>
        </div>

        <div className="split-info">
          {selectedPeople.length > 0 ? (
            <p>
              Split ${splitAmount} × {selectedPeople.length} people
            </p>
          ) : (
            <p>Select people to split with</p>
          )}
        </div>

        <div className="people-grid">
          {people.map((person) => {
            const isSelected = selectedPeople.includes(person.id);
            return (
              <div
                key={person.id}
                className={`person-select ${isSelected ? 'selected' : ''}`}
                onClick={() => togglePerson(person.id)}
              >
                <PersonCircle
                  name={person.name}
                  image={person.image}
                  size="medium"
                  selected={isSelected}
                />
                <span className="person-name">{person.name}</span>
                {isSelected && (
                  <span className="split-amount">${splitAmount}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="splitter-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={selectedPeople.length === 0}
          >
            Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
};