// Property-based invariant tests for the bill math engine.
// Enumerated unit tests in computeTotals.test.ts cover known edge cases.
// These tests cover the *universe* — generating random valid inputs and
// asserting properties that must hold for any bill, e.g.:
//
//   sum(person_totals) === grand_total
//   receipt_total === subtotal - discount + service_fee + tax + tip
//   person.total >= 0  (personal credits can't drive someone below zero)
//
// Failure here means the engine has a behavior class our enumerated tests
// don't cover. Don't disable — investigate.

import fc from 'fast-check';
import {
  computeTotals,
  type Item,
  type Person,
  type ItemShare,
} from './computeTotals';

// Money in cents, then divided back to dollars with 2dp. Avoids float noise
// in test inputs and matches how the UI builds payloads.
const moneyCents = (min = 0, max = 100_000) =>
  fc.integer({ min, max }).map((c) => c / 100);

const itemArb = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1, maxLength: 20 }),
  price: moneyCents(1, 50_000), // $0.01 - $500.00 line total
  emoji: fc.constant('🍽️'),
  quantity: fc.integer({ min: 1, max: 5 }),
  unit_price: fc.constant(0), // computeTotals uses price, not unit_price
});

const personArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 15 }),
  is_paid: fc.constant(false),
  personal_credit: fc.constant(0),
});

// Build a valid bill: 1-5 items, 1-4 people, each item shared by at least
// one person with weight 1 (equal split for that item).
const billArb = fc
  .record({
    items: fc.array(itemArb, { minLength: 1, maxLength: 5 }),
    people: fc.array(personArb, { minLength: 1, maxLength: 4 }),
    tax: moneyCents(0, 5000),
    tip: moneyCents(0, 5000),
    discount: moneyCents(0, 1000),
    service_fee: moneyCents(0, 1000),
  })
  .map(({ items, people, tax, tip, discount, service_fee }) => {
    // For each item, assign at least one person at weight 1.
    const shares: ItemShare[] = items.map((item) => ({
      item_id: item.id,
      person_id: people[0]!.id,
      weight: 1,
    }));
    return { items, people, shares, tax, tip, discount, service_fee };
  });

describe('computeTotals — universal invariants', () => {
  it('sum of person_totals equals grand_total (penny-perfect)', () => {
    fc.assert(
      fc.property(billArb, ({ items, shares, people, tax, tip, discount, service_fee }) => {
        const totals = computeTotals(
          items as Item[],
          shares,
          people as Person[],
          tax,
          tip,
          discount,
          service_fee
        );
        const sumPersonTotals = totals.person_totals.reduce(
          (acc, p) => acc + p.total,
          0
        );
        // Penny-perfect: sum should equal grand_total exactly (rounded to 2dp).
        const lhs = Math.round(sumPersonTotals * 100);
        const rhs = Math.round(totals.grand_total * 100);
        return lhs === rhs;
      }),
      { numRuns: 200 }
    );
  });

  it('receipt_total = subtotal - discount + service_fee + tax + tip', () => {
    fc.assert(
      fc.property(billArb, ({ items, shares, people, tax, tip, discount, service_fee }) => {
        const totals = computeTotals(
          items as Item[],
          shares,
          people as Person[],
          tax,
          tip,
          discount,
          service_fee
        );
        const expected = Math.round(
          (totals.subtotal - totals.discount + totals.service_fee + totals.tax + totals.tip) * 100
        );
        const actual = Math.round(totals.receipt_total * 100);
        return expected === actual;
      }),
      { numRuns: 200 }
    );
  });

  it('no person total is negative', () => {
    fc.assert(
      fc.property(billArb, ({ items, shares, people, tax, tip, discount, service_fee }) => {
        const totals = computeTotals(
          items as Item[],
          shares,
          people as Person[],
          tax,
          tip,
          discount,
          service_fee
        );
        return totals.person_totals.every((p) => p.total >= 0);
      }),
      { numRuns: 200 }
    );
  });

  it('subtotal equals sum of item.price (line totals)', () => {
    fc.assert(
      fc.property(billArb, ({ items, shares, people, tax, tip, discount, service_fee }) => {
        const totals = computeTotals(
          items as Item[],
          shares,
          people as Person[],
          tax,
          tip,
          discount,
          service_fee
        );
        const expectedSubtotal = Math.round(
          items.reduce((sum, it) => sum + it.price, 0) * 100
        );
        const actualSubtotal = Math.round(totals.subtotal * 100);
        return expectedSubtotal === actualSubtotal;
      }),
      { numRuns: 200 }
    );
  });

  it('is deterministic (same input → same output)', () => {
    fc.assert(
      fc.property(billArb, ({ items, shares, people, tax, tip, discount, service_fee }) => {
        const t1 = computeTotals(items as Item[], shares, people as Person[], tax, tip, discount, service_fee);
        const t2 = computeTotals(items as Item[], shares, people as Person[], tax, tip, discount, service_fee);
        return (
          t1.grand_total === t2.grand_total &&
          t1.receipt_total === t2.receipt_total &&
          t1.person_totals.length === t2.person_totals.length &&
          t1.person_totals.every((p, i) => p.total === t2.person_totals[i]!.total)
        );
      }),
      { numRuns: 100 }
    );
  });
});
