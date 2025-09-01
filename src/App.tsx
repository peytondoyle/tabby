import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { DevBanner } from './components/DevBanner'
import { runHealthCheck } from './lib/healthCheck'

// Lazy load route components for code splitting
const MyBillsPage = lazy(() => import('./pages/MyBillsPage').then(m => ({ default: m.MyBillsPage })))
const Flow = lazy(() => import('./pages/Flow').then(m => ({ default: m.Flow })))
const SharePage = lazy(() => import('./pages/SharePage').then(m => ({ default: m.SharePage })))
const DevHealthPage = lazy(() => import('./pages/DevHealthPage').then(m => ({ default: m.DevHealthPage })))

// Lightweight loading skeleton
const PageSkeleton = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-gray-400">Loading...</div>
  </div>
)

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
      <DevBanner />
      <Router>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={
              <Suspense fallback={<PageSkeleton />}>
                <MyBillsPage />
              </Suspense>
            } />
            <Route path="bills" element={
              <Suspense fallback={<PageSkeleton />}>
                <MyBillsPage />
              </Suspense>
            } />
            <Route path="bill/:token" element={
              <Suspense fallback={<PageSkeleton />}>
                <Flow />
              </Suspense>
            } />
            <Route path="share/:id" element={
              <Suspense fallback={<PageSkeleton />}>
                <SharePage />
              </Suspense>
            } />
            <Route path="dev-health" element={
              <Suspense fallback={<PageSkeleton />}>
                <DevHealthPage />
              </Suspense>
            } />
            <Route path="*" element={<Navigate to="/bills" replace />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

// Used by Vite/React entry point in main.tsx
export default App
