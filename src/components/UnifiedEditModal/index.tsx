import React, { useState } from 'react';
import { FoodIcon } from '../../lib/foodIcons';
import './styles.css';

interface Item {
  id: string;
  emoji: string;
  name: string;
  price: number;
  assignedTo?: string;
  splitBetween?: string[];
}

interface Person {
  id: string;
  name: string;
  items: string[];
  total: number;
}

interface UnifiedEditModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Restaurant data
  restaurantName: string;
  onRestaurantNameSave: (name: string) => Promise<void>;

  // Items data
  items: Item[];
  onItemsSave: (items: Item[]) => void;

  // People data
  people: Person[];
  onPeopleUpdate: (people: Person[]) => void;
  onPersonAdd: (name: string) => Promise<void>;
  onPersonRemove: (personId: string) => void;

  // Bill totals
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  onBillTotalsSave: (data: { subtotal: number; tax: number; tip: number }) => Promise<void>;

  // Receipt link
  billToken: string | null;

  // Person colors
  getPersonColor: (index: number) => string;
}

type EditSection = 'overview' | 'restaurant' | 'items' | 'people' | 'totals';

export const UnifiedEditModal: React.FC<UnifiedEditModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  onRestaurantNameSave,
  items,
  onItemsSave,
  people,
  onPeopleUpdate,
  onPersonAdd,
  onPersonRemove,
  subtotal,
  tax,
  tip,
  total,
  onBillTotalsSave,
  billToken,
  getPersonColor
}) => {
  const [activeSection, setActiveSection] = useState<EditSection>('overview');

  // Restaurant name editing
  const [editableRestaurantName, setEditableRestaurantName] = useState(restaurantName);
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);

  // Items editing
  const [editableItems, setEditableItems] = useState<Item[]>(items);

  // People editing
  const [newPersonName, setNewPersonName] = useState('');

  // Bill totals editing
  const [editableSubtotal, setEditableSubtotal] = useState(subtotal.toFixed(2));
  const [editableTax, setEditableTax] = useState(tax.toFixed(2));
  const [editableTip, setEditableTip] = useState(tip.toFixed(2));
  const [isSavingTotals, setIsSavingTotals] = useState(false);

  // Reset editable state when opening
  React.useEffect(() => {
    if (isOpen) {
      setEditableRestaurantName(restaurantName);
      setEditableItems([...items]);
      setEditableSubtotal(subtotal.toFixed(2));
      setEditableTax(tax.toFixed(2));
      setEditableTip(tip.toFixed(2));
      setActiveSection('overview');
    }
  }, [isOpen, restaurantName, items, subtotal, tax, tip]);

  const handleRestaurantSave = async () => {
    if (!editableRestaurantName.trim()) return;
    setIsSavingRestaurant(true);
    try {
      await onRestaurantNameSave(editableRestaurantName.trim());
      setActiveSection('overview');
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  const handleItemsSave = () => {
    onItemsSave(editableItems);
    setActiveSection('overview');
  };

  const handleTotalsSave = async () => {
    setIsSavingTotals(true);
    try {
      await onBillTotalsSave({
        subtotal: parseFloat(editableSubtotal) || 0,
        tax: parseFloat(editableTax) || 0,
        tip: parseFloat(editableTip) || 0
      });
      setActiveSection('overview');
    } finally {
      setIsSavingTotals(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    await onPersonAdd(newPersonName.trim());
    setNewPersonName('');
  };

  if (!isOpen) return null;

  return (
    <div className="unified-edit-overlay" onClick={onClose}>
      <div className="unified-edit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Navigation */}
        <div className="unified-edit-header">
          {activeSection !== 'overview' && (
            <button
              className="unified-back-btn"
              onClick={() => setActiveSection('overview')}
            >
              ← Back
            </button>
          )}
          <h2 className="unified-edit-title">
            {activeSection === 'overview' && 'Bill Details'}
            {activeSection === 'restaurant' && 'Edit Restaurant'}
            {activeSection === 'items' && 'Edit Items'}
            {activeSection === 'people' && 'Manage People'}
            {activeSection === 'totals' && 'Edit Totals'}
          </h2>
          <button className="unified-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="unified-edit-content">
          {activeSection === 'overview' && (
            <div className="unified-overview">
              {/* Restaurant Name Section */}
              <div className="unified-section">
                <div className="unified-section-header">
                  <div>
                    <h3 className="unified-section-title">Restaurant</h3>
                    <p className="unified-section-value">{restaurantName}</p>
                  </div>
                  <button
                    className="unified-edit-btn"
                    onClick={() => setActiveSection('restaurant')}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Receipt Link */}
              {billToken && (
                <div className="unified-section">
                  <h3 className="unified-section-label">Receipt Link</h3>
                  <div className="unified-link-container">
                    <input
                      readOnly
                      value={`${window.location.origin}/receipt/${billToken}`}
                      onClick={(e) => e.currentTarget.select()}
                      className="unified-link-input"
                    />
                    <button
                      className="unified-copy-btn"
                      onClick={async () => {
                        const url = `${window.location.origin}/receipt/${billToken}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          const btn = document.activeElement as HTMLButtonElement;
                          const originalText = btn.textContent;
                          btn.textContent = '✓ Copied!';
                          setTimeout(() => {
                            btn.textContent = originalText;
                          }, 2000);
                        } catch (error) {
                          console.error('Error copying:', error);
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="unified-help-text">Share this link to view the receipt anytime</p>
                </div>
              )}

              {/* People Section */}
              <div className="unified-section">
                <div className="unified-section-header">
                  <h3 className="unified-section-title">People ({people.length})</h3>
                  <button
                    className="unified-edit-btn"
                    onClick={() => setActiveSection('people')}
                  >
                    Manage
                  </button>
                </div>
                <div className="unified-people-list">
                  {people.map((person, index) => (
                    <div key={person.id} className="unified-person-row">
                      <div className="unified-person-info">
                        <div
                          className="unified-person-avatar"
                          style={{ background: getPersonColor(index) }}
                        >
                          {person.name[0].toUpperCase()}
                        </div>
                        <span>{person.name}</span>
                      </div>
                      <span className="unified-person-total">${person.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Section */}
              <div className="unified-section">
                <div className="unified-section-header">
                  <h3 className="unified-section-title">Items ({items.length})</h3>
                  <button
                    className="unified-edit-btn"
                    onClick={() => setActiveSection('items')}
                  >
                    Edit
                  </button>
                </div>
                <div className="unified-items-preview">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.id} className="unified-item-preview-row">
                      <FoodIcon itemName={item.name} emoji={item.emoji} size={16} />
                      <span className="unified-item-name">{item.name}</span>
                      <span className="unified-item-price">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="unified-more-text">+{items.length - 3} more items</p>
                  )}
                </div>
              </div>

              {/* Bill Totals Section */}
              <div className="unified-section">
                <div className="unified-section-header">
                  <h3 className="unified-section-title">Bill Totals</h3>
                  <button
                    className="unified-edit-btn"
                    onClick={() => setActiveSection('totals')}
                  >
                    Edit
                  </button>
                </div>
                <div className="unified-totals-preview">
                  <div className="unified-total-row">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="unified-total-row">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="unified-total-row">
                    <span>Tip</span>
                    <span>${tip.toFixed(2)}</span>
                  </div>
                  <div className="unified-total-row unified-total-final">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'restaurant' && (
            <div className="unified-edit-section">
              <div className="unified-input-group">
                <label className="unified-label">Restaurant Name</label>
                <input
                  type="text"
                  value={editableRestaurantName}
                  onChange={(e) => setEditableRestaurantName(e.target.value)}
                  className="unified-input"
                  placeholder="Enter restaurant name"
                  autoFocus
                />
              </div>
              <div className="unified-actions">
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => {
                    setEditableRestaurantName(restaurantName);
                    setActiveSection('overview');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="unified-btn unified-btn-primary"
                  onClick={handleRestaurantSave}
                  disabled={!editableRestaurantName.trim() || isSavingRestaurant}
                >
                  {isSavingRestaurant ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'items' && (
            <div className="unified-edit-section">
              <div className="unified-items-list">
                {editableItems.map((item, index) => (
                  <div key={item.id} className="unified-item-edit-card">
                    <div className="unified-item-fields">
                      <input
                        type="text"
                        value={item.emoji}
                        onChange={(e) => {
                          const newItems = [...editableItems];
                          newItems[index] = { ...newItems[index], emoji: e.target.value };
                          setEditableItems(newItems);
                        }}
                        className="unified-input unified-emoji-input"
                        placeholder="🍽️"
                      />
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...editableItems];
                          newItems[index] = { ...newItems[index], name: e.target.value };
                          setEditableItems(newItems);
                        }}
                        className="unified-input unified-item-name-input"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...editableItems];
                          newItems[index] = {
                            ...newItems[index],
                            price: parseFloat(e.target.value) || 0
                          };
                          setEditableItems(newItems);
                        }}
                        className="unified-input unified-price-input"
                        placeholder="0.00"
                      />
                    </div>
                    <button
                      className="unified-remove-btn"
                      onClick={() => {
                        setEditableItems(editableItems.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="unified-add-item-btn"
                onClick={() => {
                  setEditableItems([
                    ...editableItems,
                    {
                      id: `item-${Date.now()}`,
                      emoji: '🍽️',
                      name: '',
                      price: 0
                    }
                  ]);
                }}
              >
                + Add Item
              </button>
              <div className="unified-actions">
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => {
                    setEditableItems([...items]);
                    setActiveSection('overview');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="unified-btn unified-btn-primary"
                  onClick={handleItemsSave}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'people' && (
            <div className="unified-edit-section">
              <div className="unified-people-manage">
                {people.map((person, index) => (
                  <div key={person.id} className="unified-person-manage-row">
                    <div className="unified-person-info">
                      <div
                        className="unified-person-avatar"
                        style={{ background: getPersonColor(index) }}
                      >
                        {person.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="unified-person-name">{person.name}</div>
                        <div className="unified-person-items-count">
                          {person.items.length} items • ${person.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <button
                      className="unified-remove-person-btn"
                      onClick={() => onPersonRemove(person.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="unified-add-person-section">
                <div className="unified-input-group">
                  <label className="unified-label">Add New Person</label>
                  <div className="unified-add-person-row">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                      className="unified-input"
                      placeholder="Enter name"
                    />
                    <button
                      className="unified-btn unified-btn-primary"
                      onClick={handleAddPerson}
                      disabled={!newPersonName.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="unified-actions">
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => setActiveSection('overview')}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {activeSection === 'totals' && (
            <div className="unified-edit-section">
              <div className="unified-input-group">
                <label className="unified-label">Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  value={editableSubtotal}
                  onChange={(e) => setEditableSubtotal(e.target.value)}
                  className="unified-input unified-money-input"
                />
              </div>
              <div className="unified-input-group">
                <label className="unified-label">Tax</label>
                <input
                  type="number"
                  step="0.01"
                  value={editableTax}
                  onChange={(e) => setEditableTax(e.target.value)}
                  className="unified-input unified-money-input"
                />
              </div>
              <div className="unified-input-group">
                <label className="unified-label">Tip</label>
                <input
                  type="number"
                  step="0.01"
                  value={editableTip}
                  onChange={(e) => setEditableTip(e.target.value)}
                  className="unified-input unified-money-input"
                />
              </div>
              <div className="unified-total-preview">
                <span>Total</span>
                <span className="unified-total-amount">
                  ${(
                    (parseFloat(editableSubtotal) || 0) +
                    (parseFloat(editableTax) || 0) +
                    (parseFloat(editableTip) || 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="unified-actions">
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => {
                    setEditableSubtotal(subtotal.toFixed(2));
                    setEditableTax(tax.toFixed(2));
                    setEditableTip(tip.toFixed(2));
                    setActiveSection('overview');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="unified-btn unified-btn-primary"
                  onClick={handleTotalsSave}
                  disabled={isSavingTotals}
                >
                  {isSavingTotals ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
