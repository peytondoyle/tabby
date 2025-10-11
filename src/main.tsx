import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './styles/theme.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

// Add global error handlers to prevent page reloads
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Prevent the default behavior which might cause page reload
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // Don't prevent default for regular errors, just log them
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
