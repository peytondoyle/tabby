import React, { useState, useRef } from 'react';
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
  discount: number;
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
  discount,
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
      console.log('[ShareReceipt] Starting image generation...');
      console.log('[ShareReceipt] Card dimensions:', {
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight
      });

      // Wait a bit for any fonts/emojis to fully render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamic import html2canvas for code splitting
      const html2canvas = (await import('html2canvas')).default;

      // Generate high-quality image
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High DPI for sharper images
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        removeContainer: true,
        // Let html2canvas use natural element dimensions
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      console.log('[ShareReceipt] Image generated successfully, size:', dataUrl.length);

      // Create download link
      const timestamp = new Date().getTime();
      const filename = `${restaurantName.replace(/\s+/g, '-')}-${timestamp}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      console.log('[ShareReceipt] Download triggered:', filename);

      // Try native share if available
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: 'image/png' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${restaurantName} Receipt`,
              text: `Split bill from ${restaurantName}`
            });
            console.log('[ShareReceipt] Native share succeeded');
          }
        } catch (shareError) {
          console.log('[ShareReceipt] Native share failed or cancelled:', shareError);
        }
      }
    } catch (error) {
      console.error('[ShareReceipt] Error generating image:', error);
      alert('Failed to generate receipt image. Please try again.');
    }
  };

  const renderPersonReceipt = (person: Person, personIndex: number) => {
    const personItems = items.filter(item => person.items.includes(item.id));
    const itemsSubtotal = personItems.reduce((sum, item) => sum + item.price, 0);
    const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
    const personDiscount = discount * proportion;
    const personTax = tax * proportion;
    const personTip = tip * proportion;
    const personTotal = itemsSubtotal - personDiscount + personTax + personTip;

    return (
      <div ref={cardRef} className="receipt-card modern-person-card">
        {/* Person Header */}
        <div className="modern-person-header">
          <h2 className="modern-person-title">{person.name}</h2>
          <p className="modern-person-subtitle">{restaurantName}</p>
          <p className="modern-person-date">{date}</p>
        </div>

        {/* Items List */}
        <div className="modern-items-section">
          <h3 className="modern-section-label">Items</h3>
          <div className="modern-items-list">
            {personItems.map(item => (
              <div key={item.id} className="modern-item-row">
                <div className="modern-item-info">
                  <span className="modern-item-emoji">
                    <FoodIcon itemName={item.name || item.label || 'Item'} emoji={item.emoji} size={8} color="#1a1a1a" />
                  </span>
                  <span className="modern-item-name">{item.name || item.label || 'Item'}</span>
                </div>
                <span className="modern-item-price">${item.price ? item.price.toFixed(2) : '0.00'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div className="modern-breakdown-section">
          <div className="modern-breakdown-row">
            <span>Subtotal</span>
            <span>${itemsSubtotal.toFixed(2)}</span>
          </div>
          {personDiscount > 0 && (
            <div className="modern-breakdown-row">
              <span>Discount</span>
              <span>-${personDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="modern-breakdown-row">
            <span>Tax</span>
            <span>${personTax.toFixed(2)}</span>
          </div>
          <div className="modern-breakdown-row">
            <span>Tip</span>
            <span>${personTip.toFixed(2)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="modern-person-total-section">
          <span className="modern-total-label">Amount Due</span>
          <span className="modern-total-amount">${personTotal.toFixed(2)}</span>
        </div>

        {/* Footer */}
        <div className="modern-footer">
          <span className="modern-footer-icon">📋</span>
          <span className="modern-footer-text">Split with Tabby</span>
        </div>
      </div>
    );
  };

  const renderFullBreakdown = () => {
    return (
      <div ref={cardRef} className="receipt-card modern-summary-card">
        {/* Header */}
        <div className="modern-header">
          <h2 className="modern-restaurant-name">{restaurantName}</h2>
          <p className="modern-subtitle">{date}</p>
        </div>

        {/* People List */}
        <div className="modern-people-list">
          {people.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
              No people added yet
            </div>
          )}

          {people.map((person, personIndex) => (
            <div key={person.id} className="modern-person-row">
              <span className="modern-person-name">{person.name}</span>
              <span className="modern-person-total">${person.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Bill Total */}
        <div className="modern-bill-total">
          <span className="modern-total-label">Bill Total</span>
          <span className="modern-total-amount">${total.toFixed(2)}</span>
        </div>

        {/* Footer */}
        <div className="modern-footer">
          <span className="modern-footer-icon">📋</span>
          <span className="modern-footer-text">Split with Tabby</span>
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
