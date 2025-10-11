import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { FoodIcon } from '../../lib/foodIcons';
import { HomeButton } from '../HomeButton';
import './styles.css';

interface Item {
  id: string;
  emoji: string;
  name?: string;
  label?: string;
  price: number;
}

interface Person {
  id: string;
  name: string;
  items: string[];
  total: number;
}

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  date: string;
  items: Item[];
  people: Person[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  date,
  items,
  people,
  subtotal,
  tax,
  tip,
  total,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Calculate total slides: one for each person + one for full breakdown
  const totalSlides = people.length + 1;

  const getPersonColor = (index: number): string => {
    const colors = [
      '#2C5F7D', // Deep blue
      '#4A6741', // Forest green
      '#6B4C7C', // Deep purple
      '#7C4A44', // Terracotta
    ];
    return colors[index % colors.length];
  };

  const handleShareReceipt = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: 'transparent',
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${restaurantName.replace(/\s+/g, '-')}-receipt.png`;
      link.href = dataUrl;
      link.click();

      // Try native share if available
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${restaurantName}-receipt.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${restaurantName} Receipt`,
          });
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const renderPersonReceipt = (person: Person, personIndex: number) => {
    const personItems = items.filter(item => person.items.includes(item.id));
    const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
    const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
    const personTax = tax * proportion;
    const personTip = tip * proportion;
    const personTotal = itemsSubtotal + personTax + personTip;

    return (
      <div ref={cardRef} className="receipt-card" style={{
        borderTop: `4px solid ${getPersonColor(personIndex)}`
      }}>
        <div className="receipt-header">
          <h2 className="restaurant-name">{restaurantName}</h2>
          <p className="receipt-meta">{date}</p>
        </div>

        <div className="person-badge">
          <div
            className="person-avatar-small"
            style={{ background: getPersonColor(personIndex) }}
          >
            {person.name[0].toUpperCase()}
          </div>
          <span className="person-name-badge">{person.name}</span>
        </div>

        <div className="receipt-items">
          {personItems.map(item => (
            <div key={item.id} className="receipt-item">
              <span className="item-info">
                <span className="item-emoji">
                  <FoodIcon itemName={item.name || item.label || 'Item'} emoji={item.emoji} size={18} color="#1a1a1a" />
                </span>
                <span className="item-name">{item.name || item.label || 'Item'}</span>
              </span>
              <span className="item-price">${item.price ? item.price.toFixed(2) : '0.00'}</span>
            </div>
          ))}
        </div>

        <div className="receipt-totals">
          <div className="receipt-total-row">
            <span>Subtotal:</span>
            <span>${itemsSubtotal.toFixed(2)}</span>
          </div>
          <div className="receipt-total-row">
            <span>Tax:</span>
            <span>${personTax.toFixed(2)}</span>
          </div>
          <div className="receipt-total-row">
            <span>Tip:</span>
            <span>${personTip.toFixed(2)}</span>
          </div>
          <div className="receipt-total-row receipt-grand-total">
            <span>Total:</span>
            <span>${personTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="receipt-footer">
          <span className="tabby-logo">📋</span>
          <span>Split with Tabby</span>
        </div>
      </div>
    );
  };

  const renderFullBreakdown = () => {
    return (
      <div ref={cardRef} className="receipt-card receipt-card-tall">
        <div className="receipt-header">
          <h2 className="restaurant-name">{restaurantName}</h2>
          <p className="receipt-meta">{date}</p>
        </div>

        {people.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No people added yet
          </div>
        )}

        {people.map((person, personIndex) => {
          const personItems = items.filter(item => person.items.includes(item.id));
          const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
          const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
          const personTax = tax * proportion;
          const personTip = tip * proportion;
          const personTotal = itemsSubtotal + personTax + personTip;

          return (
            <div key={person.id} className="person-breakdown">
              <div className="person-breakdown-header">
                <div
                  className="person-avatar-small"
                  style={{ background: getPersonColor(personIndex) }}
                >
                  {person.name[0].toUpperCase()}
                </div>
                <span className="person-name-breakdown">{person.name}</span>
              </div>

              <div className="receipt-items-compact">
                {personItems.map(item => (
                  <div key={item.id} className="receipt-item-compact">
                    <span className="item-info-compact">
                      <span className="item-emoji-compact">
                        <FoodIcon itemName={item.name || item.label || 'Item'} emoji={item.emoji} size={14} color="#1a1a1a" />
                      </span>
                      <span className="item-name-compact">{item.name || item.label || 'Item'}</span>
                    </span>
                    <span className="item-price-compact">${item.price ? item.price.toFixed(2) : '0.00'}</span>
                  </div>
                ))}
              </div>

              <div className="person-totals-compact">
                <div className="total-row-compact">
                  <span>Subtotal:</span>
                  <span>${itemsSubtotal.toFixed(2)}</span>
                </div>
                <div className="total-row-compact">
                  <span>Tax:</span>
                  <span>${personTax.toFixed(2)}</span>
                </div>
                <div className="total-row-compact">
                  <span>Tip:</span>
                  <span>${personTip.toFixed(2)}</span>
                </div>
                <div className="total-row-compact total-row-bold">
                  <span>Total:</span>
                  <span>${personTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="receipt-grand-totals">
          <div className="receipt-total-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="receipt-total-row">
            <span>Tax:</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="receipt-total-row receipt-grand-total">
            <span>Bill Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="receipt-footer">
          <span className="tabby-logo">📋</span>
          <span>Split with Tabby</span>
        </div>
      </div>
    );
  };

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const getSlideTitle = () => {
    if (currentSlide < people.length) {
      return `${people[currentSlide].name}'s Bill`;
    }
    return 'Split by Person';
  };

  return (
    <div className="share-receipt-modal">
      <HomeButton />
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h1>Share Bill</h1>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="carousel-container">
            <button
              className="carousel-btn carousel-btn-left"
              onClick={handlePrevSlide}
              aria-label="Previous"
            >
              ‹
            </button>

            <div className="carousel-content">
              {currentSlide < people.length
                ? renderPersonReceipt(people[currentSlide], currentSlide)
                : renderFullBreakdown()
              }
            </div>

            <button
              className="carousel-btn carousel-btn-right"
              onClick={handleNextSlide}
              aria-label="Next"
            >
              ›
            </button>
          </div>

          <div className="carousel-title">{getSlideTitle()}</div>

          <div className="carousel-dots">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>

          <button className="share-button" onClick={handleShareReceipt}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
