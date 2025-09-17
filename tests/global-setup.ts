import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting performance test setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...')
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    
    // Verify the app is running
    const title = await page.title()
    if (!title.includes('Tabby')) {
      throw new Error('App not ready - title does not contain "Tabby"')
    }
    
    console.log('✅ Development server is ready')
    
    // Pre-warm the profile page with 150-item fixture
    console.log('🔥 Pre-warming 150-item fixture...')
    await page.goto('http://localhost:5173/profile')
    await page.waitForSelector('[data-testid="profile-page"]', { timeout: 30000 })
    
    // Ensure 150-item fixture is loaded
    const largeFixtureButton = page.locator('button:has-text("150 Items")')
    await largeFixtureButton.click()
    await page.waitForSelector('[data-testid="item-row"]', { timeout: 30000 })
    
    const itemCount = await page.locator('[data-testid="item-row"]').count()
    if (itemCount !== 150) {
      throw new Error(`Expected 150 items, got ${itemCount}`)
    }
    
    console.log('✅ 150-item fixture pre-warmed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
