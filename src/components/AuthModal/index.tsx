import React from 'react';
import { SignIn } from '@clerk/clerk-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
}

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSkip }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420 }}>
        {hasClerk ? (
          <SignIn
            routing="virtual"
            fallbackRedirectUrl={window.location.pathname}
            signUpFallbackRedirectUrl={window.location.pathname}
          />
        ) : (
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: 16,
              padding: 32,
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Auth not configured</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.5 }}>
              Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env.local</code> to enable sign-in.
            </p>
            <button
              onClick={onSkip}
              style={{
                width: '100%',
                padding: 14,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
