import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up performance tests...')
  
  // Log performance test completion
  console.log('✅ Performance tests completed')
  console.log('📊 Check test-results/performance/ for detailed reports')
  console.log('🎯 Performance budgets: 60fps, <50ms frames, <3.5s TTI, <300KB bundle')
}
