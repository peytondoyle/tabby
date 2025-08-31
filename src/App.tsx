import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { LandingPage } from './pages/LandingPage'
import { MyBillsPage } from './pages/MyBillsPage'
import { InteractiveBillPage } from './pages/InteractiveBillPage'
import { EnhancedBillPage } from './pages/EnhancedBillPage'
import { Flow } from './pages/Flow'
import { SharePage } from './pages/SharePage'
import { runHealthCheck } from './lib/healthCheck'
import { LEGACY_BILL_PAGES } from './lib/flags'

// Redirect component for legacy bill routes
const BillToFlowRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/bill/${id}/flow`} replace />
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  // Run health check on app boot (dev only)
  useEffect(() => {
    runHealthCheck()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<MyBillsPage />} />
            <Route path="bills" element={<MyBillsPage />} />
            
            {/* Default bill route - redirect to flow */}
            <Route path="bill/:id" element={<BillToFlowRedirect />} />
            
            {/* New flow route */}
            <Route path="bill/:token/flow" element={<Flow />} />
            
            {/* Legacy pages - only available in development */}
            {LEGACY_BILL_PAGES && (
              <>
                <Route path="bill/:id/legacy" element={<EnhancedBillPage />} />
                <Route path="bill-classic/:id" element={<InteractiveBillPage />} />
              </>
            )}
            
            <Route path="bill" element={<Navigate to="/bills" replace />} />
            <Route path="share/:id" element={<SharePage />} />
            <Route path="landing" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/bills" replace />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
