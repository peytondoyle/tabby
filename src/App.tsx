import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { LandingPage } from './pages/LandingPage'
import { MyBillsPage } from './pages/MyBillsPage'
import { InteractiveBillPage } from './pages/InteractiveBillPage'
import { SharePage } from './pages/SharePage'
import { runHealthCheck } from './lib/healthCheck'

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
            <Route path="bill/:id" element={<InteractiveBillPage />} />
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
