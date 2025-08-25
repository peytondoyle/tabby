import React from 'react'

interface ReceiptPanelProps {
  billId?: string
}

export const ReceiptPanel: React.FC<ReceiptPanelProps> = ({ billId: _billId }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
        <button className="btn-primary text-sm">
          Upload Receipt
        </button>
      </div>
      
      <div className="space-y-4">
        {/* TODO: Receipt image/PDF viewer */}
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-2">
            📄
          </div>
          <p className="text-sm text-gray-500">
            Upload a receipt to get started
          </p>
        </div>

        {/* TODO: Items list */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Items</h3>
          <div className="text-sm text-gray-500">
            No items yet. Upload a receipt or add items manually.
          </div>
        </div>
      </div>
    </div>
  )
}
