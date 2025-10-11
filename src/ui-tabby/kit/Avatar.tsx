import React from 'react';
import styles from './avatar.module.css';

interface AvatarProps {
  src?: string;
  initials: string;
  size?: number;
}

export default function Avatar({ src, initials, size = 36 }: AvatarProps) {
  const style = { width: size, height: size };
  
  return (
    <div className={styles.root} style={style}>
      {src ? (
        <img src={src} alt={initials} className={styles.image} />
      ) : (
        <div className={styles.initials} style={style}>
          {initials}
        </div>
      )}
    </div>
  );
}
