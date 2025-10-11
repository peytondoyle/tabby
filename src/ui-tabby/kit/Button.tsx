import React from 'react';
import styles from './button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
}

export default function Button({ 
  children, 
  primary = false, 
  className = '',
  ...rest 
}: ButtonProps) {
  return (
    <button 
      className={`${styles.root} ${primary ? styles.primary : ''} ${className}`} 
      {...rest}
    >
      {children}
    </button>
  );
}
