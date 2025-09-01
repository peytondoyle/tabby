#!/usr/bin/env node

import { spawn } from 'child_process'
import { createServer } from 'http'

/**
 * dev-full.mjs - Launch both Vercel API and Vite frontend with health check polling
 * 
 * This script:
 * 1. Spawns `npx vercel dev --listen 3000 --yes`
 * 2. Polls `http://127.0.0.1:3000/api/scan-receipt?health=1` up to 40× with 500ms delay
 * 3. Spawns `npx vite --host --port 5173 --strictPort`  
 * 4. Kills both on SIGINT/SIGTERM
 */

console.log('🚀 Starting full-stack development servers...')

// Kill any existing processes on our ports
function killPort(port) {
  return new Promise((resolve) => {
    const kill = spawn('lsof', ['-ti', `:${port}`])
    kill.stdout.on('data', (data) => {
      const pids = data.toString().trim().split('\n').filter(Boolean)
      if (pids.length > 0) {
        console.log(`🔥 Killing existing processes on port ${port}: ${pids.join(', ')}`)
        spawn('kill', ['-9', ...pids])
      }
    })
    kill.on('close', () => resolve())
  })
}

// Poll health endpoint with retry logic
async function pollHealthEndpoint(tries = 40, delayMs = 500) {
  console.log(`🏥 Polling health endpoint (max ${tries} tries, ${delayMs}ms delay)...`)
  
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/scan-receipt?health=1')
      
      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          console.log(`✅ API server healthy after ${attempt} attempts (uptime: ${data.uptimeMs}ms)`)
          return true
        }
      }
    } catch (error) {
      // Expected during startup - API not ready yet
      if (attempt % 10 === 0) {
        console.log(`🔄 Health check attempt ${attempt}/${tries}...`)
      }
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  
  console.warn(`⚠️  API server not healthy after ${tries} attempts`)
  return false
}

async function main() {
  let isShuttingDown = false
  let vercelProcess, viteProcess
  
  // Cleanup function to kill both processes
  function cleanup() {
    if (isShuttingDown) return
    isShuttingDown = true
    
    console.log('\n🛑 Shutting down development servers...')
    if (vercelProcess && !vercelProcess.killed) {
      vercelProcess.kill('SIGTERM')
    }
    if (viteProcess && !viteProcess.killed) {
      viteProcess.kill('SIGTERM')
    }
    process.exit(0)
  }
  
  // Clean up ports
  await killPort(3000)
  await killPort(5173)
  
  // Wait a moment for ports to be freed
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 1. Spawn `npx vercel dev --listen 3000 --yes --debug`
  console.log('📡 Starting Vercel dev server on port 3000...')
  vercelProcess = spawn('npx', ['vercel', 'dev', '--listen', '3000', '--yes', '--debug'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  })
  
  vercelProcess.stdout.on('data', (data) => {
    const output = data.toString()
    if (output.includes('Ready!') || output.includes('Available at')) {
      console.log(`📡 Vercel: ${output.trim()}`)
    }
  })
  
  vercelProcess.stderr.on('data', (data) => {
    const output = data.toString()
    if (!output.includes('Warning') && !output.includes('deprecated')) {
      console.log(`📡 Vercel: ${output.trim()}`)
    }
  })
  
  vercelProcess.on('exit', (code, signal) => {
    console.log(`📡 Vercel process exited with code ${code}, signal ${signal}`)
    cleanup()
  })
  
  // 2. Poll `http://127.0.0.1:3000/api/scan-receipt?health=1` up to 40× with 500ms delay
  const isHealthy = await pollHealthEndpoint(40, 500)
  
  if (!isHealthy) {
    console.error('❌ Failed to confirm API server health. Starting Vite anyway...')
  }
  
  // 3. Spawn `npx vite --host --port 5173 --strictPort`
  console.log('⚡ Starting Vite dev server on port 5173...')
  viteProcess = spawn('npx', ['vite', '--host', '--port', '5173', '--strictPort'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      FORCE_COLOR: '1',
      VITE_API_BASE: 'http://127.0.0.1:3000'
    }
  })
  
  viteProcess.stdout.on('data', (data) => {
    const output = data.toString()
    console.log(`⚡ Vite: ${output.trim()}`)
  })
  
  viteProcess.stderr.on('data', (data) => {
    const output = data.toString()
    console.log(`⚡ Vite: ${output.trim()}`)
  })
  
  viteProcess.on('exit', (code, signal) => {
    console.log(`⚡ Vite process exited with code ${code}, signal ${signal}`)
    cleanup()
  })
  
  // 4. Kill both on SIGINT/SIGTERM
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  
  // Keep the script running
  console.log('\n✅ Both servers are running!')
  console.log('   Frontend: http://localhost:5173')
  console.log('   API:      http://127.0.0.1:3000')
  console.log('   Health:   http://127.0.0.1:3000/api/scan-receipt?health=1')
  console.log('\n💡 Press Ctrl+C to stop all servers')
}

main().catch(console.error)