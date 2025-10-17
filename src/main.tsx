import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation } from 'framer-motion'
import './App.css'
import './styles/theme.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { clearScanCache, setScanCacheEnabled } from './lib/receiptScanning'

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

// Expose debug utilities to window for easy console access
declare global {
  interface Window {
    tabbyDebug: {
      clearScanCache: typeof clearScanCache
      setScanCacheEnabled: typeof setScanCacheEnabled
      clearAllLocalStorage: () => void
      showCachedScans: () => void
    }
  }
}

window.tabbyDebug = {
  clearScanCache: () => {
    const count = clearScanCache()
    console.log(`✅ Cleared ${count} cached scans`)
    return count
  },
  setScanCacheEnabled: (enabled: boolean) => {
    setScanCacheEnabled(enabled)
    console.log(`✅ Scan cache ${enabled ? 'enabled' : 'disabled'}`)
  },
  clearAllLocalStorage: () => {
    const count = localStorage.length
    localStorage.clear()
    console.log(`✅ Cleared all localStorage (${count} items)`)
  },
  showCachedScans: () => {
    const caches = Object.keys(localStorage).filter(key => key.startsWith('scan-cache-'))
    console.log(`📦 Found ${caches.length} cached scans:`)
    caches.forEach((key, i) => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        console.log(`  ${i + 1}. ${key.substring(11, 19)}... - ${data.items?.length || 0} items, ${data.place || 'Unknown'}`)
      } catch {
        console.log(`  ${i + 1}. ${key} - (invalid JSON)`)
      }
    })
    return caches.length
  }
}

// Log available debug commands on startup
console.log('🐛 Tabby Debug Tools Available:')
console.log('  tabbyDebug.clearScanCache()     - Clear all cached receipt scans')
console.log('  tabbyDebug.setScanCacheEnabled(false) - Disable scan cache')
console.log('  tabbyDebug.showCachedScans()    - List all cached scans')
console.log('  tabbyDebug.clearAllLocalStorage() - Clear everything (use with caution!)')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
        <App />
      </LazyMotion>
    </ErrorBoundary>
  </StrictMode>,
)
