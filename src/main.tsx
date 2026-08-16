import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './styles/theme.css'
import './styles/brand.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => {
      registrations.forEach(registration => {
        void registration.unregister()
      })
    })
    .catch(error => {
      console.warn('Service worker cleanup failed:', error)
    })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
