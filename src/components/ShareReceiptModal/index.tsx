import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FoodIcon } from '../../lib/foodIcons';
import { HomeButton } from '../HomeButton';
import { computeTotals, parsePersonHeadcount, type Item as ComputeItem, type Person as ComputePerson, type ItemShare as ComputeItemShare, type BillTotals } from '../../lib/computeTotals';
import './styles.css';

interface Item {
  id: string;
  emoji: string;
  name?: string;   // TabbySimple uses 'name'
  label?: string;  // API/database uses 'label'
  price: number;
}

interface ItemShare {
  itemId: string;
  weight: number;
  shareAmount: number;
}

interface Person {
  id: string;
  name: string;
  headcount?: number;
  items: string[];
  itemShares?: ItemShare[];  // New: includes weight and calculated share amount
  total: number;
}

function getPersonHeadcount(person?: Pick<Person, 'headcount' | 'name'> | null): number {
  if (!person) return 1;
  if (person.headcount !== undefined && person.headcount !== null) {
    const parsed = Number(person.headcount);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.floor(parsed));
  }
  return parsePersonHeadcount(person.name);
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
  discount?: number;
  serviceFee?: number;
  total: number;
  // Pre-computed totals from the parent. When provided the modal skips its
  // own computeTotals call, so both sides can't disagree.
  billTotals?: BillTotals | null;
}

export const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  date,
  items,
  people,
  subtotal: _subtotal,
  tax,
  tip,
  discount = 0,
  serviceFee = 0,
  total,
  billTotals: billTotalsProp,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate total slides: one for each person + one for full breakdown
  const totalSlides = people.length + 1;

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
      const rootStyles = getComputedStyle(document.documentElement);
      const exportBackground = rootStyles.getPropertyValue('--tb-white').trim();
      const canvas = await html2canvas(cardRef.current, {
        scale: 4, // Even higher DPI for sharper images
        backgroundColor: exportBackground,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        removeContainer: true,
        // Let html2canvas use natural element dimensions
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight,
        // Better rendering for backgrounds and borders
        foreignObjectRendering: false,
        // Ensure backgrounds are captured properly
        ignoreElements: () => false
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

  // Prefer parent-provided billTotals. Only recompute locally when absent
  // (e.g. ReceiptPage callers that pass raw receipt data).
  const peopleWithTotals = useMemo(() => {
    if (!people || people.length === 0) return [];

    let billTotals = billTotalsProp;
    const peopleById = new Map(people.map(person => [person.id, person]));
    const itemsById = new Map(items.map(item => [item.id, item]));

    if (!billTotals) {
      const itemPersonCount = new Map<string, number>();
      people.forEach(person => {
        const personWeight = getPersonHeadcount(person);
        person.items.forEach(itemId => {
          itemPersonCount.set(itemId, (itemPersonCount.get(itemId) || 0) + personWeight);
        });
      });

      const shares: ComputeItemShare[] = [];
      people.forEach(person => {
        if (person.itemShares && person.itemShares.length > 0) {
          person.itemShares.forEach(share => {
            shares.push({ item_id: share.itemId, person_id: person.id, weight: share.weight });
          });
        } else {
          person.items.forEach(itemId => {
            const splitCount = itemPersonCount.get(itemId) || 1;
            const personWeight = getPersonHeadcount(person);
            shares.push({ item_id: itemId, person_id: person.id, weight: splitCount > 0 ? personWeight / splitCount : 1 });
          });
        }
      });

      const normalizedItems: ComputeItem[] = items.map(item => ({
        id: item.id,
        label: item.name || item.label || 'Item',
        price: item.price,
        quantity: 1,
        unit_price: item.price,
        emoji: item.emoji
      }));

      const normalizedPeople: ComputePerson[] = people.map(p => ({
        id: p.id,
        name: p.name,
        headcount: p.headcount,
        is_paid: false
      }));

      billTotals = computeTotals(
        normalizedItems, shares, normalizedPeople,
        tax, tip, discount, serviceFee,
        'proportional', 'proportional', true
      );
    }

    return billTotals.person_totals.map(pt => {
      const person = peopleById.get(pt.person_id);
      if (!person) return null;

      const personItemsWithShares = pt.items.map(itemData => {
        const item = itemsById.get(itemData.item_id);
        return {
          item: item || { id: itemData.item_id, emoji: '🍽️', price: 0, name: 'Item' },
          shareAmount: itemData.share_amount,
          weight: itemData.weight
        };
      });

      return {
        person,
        itemsSubtotal: pt.subtotal,
        personItemsWithShares,
        personDiscount: pt.discount_share,
        personServiceFee: pt.service_fee_share,
        personTax: pt.tax_share,
        personTip: pt.tip_share,
        personalCredit: pt.personal_credit,
        creditNote: pt.credit_note,
        personGrossShare: pt.gross_share,
        personTotal: pt.total
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [billTotalsProp, people, items, tax, tip, discount, serviceFee]);
  const personTotalsSum = Math.round(
    peopleWithTotals.reduce((sum, personData) => sum + personData.personTotal, 0) * 100
  ) / 100;
  const billGrandTotal = billTotalsProp?.grand_total ?? total;
  const unresolvedAmount = Math.round((billGrandTotal - personTotalsSum) * 100) / 100;
  const hasUnresolvedAmount = Math.abs(unresolvedAmount) > 0.005;
  const unresolvedLabel = unresolvedAmount > 0 ? 'Unassigned' : 'Over-assigned';
  const unresolvedWarning = unresolvedAmount > 0
    ? 'Assign remaining items before sharing'
    : 'Fix duplicate assignments before sharing';

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderPersonReceipt = (personData: typeof peopleWithTotals[0]) => {
    const {
      person,
      itemsSubtotal,
      personItemsWithShares,
      personDiscount,
      personServiceFee,
      personTax,
      personTip,
      personalCredit,
      creditNote,
      personTotal
    } = personData;

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
            {personItemsWithShares.map(({ item, shareAmount, weight }) => (
              <div key={item.id} className="modern-item-row">
                <div className="modern-item-info">
                  <span className="modern-item-emoji">
                    <FoodIcon itemName={item.name || item.label || 'Item'} emoji={item.emoji} size={16} color="var(--tb-ink)" />
                  </span>
                  <span className="modern-item-name">
                    {item.name || item.label || 'Item'}
                    {weight < 1 && <span className="modern-item-split"> ({Math.round(weight * 100)}%)</span>}
                  </span>
                </div>
                <span className="modern-item-price">${shareAmount.toFixed(2)}</span>
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
          {personDiscount > 0.01 && (
            <div className="modern-breakdown-row">
              <span>Discount</span>
              <span>-${personDiscount.toFixed(2)}</span>
            </div>
          )}
          {personServiceFee > 0.01 && (
            <div className="modern-breakdown-row">
              <span>Service Fee</span>
              <span>${personServiceFee.toFixed(2)}</span>
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
          {personalCredit > 0.005 && (
            <span className="modern-credit-applied">
              −${personalCredit.toFixed(2)} {creditNote || 'credit'} applied
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="modern-footer">
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
          {peopleWithTotals.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--tb-ink-dim)', fontSize: '14px' }}>
              No people added yet
            </div>
          )}

          {peopleWithTotals.map((personData) => (
            <div key={personData.person.id} className="modern-person-row">
              <span className="modern-person-name">{personData.person.name}</span>
              <span className="modern-person-total">${personData.personTotal.toFixed(2)}</span>
            </div>
          ))}
          {hasUnresolvedAmount && (
            <div className="modern-person-row modern-person-row--unassigned">
              <span className="modern-person-name">{unresolvedLabel}</span>
              <span className="modern-person-total">${Math.abs(unresolvedAmount).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Bill Total */}
        <div className="modern-bill-total">
          <span className="modern-total-label">Bill Total</span>
          <span className="modern-total-amount">${billGrandTotal.toFixed(2)}</span>
          {hasUnresolvedAmount && (
            <span className="modern-total-warning">{unresolvedWarning}</span>
          )}
        </div>

        {/* Footer */}
        <div className="modern-footer">
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
    if (currentSlide < peopleWithTotals.length) {
      return `${peopleWithTotals[currentSlide].person.name}'s Bill`;
    }
    return 'Split by Person';
  };

  return (
    <div className="share-receipt-modal">
      <HomeButton />
      <div className="share-modal-overlay" onClick={onClose}>
        <div className="share-modal-content" role="dialog" aria-modal="true" aria-labelledby="share-bill-title" onClick={(e) => e.stopPropagation()}>
          <div className="share-modal-header">
            <h1 id="share-bill-title">Share Bill</h1>
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
              {currentSlide < peopleWithTotals.length
                ? renderPersonReceipt(peopleWithTotals[currentSlide])
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

          <button className="share-button" onClick={handleShareReceipt} disabled={hasUnresolvedAmount}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {hasUnresolvedAmount ? 'Fix split before sharing' : 'Share Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};
