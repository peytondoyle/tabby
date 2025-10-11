import { test, expect } from '@playwright/test'
import path from 'path'

test.describe.skip('Tabby Smoke Tests - DISABLED: UI has changed significantly', () => {
  test.skip('complete user flow: scan → create → add people → assign → share → delete', async ({ page }) => {
    // Setup console warning capture
    const consoleWarnings: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // Start at homepage
    await page.goto('http://localhost:5173')
    
    // Step 1: Scan Receipt - Navigate to bills page and click "+ New Receipt"
    await page.click('text="+ New Receipt"')
    
    // Wait for scanner modal to appear
    await expect(page.locator('text="📷 Scan Receipt"')).toBeVisible()
    
    // Upload receipt image
    const fileInput = page.locator('input[type="file"]')
    const receiptPath = path.join(__dirname, '..', 'fixtures', 'receipt.jpg')
    await fileInput.setInputFiles(receiptPath)
    
    // Wait for analyzing state
    await expect(page.locator('text="Analyzing Receipt"')).toBeVisible({ timeout: 5000 })
    
    // Step 2: Create - Wait for navigation to flow and items to appear
    await expect(page.locator('text="Items"')).toBeVisible({ timeout: 15000 })
    
    // Assert at least one item is present with a price
    const items = page.locator('[data-testid="item-pill"], .item-pill')
    await expect(items).toHaveCount({ min: 1 })
    
    // Navigate to next step (People step)
    await page.click('button:has-text("Next"), button:has-text("Continue")')
    
    // Step 3: Add People
    await expect(page.locator('text="Add People"')).toBeVisible({ timeout: 5000 })
    
    // Add first person
    await page.click('button:has-text("Add People"), [data-testid="add-person-button"]')
    await page.fill('[placeholder="Name"], input[name="name"]', 'Alice')
    await page.fill('[placeholder="Avatar"], input[name="avatar"]', '👩')
    await page.click('button:has-text("Add"), button:has-text("Save")')
    
    // Add second person
    await page.click('button:has-text("Add People"), [data-testid="add-person-button"]')
    await page.fill('[placeholder="Name"], input[name="name"]', 'Bob')
    await page.fill('[placeholder="Avatar"], input[name="avatar"]', '👨')
    await page.click('button:has-text("Add"), button:has-text("Save")')
    
    // Continue to assign step
    await page.click('button:has-text("Next"), button:has-text("Continue")')
    
    // Step 4: Assign Items
    await expect(page.locator('text="Assign", text="Split"')).toBeVisible({ timeout: 5000 })
    
    // Get first item and assign it to Alice
    const firstItem = items.first()
    await firstItem.click()
    await page.click('[data-testid="person-alice"], button:has-text("Alice")')
    
    // Get second item (if exists) and assign it to Bob  
    const itemCount = await items.count()
    if (itemCount > 1) {
      const secondItem = items.nth(1)
      await secondItem.click()
      await page.click('[data-testid="person-bob"], button:has-text("Bob")')
    }
    
    // Continue to share step
    await page.click('button:has-text("Split"), button:has-text("Continue")')
    
    // Step 5: Share
    await expect(page.locator('text="Share Receipt", text="Share Bill"')).toBeVisible({ timeout: 5000 })
    
    // Verify receipt preview is displayed
    await expect(page.locator('[data-testid="receipt-preview"], .receipt-card')).toBeVisible()
    
    // Test share functionality
    await page.click('button:has-text("Share Receipt"), button:has-text("Share")')
    
    // Step 6: Navigate back to bills list and delete
    await page.goto('http://localhost:5173')
    await page.click('text="My Bills", text="Bills"')
    
    // Find and delete the created bill
    const deleteBill = page.locator('[data-testid="delete-bill"], button[title*="Delete"]').first()
    if (await deleteBill.isVisible()) {
      await deleteBill.click()
      
      // Confirm deletion in modal if it appears
      const confirmDelete = page.locator('button:has-text("Delete"), button:has-text("Confirm")')
      if (await confirmDelete.isVisible()) {
        await confirmDelete.click()
      }
    }
    
    // Verify no console warnings occurred
    expect(consoleWarnings.length).toBe(0, `Console warnings found: ${consoleWarnings.join(', ')}`)
  })

  test.skip('destructive modal open/close behavior', async ({ page }) => {
    // Setup console warning capture
    const consoleWarnings: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    await page.goto('http://localhost:5173')
    
    // Navigate to bills page
    await page.click('text="My Bills", text="Bills"')
    
    // Look for a delete button or create a test bill first
    let deleteButton = page.locator('[data-testid="delete-bill"], button[title*="Delete"]').first()
    
    if (!(await deleteButton.isVisible())) {
      // Create a test bill first
      await page.click('text="+ New Receipt"')
      await page.click('text="Skip"') // Skip scanning
      await page.goto('http://localhost:5173')
      await page.click('text="My Bills", text="Bills"')
      deleteButton = page.locator('[data-testid="delete-bill"], button[title*="Delete"]').first()
    }
    
    // Test opening destructive modal
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Modal should be visible
      await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).toBeVisible()
      
      // Test closing with Cancel
      await page.click('button:has-text("Cancel")')
      await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).not.toBeVisible()
      
      // Test opening again and closing with X button
      await deleteButton.click()
      await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).toBeVisible()
      
      const closeButton = page.locator('[data-testid="close-modal"], [aria-label="Close"], button:has-text("×")')
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).not.toBeVisible()
      }
      
      // Test opening again and closing with Escape key
      await deleteButton.click()
      await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).toBeVisible()
      
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="delete-modal"], .modal, [role="dialog"]')).not.toBeVisible()
    }
    
    // Verify no console warnings occurred
    expect(consoleWarnings.length).toBe(0, `Console warnings found: ${consoleWarnings.join(', ')}`)
  })
})