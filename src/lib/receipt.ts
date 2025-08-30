export const ReceiptStates = {
  NONE: "none",
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  READY: "ready",
} as const;

export type ReceiptState = typeof ReceiptStates[keyof typeof ReceiptStates];

export interface Bill {
  id: string;
  title: string;
  place: string;
  date: string;
  currency: string;
  subtotal: number;
  sales_tax: number;
  tip: number;
  tax_split_method: string;
  tip_split_method: string;
  include_zero_item_people: boolean;
  editor_token: string;
  viewer_token: string;
  receipt_url?: string;
  ocr_status?: string;
}

export function getReceiptState(bill: Bill): ReceiptState {
  if (!bill) return ReceiptStates.NONE;
  
  // Check if OCR is processing
  if (bill.ocr_status === "processing") {
    return ReceiptStates.PROCESSING;
  }
  
  // Check if receipt is uploaded but not processed
  if (bill.receipt_url && !bill.ocr_status) {
    return ReceiptStates.UPLOADED;
  }
  
  // Check if OCR is complete
  if (bill.ocr_status === "completed") {
    return ReceiptStates.READY;
  }
  
  return ReceiptStates.NONE;
}

export function hasReceipt(bill: Bill): boolean {
  return getReceiptState(bill) !== ReceiptStates.NONE;
}

export function isProcessing(bill: Bill): boolean {
  return getReceiptState(bill) === ReceiptStates.PROCESSING;
}
