import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
    // Allow connections from any host (Safari needs this)
    host: true,
    // Disable strict CORS for development
    cors: true,
    // Proxy API calls to vercel dev server
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('⚠️  API proxy error (is vercel dev running on :3000?):', err.message)
            if (res && 'headersSent' in res && !res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                error: 'API server not available',
                message: 'Vercel dev server is not running on port 3000. Run `npm run dev:full` to start both servers.'
              }))
            }
          })

          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log(`🔄 Proxying ${req.method} ${req.url} to http://127.0.0.1:3000`)
          })
        }
      }
    }
  },
  build: {
    // Modern build target for better tree-shaking
    target: 'es2020',
    // Disable sourcemaps in production for smaller bundle
    sourcemap: false,
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
          
          // DnD Kit - split into separate chunk
          if (id.includes('@dnd-kit')) {
            return 'dnd-vendor'
          }
          
          // Framer Motion - split into separate chunk
          if (id.includes('framer-motion')) {
            return 'motion-vendor'
          }
          
          // Exifr - split into separate chunk
          if (id.includes('exifr')) {
            return 'exifr-vendor'
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase-vendor'
          }
          
          // React Router
          if (id.includes('react-router')) {
            return 'router-vendor'
          }
          
          // TanStack Query
          if (id.includes('@tanstack')) {
            return 'query-vendor'
          }
          
          // Lucide React icons - split into separate chunk
          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }
          
          // Other vendor libraries
          if (id.includes('node_modules/')) {
            return 'vendor'
          }
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            // Name chunks based on their entry point
            if (facadeModuleId.includes('pages/')) {
              return 'pages/[name]-[hash].js'
            }
            if (facadeModuleId.includes('components/')) {
              return 'components/[name]-[hash].js'
            }
          }
          return 'chunks/[name]-[hash].js'
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      },
    },
  },
  // Profile mode configuration
  define: {
    ...(mode === 'profile' && {
      'import.meta.env.PROFILE_MODE': JSON.stringify(true),
    }),
  },
  esbuild: {
    ...(mode === 'profile' && {
      // Keep function names for better profiling
      keepNames: true,
    }),
    // Remove console.logs in production
    ...(mode === 'production' && {
      drop: ['console', 'debugger'],
    }),
  },
}))