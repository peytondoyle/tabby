export type RawReceiptLineItem = {
  label?: unknown
  price?: unknown
  emoji?: string | null
  quantity?: unknown
  unit_price?: unknown
}

export type NormalizedReceiptLineItem = {
  label: string
  price: number
  emoji?: string | null
  quantity: number
  unit_price: number
}

export function normalizeReceiptNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function cleanReceiptLabel(label: unknown): string {
  return String(label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isNonBillableReceiptLine(label: unknown, price: unknown): boolean {
  const cleanLabel = cleanReceiptLabel(label)
  const lowerLabel = cleanLabel.toLowerCase()
  const amount = normalizeReceiptNumber(price)

  if (!cleanLabel) return true
  if (/^(?:sub\s*total|subtotal|tax|sales tax|tip|gratuity|total|balance due|amount due)$/.test(lowerLabel)) {
    return true
  }
  if (Math.abs(amount) >= 0.01) return false

  return [
    /^(?:how was your visit|provided)\b/,
    /(?:restaurant tracks feedback|contact info|previously provided)/,
    /^(?:check|check #|table|guest count|ordered|serving)\b/,
    /^(?:no|hold|remove|without)\s+\S+/,
    /^(?:rare|medium rare|medium|medium well|well done)$/,
    /^[*-]+$/,
    /^[\s★☆]+$/,
  ].some(pattern => pattern.test(lowerLabel))
}

export function normalizeReceiptLineItem(item: RawReceiptLineItem): NormalizedReceiptLineItem | null {
  const label = cleanReceiptLabel(item.label)
  const price = normalizeReceiptNumber(item.price)

  if (isNonBillableReceiptLine(label, price)) return null

  const explicitQuantity = normalizeReceiptNumber(item.quantity)
  const hasExplicitQuantity = Number.isFinite(explicitQuantity) && explicitQuantity >= 1
  let quantity = hasExplicitQuantity ? Math.round(explicitQuantity) : 1
  let itemName = label.replace(/^1\s+(?=\S)/, '')

  if (!hasExplicitQuantity) {
    const patterns: Array<{ re: RegExp; qtyIdx: number; nameIdx: number }> = [
      { re: /^(.+?)\s*[x×]\s*(\d+)$/i, qtyIdx: 2, nameIdx: 1 },
      { re: /^(.+?)\s*\((\d+)\)$/, qtyIdx: 2, nameIdx: 1 },
      { re: /^(\d+)\s+(.+)$/, qtyIdx: 1, nameIdx: 2 },
      { re: /^(\d+)\s*@\s*\$?[\d.]+\s+(.+)$/, qtyIdx: 1, nameIdx: 2 },
      { re: /^(?:qty|quantity)[:\s]*(\d+)\s+(.+)$/i, qtyIdx: 1, nameIdx: 2 },
    ]

    for (const { re, qtyIdx, nameIdx } of patterns) {
      const match = itemName.match(re)
      if (!match) continue

      const parsedQuantity = Number.parseInt(match[qtyIdx], 10)
      const parsedName = cleanReceiptLabel(match[nameIdx])
      if (!parsedName || parsedQuantity < 1 || parsedQuantity > 50) continue

      quantity = parsedQuantity
      itemName = parsedName
      break
    }
  }

  const unitPrice = normalizeReceiptNumber(item.unit_price)
  const normalizedUnitPrice = unitPrice > 0
    ? unitPrice
    : Math.round((price / quantity) * 100) / 100

  return {
    label: itemName,
    price,
    emoji: item.emoji ?? null,
    quantity,
    unit_price: normalizedUnitPrice
  }
}

export function normalizeReceiptLineItems(items: RawReceiptLineItem[]): NormalizedReceiptLineItem[] {
  return items.flatMap(item => {
    const normalized = normalizeReceiptLineItem(item)
    return normalized ? [normalized] : []
  })
}
