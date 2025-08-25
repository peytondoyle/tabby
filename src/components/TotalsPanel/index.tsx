import React from 'react'

interface TotalsPanelProps {
  billId?: string
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({ billId: _billId }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Totals</h2>
        <button className="btn-secondary text-sm">
          Settings
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Bill Summary */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tip:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span className="text-gray-900">Total:</span>
              <span className="font-mono text-lg">$0.00</span>
            </div>
          </div>
        </div>

        {/* Split Controls */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Split Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tax Split:</span>
              <select className="input-field text-sm w-32">
                <option value="proportional">Proportional</option>
                <option value="even">Even</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tip Split:</span>
              <select className="input-field text-sm w-32">
                <option value="proportional">Proportional</option>
                <option value="even">Even</option>
              </select>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="include-zero" className="mr-2" />
              <label htmlFor="include-zero" className="text-sm text-gray-600">
                Include people with no items in even splits
              </label>
            </div>
          </div>
        </div>

        {/* Per-Person Totals */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Per Person</h3>
          <div className="text-sm text-gray-500">
            Add people and assign items to see totals
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="btn-primary w-full">
            Generate Share Card
          </button>
          <button className="btn-secondary w-full">
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
