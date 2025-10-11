import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const HomeButton: React.FC = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={() => {
        navigate('/');
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 999999,
        width: '40px',
        height: '40px',
        border: 'none',
        background: 'transparent',
        color: isHovered ? '#fff' : '#8E8E93',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        pointerEvents: 'auto',
        padding: 0
      }}
      data-testid="home-button"
      aria-label="Go to home"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </button>
  );
};
