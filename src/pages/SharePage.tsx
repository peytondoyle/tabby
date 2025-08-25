import React from 'react'
import { useParams } from 'react-router-dom'

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tabby
          </h1>
          <p className="text-gray-600">
            Bill split by a friend
          </p>
        </div>

        {/* TODO: ShareCard component will go here */}
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-2">
            📊
          </div>
          <p className="text-sm text-gray-500">
            Share card will be generated here
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Bill ID: {id}
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This is a read-only view of the bill split
          </p>
        </div>
      </div>
    </div>
  )
}
