import React from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  fullWidth = false,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      className={`billy-button ${variant} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};