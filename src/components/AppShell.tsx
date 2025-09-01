import React from 'react'
import { Outlet, useLocation, useParams, useNavigate } from 'react-router-dom'
import { Settings, Share2 } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useFlowStore } from '@/lib/flowStore'

export const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { bill, items, people } = useFlowStore()
  
  // Determine if we're on a bill page
  const isBillPage = location.pathname.startsWith('/bill/') && id && id !== 'new'
  
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
          <span className="text-text-primary">Current Bill</span>
        </div>
      )
    }
    return null
  }

  // Get bill title and meta info
  const getBillInfo = () => {
    if (!isBillPage || !bill) return null
    
    return (
      <div className="hidden md:block text-center flex-1 max-w-md mx-8">
        <h1 className="text-lg font-semibold text-text-primary truncate">
          {bill.title || 'Split Bill'}
        </h1>
        <p className="text-sm text-text-secondary">
          {items.length} item{items.length !== 1 ? 's' : ''} • {people.length} {people.length !== 1 ? 'people' : 'person'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Clean, Compact Header */}
      <header className="sticky top-0 z-50 bg-surface-elevated border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: App Name + Breadcrumb */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/bills')}
                className="text-2xl font-bold text-text-primary hover:text-primary transition-colors"
              >
                Billy
              </button>
              {getBreadcrumb()}
            </div>

            {/* Center: Bill Title & Meta (only on bill pages) */}
            {getBillInfo()}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button 
                onClick={() => navigate('/bills')}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                title="View all bills"
                aria-label="View all bills"
              >
                <Settings className="w-5 h-5" />
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
