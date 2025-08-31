import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Proxy API calls to vercel dev server (alternative to running vercel dev)
    // Uncomment if you want to run Vite dev server separately from vercel dev
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Fallback to return 404 if vercel dev is not running
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('API proxy error (is vercel dev running on :3000?):', err.message)
            if (res && 'headersSent' in res && !res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'API server not available' }))
            }
          })
        }
      }
    }
  },
  build: {
    // Increase chunk size warning limit after splitting
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React and React DOM
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor'
          }
          
          // DnD Kit
          if (id.includes('@dnd-kit')) {
            return 'dnd-vendor'
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase-vendor'
          }
          
          // React Router
          if (id.includes('react-router')) {
            return 'router-vendor'
          }
          
          // Framer Motion
          if (id.includes('framer-motion')) {
            return 'motion-vendor'
          }
          
          // TanStack Query
          if (id.includes('@tanstack')) {
            return 'query-vendor'
          }
          
          // Other large libraries
          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }
        },
      },
    },
  },
})
