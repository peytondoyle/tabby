import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSkip }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError('Authentication is not available');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setSent(true);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {sent ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#fff'
              }}>
                Check your email
              </h2>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.5'
              }}>
                We sent a magic link to <strong style={{ color: '#007AFF' }}>{email}</strong>
              </p>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '12px'
              }}>
                Click the link to sign in. You can close this window.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#fff'
            }}>
              Save your receipts
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Sign in to sync your receipt history across devices
            </p>

            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  marginBottom: '16px',
                  outline: 'none'
                }}
              />

              {error && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 59, 48, 0.1)',
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  borderRadius: '8px',
                  color: '#FF3B30',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? 'rgba(0, 122, 255, 0.5)' : '#007AFF',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                  opacity: loading || !email ? 0.6 : 1
                }}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>

              <button
                type="button"
                onClick={onSkip}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Skip for now
              </button>
            </form>

            <p style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '16px',
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              No password needed. We'll send you a link to sign in.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
