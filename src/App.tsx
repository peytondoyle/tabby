import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { BillPage } from './pages/BillPage'
import { SharePage } from './pages/SharePage'

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
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppShell>
          <Routes>
            <Route path="/bill/:id" element={<BillPage />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="/" element={<Navigate to="/bill/new" replace />} />
          </Routes>
        </AppShell>
      </Router>
    </QueryClientProvider>
  )
}

export default App
