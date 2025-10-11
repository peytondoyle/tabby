import React from 'react';
import styles from './receiptCard.module.css';
import Button from './Button';

type Item = { 
  emoji?: string; 
  name: string; 
  price: number; 
};

interface ReceiptCardProps {
  title: string;
  location: string;
  date: string;
  items: Item[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export default function ReceiptCard({
  title,
  location,
  date,
  items,
  subtotal,
  tax,
  tip,
  total
}: ReceiptCardProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.paper}>
        <header className={styles.header}>
          <div className={styles.logo} />
          <div>
            <div className={styles.title}>{title}</div>
            <div className={styles.meta}>{location} • {date}</div>
          </div>
          <div className={styles.shareButton}>
            <Button>Share</Button>
          </div>
        </header>

        <div className={styles.items}>
          {items.map((item, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.emoji}>{item.emoji ?? '•'}</div>
              <div className={styles.itemName}>{item.name}</div>
              <div className={styles.itemPrice}>${item.price.toFixed(2)}</div>
            </div>
          ))}
        </div>

        <hr className={styles.divider} />

        <div className={styles.summary}>
          <div className={styles.sum}>
            <span>Subtotal:</span>
            <span className="price-tabular">${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.sum}>
            <span>SALES TAX:</span>
            <span className="price-tabular">${tax.toFixed(2)}</span>
          </div>
          <div className={styles.sum}>
            <span>Tip:</span>
            <span className="price-tabular">${tip.toFixed(2)}</span>
          </div>
          <div className={styles.sum}>
            <span style={{ fontWeight: 700 }}>Total:</span>
            <span className={styles.total}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
