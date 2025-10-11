import React, { useState, useRef, useEffect } from 'react';
import { PersonCircle } from '../components/PersonCircle';
import './AssignItems.css';

interface Item {
  id: string;
  emoji: string;
  name: string;
  price: number;
  assignedTo?: string[];
}

interface Person {
  id: string;
  name: string;
  image?: string;
  items: string[]; // item IDs
}

interface AssignItemsProps {
  items: Item[];
  onNext: () => void;
  onBack?: () => void;
  restaurantName: string;
  location?: string;
}

export const AssignItems: React.FC<AssignItemsProps> = ({
  items: initialItems,
  onNext,
  onBack,
  restaurantName,
  location,
}) => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [people, setPeople] = useState<Person[]>([]);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverPerson, setDragOverPerson] = useState<string | null>(null);

  // Auto-show add people modal if no people
  useEffect(() => {
    if (people.length === 0) {
      setShowAddPeople(true);
    }
  }, []);

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: newPersonName.trim(),
        items: [],
      };
      setPeople([...people, newPerson]);
      setNewPersonName('');
      setShowAddPeople(false);
    }
  };

  const handleRemovePerson = (personId: string) => {
    // Remove person and unassign their items
    setPeople(people.filter(p => p.id !== personId));
    setItems(items.map(item => ({
      ...item,
      assignedTo: item.assignedTo?.filter(id => id !== personId)
    })));
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverPerson(null);
  };

  const handleDragOver = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    setDragOverPerson(personId);
  };

  const handleDragLeave = () => {
    setDragOverPerson(null);
  };

  const handleDrop = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    if (draggedItem) {
      assignItemToPerson(draggedItem, personId);
    }
    setDragOverPerson(null);
    setDraggedItem(null);
  };

  const assignItemToPerson = (itemId: string, personId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const currentAssignees = item.assignedTo || [];
        if (currentAssignees.includes(personId)) {
          // Remove if already assigned (toggle)
          return {
            ...item,
            assignedTo: currentAssignees.filter(id => id !== personId)
          };
        } else {
          // Add to assignees
          return {
            ...item,
            assignedTo: [...currentAssignees, personId]
          };
        }
      }
      return item;
    }));

    setPeople(people.map(person => {
      if (person.id === personId) {
        if (person.items.includes(itemId)) {
          // Remove if already assigned (toggle)
          return {
            ...person,
            items: person.items.filter(id => id !== itemId)
          };
        } else {
          // Add to person's items
          return {
            ...person,
            items: [...person.items, itemId]
          };
        }
      }
      return person;
    }));
  };

  const handleItemClick = (itemId: string) => {
    // On mobile, clicking an item when people exist assigns it to the first unassigned person
    if (people.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item && (!item.assignedTo || item.assignedTo.length === 0)) {
        assignItemToPerson(itemId, people[0].id);
      }
    }
  };

  const unassignedItems = items.filter(item => !item.assignedTo || item.assignedTo.length === 0);
  const hasUnassignedItems = unassignedItems.length > 0;

  return (
    <div className="billy-assign-items">
      <div className="assign-header">
        <div className="restaurant-info">
          <h1>{restaurantName}</h1>
          {location && <p>{location}</p>}
        </div>
        <button className="menu-button">•••</button>
      </div>

      <div className="assign-content">
        {/* People circles */}
        <div className="people-section">
          {people.map((person) => (
            <div
              key={person.id}
              className={`person-drop-zone ${dragOverPerson === person.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, person.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, person.id)}
            >
              <PersonCircle
                name={person.name}
                image={person.image}
                size="large"
              />
              <span className="person-name">{person.name}</span>
              <span className="person-count">{person.items.length}</span>
            </div>
          ))}

          <button
            className="add-person-circle"
            onClick={() => setShowAddPeople(true)}
          >
            <span>+</span>
          </button>
        </div>

        {/* Unassigned items */}
        <div className="items-section">
          {unassignedItems.map((item) => (
            <div
              key={item.id}
              className={`item-pill ${draggedItem === item.id ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleItemClick(item.id)}
            >
              <span className="item-emoji">{item.emoji}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-price">${item.price.toFixed(2)}</span>
            </div>
          ))}

          {!hasUnassignedItems && (
            <div className="all-assigned">
              ✅ All items assigned!
            </div>
          )}
        </div>
      </div>

      <div className="assign-footer">
        <button className="people-tab active">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>

        <button className="items-tab" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 9h6m-6 4h6m-6 4h4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>

        <button
          className="next-button"
          onClick={onNext}
          disabled={hasUnassignedItems}
        >
          →
        </button>
      </div>

      {/* Add People Modal */}
      {showAddPeople && (
        <div className="modal-overlay" onClick={() => setShowAddPeople(false)}>
          <div className="add-people-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add People</h2>
              <button onClick={() => setShowAddPeople(false)}>×</button>
            </div>

            <div className="people-list">
              {people.map((person) => (
                <div key={person.id} className="person-row">
                  <PersonCircle name={person.name} image={person.image} size="small" />
                  <span className="person-name">{person.name}</span>
                  <button
                    className="remove-button"
                    onClick={() => handleRemovePerson(person.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="add-person-form">
              <input
                type="text"
                placeholder="Enter name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPerson()}
                autoFocus
              />
              <button
                className="add-button"
                onClick={handleAddPerson}
                disabled={!newPersonName.trim()}
              >
                Add Person
              </button>
            </div>

            <button className="contact-button">
              👤 Add from Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};