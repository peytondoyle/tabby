import './App.css'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { SharePage } from './pages/SharePage'
import { ReceiptPage } from './pages/ReceiptPage'
import { MyReceiptsPage } from './pages/MyReceiptsPage'
import { queryClient } from './lib/queryClient'
import { TabbySimple } from './tabby-ui-simple/TabbySimple'
import { AuthProvider } from './lib/authContext'

// Redirect component for old /bill/ URLs
function BillRedirect() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={`/receipt/${token}/edit`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Use the simplified Tabby UI as default */}
            <Route path="/" element={<TabbySimple />} />
            <Route path="/receipts" element={<MyReceiptsPage />} />
            <Route path="/receipt/:token" element={<ReceiptPage />} />
            <Route path="/receipt/:token/people" element={<TabbySimple />} />
            <Route path="/receipt/:token/edit" element={<TabbySimple />} />
            {/* Redirect old /bill/ URLs to new /receipt/ URLs */}
            <Route path="/bill/:token" element={<BillRedirect />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
