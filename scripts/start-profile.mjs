#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🚀 Starting Tabby in Profile Mode...')
console.log('📊 This will load a 150-item bill fixture for performance testing')
console.log('🔍 Open React DevTools and go to the Profiler tab to analyze performance')
console.log('')

// Start Vite in profile mode
const vite = spawn('npm', ['run', 'profile'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
})

vite.on('error', (error) => {
  console.error('❌ Failed to start profile mode:', error)
  process.exit(1)
})

vite.on('close', (code) => {
  console.log(`\n📊 Profile mode exited with code ${code}`)
  process.exit(code)
})

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping profile mode...')
  vite.kill('SIGINT')
})

// Open browser after a delay
setTimeout(() => {
  console.log('🌐 Opening profile page in browser...')
  const open = spawn('open', ['http://localhost:5173/profile'], {
    stdio: 'inherit',
    shell: true
  })
  
  open.on('error', () => {
    // Ignore errors (open might not be available on all systems)
    console.log('💡 Manually navigate to http://localhost:5173/profile')
  })
}, 3000)
