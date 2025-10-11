import React from 'react';
import Button from '../kit/Button';

interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0C0D10] text-white">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ 
          fontSize: 128, 
          filter: 'drop-shadow(0 18px 36px rgba(0,0,0,0.45))' 
        }}>
          🐱
        </div>
        <h1 style={{ 
          fontSize: 44, 
          fontWeight: 800, 
          margin: '12px 0',
          color: '#FFFFFF'
        }}>
          Tabby
        </h1>
        <h2 style={{ 
          fontSize: 32, 
          fontWeight: 600, 
          margin: '12px 0',
          color: '#FFFFFF'
        }}>
          Welcome!
        </h2>
        <p style={{ 
          color: '#C9CDD6',
          fontSize: '18px',
          margin: '12px 0'
        }}>
          Let's snap a photo of your receipt to start splitting the bill.
        </p>
        <div className="t-stack" style={{ marginTop: 24 }}>
          <Button primary onClick={onStart} style={{ height: '56px' }}>
            📷 Take Photo
          </Button>
          <Button style={{ height: '56px' }}>
            🖼️ Select Image
          </Button>
        </div>
      </div>
    </div>
  );
}
