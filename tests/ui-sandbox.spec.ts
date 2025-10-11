import { test, expect } from './fixtures'
import { testIds } from '../src/lib/testIds'

test.describe('UI Sandbox Visual Tests', () => {
  test('UI sandbox page renders all components correctly', async ({ page }) => {
    // Navigate to UI sandbox
    await page.goto('/ui-sandbox', { waitUntil: 'domcontentloaded' });

    // Wait for page to fully load and confirm visibility with a specific element
    await expect(page.getByTestId(testIds.uiSandboxHeader)).toBeVisible();

    // Take full page screenshot for visual comparison
    await expect(page).toHaveScreenshot('ui-sandbox-full-page.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000,
    })

    // Test specific sections with focused screenshots

    // 1. Button variants section
    const buttonSection = page.getByTestId(testIds.buttonsSection)
    await expect(buttonSection).toBeVisible()
    await expect(buttonSection).toHaveScreenshot('ui-buttons-section.png', {
      threshold: 0.2,
      animations: 'disabled'
    })

    // 2. ItemPill section
    const itemPillSection = page.getByTestId(testIds.itemPillsSection)
    await expect(itemPillSection).toBeVisible()
    await expect(itemPillSection).toHaveScreenshot('ui-item-pills-section.png', {
      threshold: 0.2,
      animations: 'disabled'
    })

    // 3. Card section
    const cardSection = page.getByTestId(testIds.cardsSection)
    await expect(cardSection).toBeVisible()
    await expect(cardSection).toHaveScreenshot('ui-cards-section.png', {
      threshold: 0.2,
      animations: 'disabled'
    })

    // 4. Modal section (test modal opens correctly)
    const modalSection = page.getByTestId(testIds.modalsSection)
    await expect(modalSection).toBeVisible()

    // Test opening scrolling modal
    const scrollingModalButton = page.getByTestId(testIds.showScrollingModalButton)
    await expect(scrollingModalButton).toBeVisible()
    await scrollingModalButton.click()
    
    // Wait for modal to appear and take screenshot
    await expect(page.getByTestId(testIds.modalOverlay)).toBeVisible()
    const modal = page.getByTestId(testIds.modalOverlay)
    await expect(modal).toHaveScreenshot('ui-scrolling-modal.png', {
      threshold: 0.2,
      animations: 'disabled'
    })

    // Close modal
    await page.getByTestId(testIds.closeModalButton).click()
    await expect(page.getByTestId(testIds.modalOverlay)).not.toBeVisible()

    // 5. Avatar section
    const avatarSection = page.getByTestId(testIds.avatarsSection)
    await expect(avatarSection).toBeVisible()
    await expect(avatarSection).toHaveScreenshot('ui-avatars-section.png', {
      threshold: 0.2,
      animations: 'disabled'
    })

    // 6. Skeleton section
    const skeletonSection = page.getByTestId(testIds.skeletonSection)
    await expect(skeletonSection).toBeVisible()
    await expect(skeletonSection).toHaveScreenshot('ui-skeleton-section.png', {
      threshold: 0.2,
      animations: 'disabled'
    })
  })
  
  test('UI sandbox components are interactive', async ({ page }) => {
    await page.goto('/ui-sandbox', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await expect(page.getByTestId(testIds.uiSandboxHeader)).toBeVisible();

    // Test button interactions
    const primaryButton = page.getByTestId(testIds.primaryButton)
    await expect(primaryButton).toBeVisible()
    await primaryButton.click()

    // Test ItemPill interactions
    const itemPills = page.locator('[data-testid^="item-pill"], .item-pill')
    if (await itemPills.count() > 0) {
      const firstPill = itemPills.first()
      await expect(firstPill).toBeVisible()
      await firstPill.click()

      // Take screenshot after interaction to verify selection state
      const itemPillsSection = page.getByTestId(testIds.itemPillsSection)
      await expect(itemPillsSection).toHaveScreenshot('ui-item-pills-selected.png', {
        threshold: 0.2,
        animations: 'disabled'
      })
    }

    // Test modal functionality
    const basicModalButton = page.getByTestId(testIds.showBasicModalButton)
    if (await basicModalButton.isVisible()) {
      await basicModalButton.click()

      // Verify modal opens
      await expect(page.getByTestId(testIds.modalOverlay)).toBeVisible()

      // Close with close button
      await page.getByTestId(testIds.closeModalButton).click()
      await expect(page.getByTestId(testIds.modalOverlay)).not.toBeVisible()
    }
  })

  test('UI sandbox is accessible', async ({ page }) => {
    await page.goto('/ui-sandbox', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await expect(page.getByTestId(testIds.uiSandboxHeader)).toBeVisible();

    // Test keyboard navigation on buttons
    const firstButton = page.getByTestId(testIds.primaryButton)
    await firstButton.focus()
    await expect(firstButton).toBeFocused()
    
    // Test tab navigation through buttons
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    
    // Verify no accessibility violations by checking for proper ARIA attributes
    // Only check buttons within the sandbox content, not the app shell
    const sandboxContent = page.getByTestId(testIds.uiSandboxHeader).locator('..').locator('..')
    const buttons = sandboxContent.locator('button:visible')
    const buttonCount = await buttons.count()

    // Check first few visible buttons have accessible names
    const failedButtons = []
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      // Should have accessible name (text content or aria-label)
      const textContent = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      const hasAccessibleName = (textContent && textContent.trim().length > 0) || (ariaLabel && ariaLabel.trim().length > 0)

      if (!hasAccessibleName) {
        const className = await button.getAttribute('class')
        failedButtons.push(`Button ${i}: class="${className}", text="${textContent}", aria-label="${ariaLabel}"`)
      }
    }

    if (failedButtons.length > 0) {
      console.log('Buttons without accessible names:', failedButtons)
    }

    expect(failedButtons.length).toBe(0)
  })
})

test.describe('UI Palette Playground Tests', () => {
  test('UI palette playground renders color tokens correctly', async ({ page }) => {
    // Navigate to UI palette playground
    await page.goto('/ui', { waitUntil: 'domcontentloaded' });

    // Wait for page to fully load
    await expect(page.getByTestId(testIds.uiPlaygroundHeader)).toBeVisible();

    // Take screenshot of the color tokens section
    const colorSwatches = page.getByTestId(testIds.colorSwatches)
    await expect(colorSwatches).toBeVisible()
    await expect(colorSwatches).toHaveScreenshot('ui-palette-default.png', {
      threshold: 0.2,
      animations: 'disabled'
    })
  })
  
  test('color tokens display correctly', async ({ page }) => {
    await page.goto('/ui', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(testIds.uiPlaygroundHeader)).toBeVisible();

    // Test that color swatches are visible and have colors
    const swatches = page.getByTestId(testIds.colorSwatches)
    await expect(swatches).toBeVisible()

    const swatchCount = await swatches.locator('.h-6.w-6.rounded').count()
    expect(swatchCount).toBeGreaterThan(0)

    // Check that each swatch has a background color
    for (let i = 0; i < swatchCount; i++) {
      const swatch = swatches.locator('.h-6.w-6.rounded').nth(i)
      const bgColor = await swatch.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)') // Not transparent
      expect(bgColor).not.toBe('transparent')
    }
  })
})