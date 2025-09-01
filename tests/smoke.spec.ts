import { test, expect } from '@playwright/test'
import path from 'path'

test('receipt upload flow', async ({ page }) => {
  // Start dev servers (assumes npm run dev:full is running)
  await page.goto('http://localhost:5173')
  
  // Navigate to bills page and click "+ New Receipt"
  await page.click('text="+ New Receipt"')
  
  // Wait for scanner modal to appear
  await expect(page.locator('text="📷 Scan Receipt"')).toBeVisible()
  
  // Upload receipt image
  const fileInput = page.locator('input[type="file"]')
  const receiptPath = path.join(__dirname, '..', 'fixtures', 'receipt.jpg')
  await fileInput.setInputFiles(receiptPath)
  
  // Wait for warming state
  await expect(page.locator('text="Starting the receipt analyzer… one moment."')).toBeVisible({ timeout: 2000 })
  
  // Wait for analyzing state
  await expect(page.locator('text="Analyzing Receipt"')).toBeVisible({ timeout: 5000 })
  
  // Wait for navigation to bill page and items to appear
  await expect(page.locator('text="Items"')).toBeVisible({ timeout: 15000 })
  
  // Assert at least one item is present with a price
  const items = page.locator('[data-testid="item-row"]')
  await expect(items).toHaveCount({ min: 1 })
  
  // Check that first item has a price (should contain $ symbol)
  const firstItemPrice = page.locator('[data-testid="item-price"]').first()
  await expect(firstItemPrice).toContainText('$')
  
  // Verify price is not $0.00
  const priceText = await firstItemPrice.textContent()
  expect(priceText).not.toBe('$0.00')
})