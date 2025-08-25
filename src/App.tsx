import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { BillPage } from './pages/BillPage'
import { SharePage } from './pages/SharePage'

function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/bill/:id" element={<BillPage />} />
          <Route path="/share/:id" element={<SharePage />} />
          <Route path="/" element={<Navigate to="/bill/new" replace />} />
        </Routes>
      </AppShell>
    </Router>
  )
}

export default App
