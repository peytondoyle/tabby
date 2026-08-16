import { normalizeReceiptLineItems } from '../../shared/receiptItemNormalization'

describe('receipt item normalization', () => {
  it('handles the Stock RVA receipt without survey or modifier rows', () => {
    const items = normalizeReceiptLineItems([
      { label: 'How was your visit?', price: 0 },
      { label: 'The restaurant tracks feedback and may reach out using the contact info you previously provided.', price: 0 },
      { label: 'Subtotal', price: 279 },
      { label: 'Tax', price: 37.69 },
      { label: '1 Del Maguey Vida Mezcal', price: 11 },
      { label: 'MARGARITA', price: 2 },
      { label: '2 Schafer Pinot Noir', price: 26 },
      { label: '1 Corpse Reviver #22', price: 14 },
      { label: '1 Cardamosa', price: 14 },
      { label: '1 Lavender Fields', price: 14 },
      { label: '1 BREAD AND BUTTER', price: 10 },
      { label: '1 FRIED GOUDA', price: 13 },
      { label: '1 Wedge Salad', price: 10 },
      { label: '1 Swedish Meatballs', price: 18 },
      { label: '1 Gooouda Smash Burger', price: 18 },
      { label: 'No Cucu', price: 0 },
      { label: '2 Schnitzel', price: 60 },
      { label: '1 Chicken', price: 28 },
      { label: '1 Plankstek', price: 41 },
      { label: 'Medium Rare', price: 0 },
    ])

    expect(items.map(item => item.label)).toEqual([
      'Del Maguey Vida Mezcal',
      'MARGARITA',
      'Schafer Pinot Noir',
      'Corpse Reviver #22',
      'Cardamosa',
      'Lavender Fields',
      'BREAD AND BUTTER',
      'FRIED GOUDA',
      'Wedge Salad',
      'Swedish Meatballs',
      'Gooouda Smash Burger',
      'Schnitzel',
      'Chicken',
      'Plankstek',
    ])
    expect(items.find(item => item.label === 'Schafer Pinot Noir')).toMatchObject({
      price: 26,
      quantity: 2,
      unit_price: 13
    })
    expect(items.find(item => item.label === 'Schnitzel')).toMatchObject({
      price: 60,
      quantity: 2,
      unit_price: 30
    })
    expect(items.reduce((sum, item) => sum + item.price, 0)).toBe(279)
  })
})
