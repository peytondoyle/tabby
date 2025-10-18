// Test script to verify Uber Eats receipt splitting logic

// Original Uber Eats receipt data
// Note: Service Fee is separate from Tip - they are different charges!
const uberEatsReceipt = {
  items: [
    { id: 'item-1', label: 'Mapo Tofu', price: 13.75 },
    { id: 'item-2', label: 'Vegetable Fried Rice', price: 11.55 },
    { id: 'item-3', label: 'Vegetables Spring Roll', price: 2.20 },
    { id: 'item-4', label: 'Chicken with Cashew Nuts', price: 15.35 },
    { id: 'item-5', label: 'Shanghai Spring Roll', price: 2.30 },
    { id: 'item-6', label: 'Wonton Soup', price: 3.30 },
    { id: 'item-7', label: 'Chicken with Broccoli', price: 15.35 }
  ],
  subtotal: 63.80,
  deliveryFee: 1.49,  // Platform fee
  serviceFee: 11.48,   // Platform fee (NOT a tip!)
  tax: 6.38,
  tip: 8.31,           // Actual tip to driver/restaurant
  deliveryDiscount: -1.49,
  membershipDiscount: -6.70,
  total: 83.27
};

// Person assignments
const assignments = {
  'Peyton': ['item-4', 'item-5', 'item-6', 'item-7'],  // Chicken Cashew, Shanghai Roll, Wonton, Chicken Broccoli
  'Maggie': ['item-1', 'item-2', 'item-3']  // Mapo Tofu, Fried Rice, Veg Roll
};

// Calculate each person's subtotal
function calculatePersonSubtotal(personItems, items) {
  return personItems.reduce((sum, itemId) => {
    const item = items.find(i => i.id === itemId);
    return sum + (item ? item.price : 0);
  }, 0);
}

// Calculate split with proper discount and fee distribution
function calculateSplit(receipt, assignments) {
  const peytonItems = assignments['Peyton'];
  const maggieItems = assignments['Maggie'];

  const peytonSubtotal = calculatePersonSubtotal(peytonItems, receipt.items);
  const maggieSubtotal = calculatePersonSubtotal(maggieItems, receipt.items);

  console.log('Item Subtotals:');
  console.log('  Peyton:', peytonSubtotal.toFixed(2));
  console.log('  Maggie:', maggieSubtotal.toFixed(2));
  console.log('  Total:', receipt.subtotal.toFixed(2));

  // Calculate proportions based on subtotal
  const peytonProportion = peytonSubtotal / receipt.subtotal;
  const maggieProportion = maggieSubtotal / receipt.subtotal;

  console.log('\nProportions:');
  console.log('  Peyton:', (peytonProportion * 100).toFixed(1) + '%');
  console.log('  Maggie:', (maggieProportion * 100).toFixed(1) + '%');

  // Calculate total discounts
  const totalDiscount = receipt.deliveryDiscount + receipt.membershipDiscount;

  // Apply proportional shares
  const peytonDiscount = totalDiscount * peytonProportion;
  const maggieDiscount = totalDiscount * maggieProportion;

  const peytonDeliveryFee = receipt.deliveryFee * peytonProportion;
  const maggieDeliveryFee = receipt.deliveryFee * maggieProportion;

  const peytonServiceFee = receipt.serviceFee * peytonProportion;
  const maggieServiceFee = receipt.serviceFee * maggieProportion;

  const peytonTax = receipt.tax * peytonProportion;
  const maggieTax = receipt.tax * maggieProportion;

  const peytonTip = receipt.tip * peytonProportion;
  const maggieTip = receipt.tip * maggieProportion;

  // Calculate final totals
  const peytonTotal = peytonSubtotal + peytonDiscount + peytonDeliveryFee + peytonServiceFee + peytonTax + peytonTip;
  const maggieTotal = maggieSubtotal + maggieDiscount + maggieDeliveryFee + maggieServiceFee + maggieTax + maggieTip;

  console.log('\nDetailed Breakdown:');
  console.log('\nPeyton:');
  console.log('  Subtotal:', peytonSubtotal.toFixed(2));
  console.log('  Discount:', peytonDiscount.toFixed(2));
  console.log('  Delivery Fee:', peytonDeliveryFee.toFixed(2), '(platform fee)');
  console.log('  Service Fee:', peytonServiceFee.toFixed(2), '(platform fee)');
  console.log('  Tax:', peytonTax.toFixed(2));
  console.log('  Tip:', peytonTip.toFixed(2), '(to driver/restaurant)');
  console.log('  TOTAL:', peytonTotal.toFixed(2));

  console.log('\nMaggie:');
  console.log('  Subtotal:', maggieSubtotal.toFixed(2));
  console.log('  Discount:', maggieDiscount.toFixed(2));
  console.log('  Delivery Fee:', maggieDeliveryFee.toFixed(2), '(platform fee)');
  console.log('  Service Fee:', maggieServiceFee.toFixed(2), '(platform fee)');
  console.log('  Tax:', maggieTax.toFixed(2));
  console.log('  Tip:', maggieTip.toFixed(2), '(to driver/restaurant)');
  console.log('  TOTAL:', maggieTotal.toFixed(2));

  const splitTotal = peytonTotal + maggieTotal;

  console.log('\nVerification:');
  console.log('  Split Total:', splitTotal.toFixed(2));
  console.log('  Original Total:', receipt.total.toFixed(2));
  console.log('  Difference:', (splitTotal - receipt.total).toFixed(2));

  return {
    peyton: peytonTotal,
    maggie: maggieTotal,
    total: splitTotal
  };
}

console.log('=== Uber Eats Receipt Split Test ===\n');
calculateSplit(uberEatsReceipt, assignments);

console.log('\n=== What your app showed (incorrect) ===');
console.log('Peyton: $50.90');
console.log('Maggie: $38.56');
console.log('Total: $89.46 (should be $83.27)');
console.log('ERROR: $6.19 overcharge!');