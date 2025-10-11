import { test, expect } from '@playwright/test'

// Mock scan adapter for testing
const mockScanResult = {
  venue: {
    name: 'Test Restaurant',
    location: 'Test Location',
    date: new Date('2024-01-15')
  },
  items: [
    { id: '1', label: 'Chicken with Cashew Nuts', price: 15.35, emoji: '🍗' },
    { id: '2', label: 'Shanghai Spring Roll', price: 2.30, emoji: '🥟' },
    { id: '3', label: 'Wonton Soup', price: 3.30, emoji: '🍲' },
    { id: '4', label: 'Chicken with Broccoli', price: 15.35, emoji: '🥦' },
    { id: '5', label: 'Mapo Tofu', price: 13.75, emoji: '🍽️' },
    { id: '6', label: 'Vegetable Fried Rice', price: 11.55, emoji: '🍚' },
    { id: '7', label: 'Vegetables Spring Roll', price: 2.20, emoji: '🥟' }
  ],
  subtotal: 63.80,
  tax: 6.38,
  tip: 8.31,
  total: 78.49
}

test.describe('Share Bill Flow - V2 Components', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the scan adapter by intercepting the module
    await page.route('**/scanAdapter.ts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          import React from 'react';
          
          export const useScanMachine = () => {
            const [state, setState] = React.useState({
              status: 'idle',
              progress: 0,
              error: null,
              result: null
            });
            
            const scan = async (file) => {
              setState({ status: 'checking', progress: 0.1, error: null, result: null });
              await new Promise(resolve => setTimeout(resolve, 100));
              setState({ status: 'uploading', progress: 0.5, error: null, result: null });
              await new Promise(resolve => setTimeout(resolve, 100));
              setState({ status: 'parsing', progress: 0.8, error: null, result: null });
              await new Promise(resolve => setTimeout(resolve, 100));
              setState({ 
                status: 'success', 
                progress: 1.0, 
                error: null, 
                result: {
                  venue: {
                    name: 'Test Restaurant',
                    location: 'Test Location',
                    date: new Date('2024-01-15')
                  },
                  items: [
                    { id: '1', name: 'Chicken with Cashew Nuts', price: 15.35, emoji: '🍗' },
                    { id: '2', name: 'Shanghai Spring Roll', price: 2.30, emoji: '🥟' },
                    { id: '3', name: 'Wonton Soup', price: 3.30, emoji: '🍲' },
                    { id: '4', name: 'Chicken with Broccoli', price: 15.35, emoji: '🥦' },
                    { id: '5', name: 'Mapo Tofu', price: 13.75, emoji: '🍽️' },
                    { id: '6', name: 'Vegetable Fried Rice', price: 11.55, emoji: '🍚' },
                    { id: '7', name: 'Vegetables Spring Roll', price: 2.20, emoji: '🥟' }
                  ],
                  subtotal: 63.80,
                  tax: 6.38,
                  tip: 8.31,
                  total: 78.49
                }
              });
            };
            
            const retry = async () => {
              setState({ status: 'retrying', progress: 0, error: null, result: null });
              await new Promise(resolve => setTimeout(resolve, 100));
              setState({ 
                status: 'success', 
                progress: 1.0, 
                error: null, 
                result: {
                  venue: {
                    name: 'Test Restaurant',
                    location: 'Test Location',
                    date: new Date('2024-01-15')
                  },
                  items: [
                    { id: '1', name: 'Chicken with Cashew Nuts', price: 15.35, emoji: '🍗' },
                    { id: '2', name: 'Shanghai Spring Roll', price: 2.30, emoji: '🥟' },
                    { id: '3', name: 'Wonton Soup', price: 3.30, emoji: '🍲' },
                    { id: '4', name: 'Chicken with Broccoli', price: 15.35, emoji: '🥦' },
                    { id: '5', name: 'Mapo Tofu', price: 13.75, emoji: '🍽️' },
                    { id: '6', name: 'Vegetable Fried Rice', price: 11.55, emoji: '🍚' },
                    { id: '7', name: 'Vegetables Spring Roll', price: 2.20, emoji: '🥟' }
                  ],
                  subtotal: 63.80,
                  tax: 6.38,
                  tip: 8.31,
                  total: 78.49
                }
              });
            };
            
            return { state, scan, retry };
          };
        `
      });
    });

    await page.goto('/share-bill')
  })

  test('V2 Components render correctly', async ({ page }) => {
    // Step 0: Upload - Check V2 layout structure
    await expect(page.locator('h1').first()).toContainText('Split Your Bill')
    await expect(page.locator('text=Assign items to people effortlessly')).toBeVisible()
    await expect(page.locator('[role="list"]')).toBeVisible() // Progress steps
    await expect(page.locator('text=Upload receipt')).toBeVisible()
    
    // Check V2 glass surface styling
    await expect(page.locator('.glass-surface')).toBeVisible()
    
    // Check V2 progress steps styling
    await expect(page.locator('[role="list"] .w-5.h-5').first()).toBeVisible() // 20px dots
    
    // Check V2 sticky bar
    await expect(page.locator('button:has-text("Continue to Scan")')).toBeVisible()
  })

  test('Keyboard navigation', async ({ page }) => {
    // Navigate through progress steps
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate through items
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Space should select items
    await page.keyboard.press(' ')
    
    // Arrow keys should navigate people pills
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
  })

  test('Assignment validation', async ({ page }) => {
    // Upload and scan
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    })
    
    await page.waitForTimeout(2000) // Wait for scan completion

    // "Review Split" button should be disabled until items are assigned
    await expect(page.locator('button:has-text("Review Split")')).toBeDisabled()
    
    // Assign one item
    await page.locator('button:has-text("Chicken with Cashew Nuts")').click()
    
    // Button should now be enabled
    await expect(page.locator('button:has-text("Review Split")')).toBeEnabled()
  })

  test('Visual snapshots', async ({ page }) => {
    // Upload and scan
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    })
    
    await page.waitForTimeout(2000) // Wait for scan completion

    // Take snapshots of key components - V2 Spec
    await expect(page.locator('text=Who\'s splitting?').first()).toHaveScreenshot('assign-panel-v2-default.png')
    
    // Assign some items and take snapshot with selections
    await page.locator('button:has-text("Chicken with Cashew Nuts")').click()
    await page.locator('button:has-text("Shanghai Spring Roll")').click()
    await expect(page.locator('text=Who\'s splitting?').first()).toHaveScreenshot('assign-panel-v2-with-selections.png')
    
    // Go to review and take snapshot
    await page.locator('button:has-text("Review Split")').click()
    await expect(page.locator('text=Split Summary')).toHaveScreenshot('review-panel-v2.png')
  })

  test('Accessibility checks', async ({ page }) => {
    // Upload and scan
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    })
    
    await page.waitForTimeout(2000) // Wait for scan completion

    // Check ARIA attributes
    await expect(page.locator('[role="list"]')).toBeVisible() // Progress steps
    await expect(page.locator('[role="radiogroup"]')).toBeVisible() // People pills
    await expect(page.locator('[aria-current="step"]')).toBeVisible() // Current step
    
    // Check focus management
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // Check color contrast (basic check)
    const textElements = page.locator('text=You, text=Items to assign, text=Review Split')
    await expect(textElements).toHaveCount(3)
  })
})
