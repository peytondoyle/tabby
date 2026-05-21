// Contract test: frontend payload schemas vs backend validation schemas.
// These two files describe the same wire contract from opposite sides. If
// they drift (frontend builds a payload the backend rejects, or vice versa)
// users see opaque 400/500 errors with no warning at build time. This test
// catches that at the unit-test level.

import { ReceiptCreateSchema } from './schemas';
import { CreateReceiptRequestSchema } from '../../api/_utils/schemas';

describe('Frontend ↔ Backend schema contract', () => {
  it('a typical frontend ReceiptCreatePayload is accepted by the backend', () => {
    const frontendPayload = ReceiptCreateSchema.parse({
      place: 'Test Diner',
      total: 42.5,
      items: [
        { id: 'i1', name: 'Coffee', price: 4.5, quantity: 1 },
        { id: 'i2', name: 'Bagel', price: 3.5, quantity: 2, icon: '🥯' },
      ],
      people: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      tax: 2.5,
      tip: 7.5,
      discount: 0,
      service_fee: 0,
    });

    const result = CreateReceiptRequestSchema.safeParse(frontendPayload);
    if (!result.success) {
      throw new Error(
        `Backend rejected a valid frontend payload:\n${JSON.stringify(result.error.issues, null, 2)}`
      );
    }
    expect(result.success).toBe(true);
  });

  it('minimal payload (no place, no total) flows through both schemas', () => {
    const frontendPayload = ReceiptCreateSchema.parse({
      place: null,
      total: null,
      items: [{ id: 'x', name: 'Mystery item', price: 1.0 }],
      people: [],
      tax: 0,
      tip: 0,
      discount: 0,
      service_fee: 0,
    });

    const result = CreateReceiptRequestSchema.safeParse(frontendPayload);
    expect(result.success).toBe(true);
  });

  it('zero-price item (comp/free) is accepted by both', () => {
    const frontendPayload = ReceiptCreateSchema.parse({
      place: 'Free stuff',
      total: 0,
      items: [{ id: 'comp', name: 'Comp Water', price: 0 }],
      people: [],
      tax: 0,
      tip: 0,
      discount: 0,
      service_fee: 0,
    });

    const result = CreateReceiptRequestSchema.safeParse(frontendPayload);
    expect(result.success).toBe(true);
  });
});
