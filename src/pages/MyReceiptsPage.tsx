import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReceiptHistory, removeReceiptFromHistory, type ReceiptHistoryItem } from '../lib/receiptHistory';
import { deleteReceipt } from '../lib/receipts';
import { HomeButton } from '@/components/HomeButton';

export const MyReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState(getReceiptHistory());
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (token: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    if (!confirm('Delete this receipt? This action cannot be undone.')) {
      return;
    }

    setDeleting(token);
    try {
      await deleteReceipt(token);
      removeReceiptFromHistory(token);
      setHistory(getReceiptHistory());
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      alert('Failed to delete receipt. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (isoTimestamp: string) => {
    const now = new Date();
    const then = new Date(isoTimestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoTimestamp);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      padding: '0'
    }}>
      <HomeButton />
      {/* Header */}
      <div style={{
        padding: '20px 20px 20px 70px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        background: '#000',
        zIndex: 10
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0
        }}>
          My Receipts
        </h1>
      </div>

      {/* Receipt List */}
      <div style={{ padding: '20px' }}>
        {history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>No receipts yet</div>
            <div style={{ fontSize: '14px' }}>Scan a receipt to get started</div>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: '#007AFF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Scan Receipt
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {history.map((bill: ReceiptHistoryItem) => (
              <div
                key={bill.token}
                onClick={() => navigate(`/receipt/${bill.token}/edit`)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {bill.title}
                    </div>
                    {bill.place && bill.place !== bill.title && (
                      <div style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: '4px'
                      }}>
                        {bill.place}
                      </div>
                    )}
                  </div>
                  {bill.totalAmount !== undefined && (
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#007AFF'
                    }}>
                      ${bill.totalAmount.toFixed(2)}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    <span>{formatDate(bill.date)}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(bill.lastAccessed)}</span>
                    {bill.isLocal && (
                      <>
                        <span>•</span>
                        <span>Local</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(bill.token, e)}
                    disabled={deleting === bill.token}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 59, 48, 0.15)',
                      border: '1px solid rgba(255, 59, 48, 0.3)',
                      borderRadius: '6px',
                      color: '#FF3B30',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: deleting === bill.token ? 'not-allowed' : 'pointer',
                      opacity: deleting === bill.token ? 0.5 : 1
                    }}
                  >
                    {deleting === bill.token ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
