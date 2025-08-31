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
