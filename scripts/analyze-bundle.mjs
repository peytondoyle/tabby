#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

console.log('🔍 Analyzing bundle size and tree-shaking...\n')

// Build the project
console.log('📦 Building project...')
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('✅ Build completed successfully\n')
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}

// Check if stats.html exists
const statsPath = path.join(process.cwd(), 'dist', 'stats.html')
if (existsSync(statsPath)) {
  console.log('📊 Bundle analysis available at:', statsPath)
  console.log('   Open this file in your browser to see detailed bundle analysis\n')
} else {
  console.log('⚠️  Bundle analysis file not found. Check vite.config.ts for visualizer plugin\n')
}

// Check dist directory contents
console.log('📁 Bundle contents:')
try {
  const distContents = execSync('ls -la dist/', { encoding: 'utf8' })
  console.log(distContents)
} catch (error) {
  console.log('Could not list dist contents')
}

// Check for specific vendor chunks
console.log('\n🎯 Checking vendor chunks:')
const vendorChunks = [
  'react-vendor',
  'dnd-vendor', 
  'motion-vendor',
  'exifr-vendor',
  'icons-vendor',
  'supabase-vendor',
  'query-vendor',
  'router-vendor'
]

vendorChunks.forEach(chunk => {
  try {
    const result = execSync(`find dist -name "*${chunk}*" -type f`, { encoding: 'utf8' })
    if (result.trim()) {
      console.log(`✅ ${chunk}: ${result.trim()}`)
    } else {
      console.log(`❌ ${chunk}: Not found`)
    }
  } catch (error) {
    console.log(`❌ ${chunk}: Not found`)
  }
})

// Check for lazy-loaded chunks
console.log('\n🚀 Checking lazy-loaded chunks:')
const lazyChunks = [
  'pages',
  'components',
  'chunks'
]

lazyChunks.forEach(chunk => {
  try {
    const result = execSync(`find dist -name "*${chunk}*" -type f`, { encoding: 'utf8' })
    if (result.trim()) {
      console.log(`✅ ${chunk}: ${result.trim()}`)
    } else {
      console.log(`❌ ${chunk}: Not found`)
    }
  } catch (error) {
    console.log(`❌ ${chunk}: Not found`)
  }
})

console.log('\n✨ Bundle analysis complete!')
console.log('💡 Tips:')
console.log('   - Open dist/stats.html to see detailed bundle analysis')
console.log('   - Check that vendor chunks are properly split')
console.log('   - Verify lazy-loaded components are in separate chunks')
console.log('   - Look for any unexpectedly large chunks')
