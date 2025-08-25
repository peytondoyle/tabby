import React from 'react'
import { Outlet } from 'react-router-dom'

interface AppShellProps {
  children?: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Tabby
              </h1>
              <span className="ml-2 text-sm text-gray-500">
                Split bills with friends
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {/* TODO: Add share button, settings, etc. */}
              <button className="btn-secondary text-sm">
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children || <Outlet />}
      </main>
    </div>
  )
}
