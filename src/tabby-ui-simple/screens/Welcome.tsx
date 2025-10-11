import React from 'react';
import { Button } from '../components/Button';
import './Welcome.css';

interface WelcomeProps {
  onScanReceipt: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onScanReceipt }) => {
  return (
    <div className="billy-welcome">
      <div className="welcome-content">
        <div className="logo-container">
          <span className="logo">🐐</span>
        </div>

        <h1 className="app-name">tabby</h1>

        <h2 className="tagline">Welcome!</h2>

        <p className="subtitle">
          Let's snap a photo of your receipt<br />
          to start splitting the bill.
        </p>
      </div>

      <div className="welcome-actions">
        <Button onClick={onScanReceipt} fullWidth>
          📸 Scan Receipt
        </Button>
      </div>
    </div>
  );
};