import React from 'react';
import styles from './progressDots.module.css';

interface ProgressDotsProps {
  index: number;
  total: number;
}

export default function ProgressDots({ index, total }: ProgressDotsProps) {
  return (
    <div className={styles.root}>
      {Array.from({ length: total }).map((_, i) => (
        <div 
          key={i} 
          className={`${styles.dot} ${i === index ? styles.active : ''}`}
        />
      ))}
    </div>
  );
}
