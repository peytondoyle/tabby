import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Flow } from './pages/Flow'
import { SharePage } from './pages/SharePage'
import { ReceiptPage } from './pages/ReceiptPage'
import { MyReceiptsPage } from './pages/MyReceiptsPage'
import { queryClient } from './lib/queryClient'
import { TabbySimple } from './tabby-ui-simple/TabbySimple'
import { AuthProvider } from './lib/authContext'

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
            <Route path="/bill/:token" element={<Flow />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
