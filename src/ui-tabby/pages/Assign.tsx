import React from 'react';
import { useFlowAdapter } from '../adapters/useFlowAdapter';
import Card from '../kit/Card';
import Avatar from '../kit/Avatar';
import Button from '../kit/Button';

interface AssignProps {
  onNext: () => void;
}

export default function Assign({ onNext }: AssignProps) {
  const { people, items, computeTotals } = useFlowAdapter();
  const totals = computeTotals();

  return (
    <div className="tabby-app" style={{ 
      padding: 24,
      minHeight: '100vh',
      background: '#0C0D10'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 800, 
          marginBottom: 8,
          color: '#FFFFFF'
        }}>
          Assign Items
        </h1>
        <p style={{ 
          color: '#C9CDD6',
          fontSize: '18px'
        }}>
          Click items to assign them to people
        </p>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            marginBottom: 16,
            color: '#FFFFFF'
          }}>
            Available Items
          </h2>
          <div style={{ 
            display: 'grid', 
            gap: 12,
            maxWidth: 600,
            margin: '0 auto'
          }}>
            {items.map((item) => (
              <Card key={item.id} style={{
                background: '#1C1F27',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
              }}>
                <div className="t-row" style={{ color: '#FFFFFF' }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <span style={{ flex: 1, color: '#FFFFFF', fontWeight: 600 }}>{item.label}</span>
                  <span className="price-tabular t-computer" style={{ color: '#FFFFFF' }}>
                    ${item.price.toFixed(2)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* People Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 24,
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        {people.map((person) => {
          const personTotal = totals.personTotals[person.id] || 0;
          // For now, show all items as unassigned - this would be filtered by actual assignments
          const personItems: typeof items = [];

          return (
            <Card key={person.id} style={{
              background: '#1C1F27',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
            }}>
              <div className="t-row" style={{ marginBottom: 16 }}>
                <Avatar 
                  src={person.avatar} 
                  initials={person.name.charAt(0).toUpperCase()} 
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{person.name}</div>
                  <div className="price-tabular t-computer" style={{ color: '#8D93A3' }}>
                    ${personTotal.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="t-stack">
                {personItems.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 20,
                    color: '#8D93A3'
                  }}>
                    No items assigned yet
                  </div>
                ) : (
                  personItems.map((item) => (
                    <div key={item.id} className="t-row" style={{ color: '#FFFFFF' }}>
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                      <span className="price-tabular t-computer">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Button primary onClick={onNext}>
          Continue to Share
        </Button>
      </div>
    </div>
  );
}
