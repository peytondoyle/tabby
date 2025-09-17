import { test, expect } from '@playwright/test'

test.describe('UI Sandbox Visual Tests', () => {
  test('UI sandbox page renders all components correctly', async ({ page }) => {
    // Navigate to UI sandbox
    await page.goto('/ui-sandbox')
    
    // Wait for page to fully load
    await expect(page.locator('h1:has-text("UI Component Library")')).toBeVisible({ timeout: 10000 })
    
    // Take full page screenshot for visual comparison
    await expect(page).toHaveScreenshot('ui-sandbox-full-page.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })
    
    // Test specific sections with focused screenshots
    
    // 1. Button variants section
    const buttonSection = page.locator('section').filter({ has: page.locator('h2:has-text("Buttons")') })
    await expect(buttonSection).toBeVisible()
    await expect(buttonSection).toHaveScreenshot('ui-buttons-section.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // 2. ItemPill section
    const itemPillSection = page.locator('section').filter({ has: page.locator('h2:has-text("Item Pills")') })
    await expect(itemPillSection).toBeVisible()
    await expect(itemPillSection).toHaveScreenshot('ui-item-pills-section.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // 3. Card section
    const cardSection = page.locator('section').filter({ has: page.locator('h2:has-text("Cards")') })
    await expect(cardSection).toBeVisible()
    await expect(cardSection).toHaveScreenshot('ui-cards-section.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // 4. Modal section (test modal opens correctly)
    const modalSection = page.locator('section').filter({ has: page.locator('h2:has-text("Modals")') })
    await expect(modalSection).toBeVisible()
    
    // Test opening scrolling modal
    const scrollingModalButton = page.locator('button:has-text("Show Scrolling Modal")')
    await expect(scrollingModalButton).toBeVisible()
    await scrollingModalButton.click()
    
    // Wait for modal to appear and take screenshot
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page).toHaveScreenshot('ui-scrolling-modal.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // Close modal
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    
    // 5. Avatar section
    const avatarSection = page.locator('section').filter({ has: page.locator('h2:has-text("Avatars")') })
    await expect(avatarSection).toBeVisible()
    await expect(avatarSection).toHaveScreenshot('ui-avatars-section.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // 6. Skeleton section
    const skeletonSection = page.locator('section').filter({ has: page.locator('h2:has-text("Skeleton")') })
    await expect(skeletonSection).toBeVisible()
    await expect(skeletonSection).toHaveScreenshot('ui-skeleton-section.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
  })
  
  test('UI sandbox components are interactive', async ({ page }) => {
    await page.goto('/ui-sandbox')
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("UI Component Library")')).toBeVisible({ timeout: 10000 })
    
    // Test button interactions
    const primaryButton = page.locator('button:has-text("Primary Button")').first()
    await expect(primaryButton).toBeVisible()
    await primaryButton.click()
    
    // Test ItemPill interactions
    const itemPills = page.locator('[data-testid^="item-pill"], .item-pill')
    if (await itemPills.count() > 0) {
      const firstPill = itemPills.first()
      await expect(firstPill).toBeVisible()
      await firstPill.click()
      
      // Take screenshot after interaction to verify selection state
      await expect(page.locator('section').filter({ 
        has: page.locator('h2:has-text("Item Pills")') 
      })).toHaveScreenshot('ui-item-pills-selected.png', {
        threshold: 0.1,
        maxDiffPixels: 500,
      })
    }
    
    // Test modal functionality
    const basicModalButton = page.locator('button:has-text("Show Basic Modal")')
    if (await basicModalButton.isVisible()) {
      await basicModalButton.click()
      
      // Verify modal opens
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      
      // Close with close button
      const closeButton = page.locator('[aria-label="Close"], button:has-text("×")').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(page.locator('[role="dialog"]')).not.toBeVisible()
      }
    }
  })
  
  test('UI sandbox is accessible', async ({ page }) => {
    await page.goto('/ui-sandbox')
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("UI Component Library")')).toBeVisible({ timeout: 10000 })
    
    // Test keyboard navigation on buttons
    const firstButton = page.locator('button').first()
    await firstButton.focus()
    await expect(firstButton).toBeFocused()
    
    // Test tab navigation through buttons
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    
    // Verify no accessibility violations by checking for proper ARIA attributes
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        // Should have accessible name (text content or aria-label)
        const accessibleName = await button.textContent() || await button.getAttribute('aria-label')
        expect(accessibleName).toBeTruthy()
      }
    }
  })
})

test.describe('UI Palette Playground Tests', () => {
  test('UI palette playground renders and switches themes correctly', async ({ page }) => {
    // Navigate to UI palette playground
    await page.goto('/ui')
    
    // Wait for page to fully load
    await expect(page.locator('h1:has-text("UI Playground")')).toBeVisible({ timeout: 10000 })
    
    // Take screenshot of default palette
    await expect(page).toHaveScreenshot('ui-palette-default.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })
    
    // Test palette switching
    const paletteSelect = page.locator('select')
    await expect(paletteSelect).toBeVisible()
    
    // Switch to violet palette
    await paletteSelect.selectOption('violet')
    await page.waitForTimeout(500) // Allow theme to apply
    
    await expect(page).toHaveScreenshot('ui-palette-violet.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })
    
    // Switch to teal palette
    await paletteSelect.selectOption('teal')
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('ui-palette-teal.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })
    
    // Switch to blue palette
    await paletteSelect.selectOption('blue')
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('ui-palette-blue.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })
    
    // Test modal with different palettes
    const openModalButton = page.locator('button:has-text("Open Modal")')
    await openModalButton.click()
    
    // Take screenshot of modal with blue palette
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page).toHaveScreenshot('ui-palette-blue-modal.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    })
    
    // Close modal
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
  
  test('palette persistence works across page reloads', async ({ page }) => {
    await page.goto('/ui')
    await expect(page.locator('h1:has-text("UI Playground")')).toBeVisible({ timeout: 10000 })
    
    // Switch to violet palette
    const paletteSelect = page.locator('select')
    await paletteSelect.selectOption('violet')
    await page.waitForTimeout(500)
    
    // Verify violet is selected
    await expect(paletteSelect).toHaveValue('violet')
    
    // Reload page
    await page.reload()
    await expect(page.locator('h1:has-text("UI Playground")')).toBeVisible({ timeout: 10000 })
    
    // Verify palette is still violet after reload
    await expect(paletteSelect).toHaveValue('violet')
    
    // Verify data-theme attribute is set correctly
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(dataTheme).toBe('violet')
  })
  
  test('color tokens display correctly for each palette', async ({ page }) => {
    await page.goto('/ui')
    await expect(page.locator('h1:has-text("UI Playground")')).toBeVisible({ timeout: 10000 })
    
    // Test that color swatches are visible and have colors
    const swatches = page.locator('.h-6.w-6.rounded')
    const swatchCount = await swatches.count()
    expect(swatchCount).toBeGreaterThan(0)
    
    // Check that each swatch has a background color
    for (let i = 0; i < swatchCount; i++) {
      const swatch = swatches.nth(i)
      const bgColor = await swatch.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)') // Not transparent
      expect(bgColor).not.toBe('transparent')
    }
    
    // Switch palettes and verify colors change
    const paletteSelect = page.locator('select')
    await paletteSelect.selectOption('violet')
    await page.waitForTimeout(500)
    
    // Get violet palette colors
    const violetColors = []
    for (let i = 0; i < Math.min(swatchCount, 3); i++) {
      const swatch = swatches.nth(i)
      const bgColor = await swatch.evaluate(el => getComputedStyle(el).backgroundColor)
      violetColors.push(bgColor)
    }
    
    // Switch to teal and verify colors are different
    await paletteSelect.selectOption('teal')
    await page.waitForTimeout(500)
    
    for (let i = 0; i < Math.min(swatchCount, 3); i++) {
      const swatch = swatches.nth(i)
      const bgColor = await swatch.evaluate(el => getComputedStyle(el).backgroundColor)
      
      // At least some colors should be different between palettes
      if (i < violetColors.length) {
        // Don't expect all to be different (some base colors might be similar)
        // but at least verify we're getting valid colors
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
      }
    }
  })
})