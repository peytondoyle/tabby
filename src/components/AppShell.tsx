import React from 'react'
import { Outlet, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Settings, Share2 } from '@/lib/icons'
import { testIds } from '@/lib/testIds'


export const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  // Determine if we're on a receipt page (editing or viewing)
  const isBillPage = (location.pathname.startsWith('/receipt/') && id && id !== 'new') || (location.pathname.startsWith('/bill/') && id && id !== 'new')
  
  // Get breadcrumb context
  const getBreadcrumb = () => {
    if (isBillPage) {
      return (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <button
            onClick={() => navigate('/bills')}
            className="hover:text-text-primary transition-colors"
          >
            My Bills
          </button>
          <span>/</span>
          <span className="text-text-primary">Assign Items</span>
        </div>
      )
    }
    return null
  }



  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid={testIds.appShell}>
      {/* Clean, Slim Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-white/10 shadow-sm" data-testid={testIds.header}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Tabby Logo + Back Button (mobile) */}
            <div className="flex items-center gap-4">
              {/* Mobile Back Button */}
              {isBillPage && (
                <button
                  onClick={() => navigate('/bills')}
                  className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                  title="Back to bills"
                  aria-label="Back to bills"
                  data-testid={testIds.backButton}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {/* Tabby Logo */}
              <button
                onClick={() => navigate('/bills')}
                className="text-xl font-bold text-text-primary hover:text-primary transition-colors"
              >
                Tabby
              </button>
              
              {/* Desktop Breadcrumb */}
              <div className="hidden lg:block">
                {getBreadcrumb()}
              </div>
            </div>

            {/* Center: Mobile Page Title */}
            {isBillPage && (
              <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
                <h1 className="text-sm font-medium text-text-secondary">Assign Items</h1>
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/bills')}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                title="My Bills"
                aria-label="My Bills"
              >
                📋
              </button>
              {isBillPage && (
                <button 
                  onClick={() => {/* TODO: Implement share */}}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                  title="Share bill"
                  aria-label="Share bill"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
