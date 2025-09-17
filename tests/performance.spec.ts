import { test, expect, Page } from '@playwright/test'
import { 
  measureActionPerformance, 
  assertPerformanceBudget, 
  getMemoryUsage, 
  measureBundleSize,
  PERFORMANCE_BUDGETS 
} from './utils/performance'

// Removed old measurePerformance function - now using utilities

/**
 * Load the 150-item fixture and navigate to profile page
 */
async function loadLargeFixture(page: Page) {
  await page.goto('/profile')
  
  // Wait for the page to load
  await page.waitForSelector('[data-testid="profile-page"]', { timeout: 10000 })
  
  // Ensure 150-item fixture is selected
  const largeFixtureButton = page.locator('button:has-text("150 Items")')
  await expect(largeFixtureButton).toHaveClass(/bg-primary/)
  
  // Wait for items to load
  await page.waitForSelector('[data-testid="item-row"]', { timeout: 10000 })
  
  // Verify we have 150 items
  const itemCount = await page.locator('[data-testid="item-row"]').count()
  expect(itemCount).toBe(150)
}

/**
 * Select multiple items by clicking on them
 */
async function selectItems(page: Page, count: number) {
  const items = page.locator('[data-testid="item-row"]')
  
  for (let i = 0; i < count; i++) {
    await items.nth(i).click()
    // Small delay between selections to avoid overwhelming the UI
    await page.waitForTimeout(50)
  }
  
  // Verify selection count
  const selectedCount = await page.locator('[data-testid="selected-count"]').textContent()
  expect(selectedCount).toContain(count.toString())
}

/**
 * Assign selected items to a person
 */
async function assignToPerson(page: Page) {
  // Click on the first person
  const firstPerson = page.locator('[data-testid="person-card"]').first()
  await firstPerson.click()
  
  // Wait for assignment to complete
  await page.waitForTimeout(100)
}

/**
 * Scroll through the item list
 */
async function scrollThroughItems(page: Page) {
  const itemList = page.locator('[data-testid="items-grid"]')
  
  // Scroll down
  await itemList.evaluate(el => el.scrollTo(0, el.scrollHeight))
  await page.waitForTimeout(500)
  
  // Scroll back up
  await itemList.evaluate(el => el.scrollTo(0, 0))
  await page.waitForTimeout(500)
}

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.coverage.startJSCoverage()
    await page.coverage.startCSSCoverage()
  })

  test.afterEach(async ({ page }) => {
    // Stop coverage collection
    await page.coverage.stopJSCoverage()
    await page.coverage.stopCSSCoverage()
  })

  test('150-item fixture performance - scrolling and selection', async ({ page }) => {
    // Load the large fixture
    await loadLargeFixture(page)
    
    // Test scrolling performance
    const { metrics, passed, violations } = await measureActionPerformance(
      page,
      async () => {
        await scrollThroughItems(page)
      },
      PERFORMANCE_BUDGETS.SMOOTH
    )
    
    // Assert scrolling performance
    assertPerformanceBudget(metrics, PERFORMANCE_BUDGETS.SMOOTH, 'Scrolling performance')
    
    console.log('Scroll Performance:', metrics)
    if (!passed) {
      console.log('Violations:', violations)
    }
  })

  test('150-item fixture performance - item selection', async ({ page }) => {
    // Load the large fixture
    await loadLargeFixture(page)
    
    // Test selection performance
    const { metrics, passed, violations } = await measureActionPerformance(
      page,
      async () => {
        await selectItems(page, 10)
      },
      PERFORMANCE_BUDGETS.SMOOTH
    )
    
    // Assert selection performance
    assertPerformanceBudget(metrics, PERFORMANCE_BUDGETS.SMOOTH, 'Selection performance')
    
    console.log('Selection Performance:', metrics)
    if (!passed) {
      console.log('Violations:', violations)
    }
  })

  test('150-item fixture performance - assignment workflow', async ({ page }) => {
    // Load the large fixture
    await loadLargeFixture(page)
    
    // Test complete assignment workflow
    const { metrics, passed, violations } = await measureActionPerformance(
      page,
      async () => {
        // Select 10 items
        await selectItems(page, 10)
        
        // Assign to person
        await assignToPerson(page)
        
        // Clear selection
        await page.click('[data-testid="clear-selection"]')
      },
      PERFORMANCE_BUDGETS.SMOOTH
    )
    
    // Assert assignment performance
    assertPerformanceBudget(metrics, PERFORMANCE_BUDGETS.SMOOTH, 'Assignment workflow performance')
    
    console.log('Assignment Performance:', metrics)
    if (!passed) {
      console.log('Violations:', violations)
    }
  })

  test('150-item fixture performance - keyboard navigation', async ({ page }) => {
    // Load the large fixture
    await loadLargeFixture(page)
    
    // Switch to keyboard mode
    await page.click('button:has-text("Keyboard")')
    await page.waitForTimeout(100)
    
    // Test keyboard navigation performance
    const { metrics, passed, violations } = await measureActionPerformance(
      page,
      async () => {
        // Focus on the items grid
        await page.click('[data-testid="items-grid"]')
        
        // Navigate with arrow keys
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('ArrowDown')
          await page.waitForTimeout(50)
        }
        
        // Select items with Enter
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Enter')
          await page.waitForTimeout(50)
        }
      },
      PERFORMANCE_BUDGETS.SMOOTH
    )
    
    // Assert keyboard performance
    assertPerformanceBudget(metrics, PERFORMANCE_BUDGETS.SMOOTH, 'Keyboard navigation performance')
    
    console.log('Keyboard Performance:', metrics)
    if (!passed) {
      console.log('Violations:', violations)
    }
  })

  test('Memory usage during 150-item interactions', async ({ page }) => {
    // Load the large fixture
    await loadLargeFixture(page)
    
    // Get initial memory usage
    const initialMemory = await getMemoryUsage(page)
    
    // Perform various interactions
    await selectItems(page, 20)
    await scrollThroughItems(page)
    await assignToPerson(page)
    
    // Get final memory usage
    const finalMemory = await getMemoryUsage(page)
    
    // Calculate memory increase
    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024)
    
    // Assert memory usage is reasonable (less than 50MB increase)
    expect(memoryIncreaseMB).toBeLessThan(50)
    
    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)
    console.log('Initial memory:', initialMemory)
    console.log('Final memory:', finalMemory)
  })

  test('Bundle size verification', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Measure bundle size
    const bundleInfo = await measureBundleSize(page)
    
    // Assert bundle size limits
    expect(bundleInfo.totalSize).toBeLessThan(350000) // 350KB total
    expect(bundleInfo.scriptSize).toBeLessThan(300000) // 300KB for scripts
    expect(bundleInfo.styleSize).toBeLessThan(50000)   // 50KB for styles
    expect(bundleInfo.scriptCount).toBeLessThan(20)    // Max 20 script files
    expect(bundleInfo.styleCount).toBeLessThan(5)      // Max 5 style files
    
    console.log('Bundle Analysis:')
    console.log(`Total size: ${(bundleInfo.totalSize / 1024).toFixed(2)}KB`)
    console.log(`Scripts: ${bundleInfo.scriptCount} files, ${(bundleInfo.scriptSize / 1024).toFixed(2)}KB`)
    console.log(`Styles: ${bundleInfo.styleCount} files, ${(bundleInfo.styleSize / 1024).toFixed(2)}KB`)
    
    // Log individual files for debugging
    bundleInfo.files.forEach(file => {
      console.log(`  ${file.type}: ${file.url.split('/').pop()} - ${(file.size / 1024).toFixed(2)}KB`)
    })
  })
})
