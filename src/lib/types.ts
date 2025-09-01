export type Money = number; // dollars as number (2dp)

export interface BillItemPayload {
  id: string;
  name: string;
  price: Money;
  icon?: string;
}

export interface BillCreatePayload {
  place: string | null;
  total: Money | null;
  items: BillItemPayload[];
  people: { id: string; name: string }[]; // can be empty on create
  tax: Money;
  tip: Money;
}

export function toMoney(n: unknown): Money {
  const v = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : 0;
  return Math.round(v * 100) / 100;
}
