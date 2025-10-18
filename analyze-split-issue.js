// Analysis of the current split issue

console.log("=== UBER EATS RECEIPT ANALYSIS ===\n");

// Original receipt from PDF
const original = {
  subtotal: 63.80,
  deliveryFee: 1.49,
  serviceFee: 11.48,
  tax: 6.38,
  tip: 8.31,
  deliveryDiscount: -1.49,
  membershipDiscount: -6.70,
  total: 83.27
};

// What the app is showing
const appSplit = {
  peyton: {
    subtotal: 36.30,
    discount: -4.66,
    tax: 3.63,
    tip: 10.97,  // This looks wrong!
    total: 46.24,
    actualCharged: 50.90
  },
  maggie: {
    subtotal: 27.50,
    discount: -3.53,
    tax: 2.75,
    tip: 8.31,   // This is the ENTIRE original tip!
    total: 35.03,
    actualCharged: 38.56
  }
};

console.log("Original Receipt:");
console.log("  Subtotal:", original.subtotal);
console.log("  Delivery Fee:", original.deliveryFee);
console.log("  Service Fee:", original.serviceFee);
console.log("  Tax:", original.tax);
console.log("  Tip:", original.tip);
console.log("  Discounts:", original.deliveryDiscount + original.membershipDiscount);
console.log("  TOTAL:", original.total);

console.log("\n=== WHAT THE APP IS SHOWING ===\n");

console.log("Peyton's Receipt (from image):");
console.log("  Subtotal:", appSplit.peyton.subtotal);
console.log("  Discount:", appSplit.peyton.discount);
console.log("  Tax:", appSplit.peyton.tax);
console.log("  Tip:", appSplit.peyton.tip);
console.log("  Shown total:", appSplit.peyton.total);
console.log("  ACTUAL CHARGED:", appSplit.peyton.actualCharged);

console.log("\nMaggie's Receipt (from image):");
console.log("  Subtotal:", appSplit.maggie.subtotal);
console.log("  Discount:", appSplit.maggie.discount);
console.log("  Tax:", appSplit.maggie.tax);
console.log("  Tip:", appSplit.maggie.tip);
console.log("  Shown total:", appSplit.maggie.total);
console.log("  ACTUAL CHARGED:", appSplit.maggie.actualCharged);

console.log("\n=== PROBLEMS IDENTIFIED ===\n");

const totalTipShown = appSplit.peyton.tip + appSplit.maggie.tip;
console.log("1. TIP ISSUE:");
console.log("   Original tip:", original.tip);
console.log("   Total tip shown in splits:", totalTipShown);
console.log("   OVERCHARGE:", (totalTipShown - original.tip).toFixed(2));

console.log("\n2. MISSING FEES:");
console.log("   Delivery Fee ($" + original.deliveryFee + ") - NOT shown in splits");
console.log("   Service Fee ($" + original.serviceFee + ") - NOT shown in splits");
console.log("   Total fees missing: $" + (original.deliveryFee + original.serviceFee));

console.log("\n3. FINAL TOTALS:");
const appTotal = appSplit.peyton.actualCharged + appSplit.maggie.actualCharged;
console.log("   Original total:", original.total);
console.log("   App split total:", appTotal);
console.log("   OVERCHARGE:", (appTotal - original.total).toFixed(2));

console.log("\n=== WHAT SHOULD BE CORRECT ===\n");

// Calculate correct proportions
const peytonSubtotal = 36.30;
const maggieSubtotal = 27.50;
const totalSubtotal = 63.80;

const peytonRatio = peytonSubtotal / totalSubtotal;
const maggieRatio = maggieSubtotal / totalSubtotal;

console.log("Proportions:");
console.log("  Peyton:", (peytonRatio * 100).toFixed(1) + "%");
console.log("  Maggie:", (maggieRatio * 100).toFixed(1) + "%");

// Calculate correct amounts
const peytonCorrect = {
  subtotal: peytonSubtotal,
  discount: (original.deliveryDiscount + original.membershipDiscount) * peytonRatio,
  deliveryFee: original.deliveryFee * peytonRatio,
  serviceFee: original.serviceFee * peytonRatio,
  tax: original.tax * peytonRatio,
  tip: original.tip * peytonRatio
};

const maggieCorrect = {
  subtotal: maggieSubtotal,
  discount: (original.deliveryDiscount + original.membershipDiscount) * maggieRatio,
  deliveryFee: original.deliveryFee * maggieRatio,
  serviceFee: original.serviceFee * maggieRatio,
  tax: original.tax * maggieRatio,
  tip: original.tip * maggieRatio
};

peytonCorrect.total = peytonCorrect.subtotal + peytonCorrect.discount +
                      peytonCorrect.deliveryFee + peytonCorrect.serviceFee +
                      peytonCorrect.tax + peytonCorrect.tip;

maggieCorrect.total = maggieCorrect.subtotal + maggieCorrect.discount +
                      maggieCorrect.deliveryFee + maggieCorrect.serviceFee +
                      maggieCorrect.tax + maggieCorrect.tip;

console.log("\nCorrect Peyton Split:");
console.log("  Subtotal:", peytonCorrect.subtotal.toFixed(2));
console.log("  Discount:", peytonCorrect.discount.toFixed(2));
console.log("  Delivery Fee:", peytonCorrect.deliveryFee.toFixed(2));
console.log("  Service Fee:", peytonCorrect.serviceFee.toFixed(2));
console.log("  Tax:", peytonCorrect.tax.toFixed(2));
console.log("  Tip:", peytonCorrect.tip.toFixed(2));
console.log("  TOTAL:", peytonCorrect.total.toFixed(2));

console.log("\nCorrect Maggie Split:");
console.log("  Subtotal:", maggieCorrect.subtotal.toFixed(2));
console.log("  Discount:", maggieCorrect.discount.toFixed(2));
console.log("  Delivery Fee:", maggieCorrect.deliveryFee.toFixed(2));
console.log("  Service Fee:", maggieCorrect.serviceFee.toFixed(2));
console.log("  Tax:", maggieCorrect.tax.toFixed(2));
console.log("  Tip:", maggieCorrect.tip.toFixed(2));
console.log("  TOTAL:", maggieCorrect.total.toFixed(2));

const correctTotal = peytonCorrect.total + maggieCorrect.total;
console.log("\nVerification:");
console.log("  Correct split total:", correctTotal.toFixed(2));
console.log("  Original total:", original.total);
console.log("  Match:", Math.abs(correctTotal - original.total) < 0.01 ? "YES ✓" : "NO ✗");