import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { MyBillsPage } from './pages/MyBillsPage'
import { Flow } from './pages/Flow'
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
            <Route path="bill/:token" element={<Flow />} />
            <Route path="share/:id" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/bills" replace />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

// Used by Vite/React entry point in main.tsx
export default App
