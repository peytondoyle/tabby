import React from 'react'

interface PeopleGridProps {
  billId?: string
}

export const PeopleGrid: React.FC<PeopleGridProps> = ({ billId: _billId }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">People</h2>
        <button className="btn-primary text-sm">
          Add Person
        </button>
      </div>
      
      <div className="space-y-4">
        {/* TODO: People cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-gray-500 text-lg">👤</span>
            </div>
            <p className="text-sm text-gray-500">
              No people yet
            </p>
          </div>
        </div>

        {/* TODO: Groups section */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Groups</h3>
          <div className="text-sm text-gray-500">
            Create groups to combine totals (e.g., couples)
          </div>
        </div>
      </div>
    </div>
  )
}
