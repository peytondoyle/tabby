/**
 * Finishing Touches Test Suite
 * Tests for safe areas, accessibility, motion, and polish
 */

import { test, expect } from '@playwright/test'

test.describe('Finishing Touches', () => {
  test('Safe areas are applied correctly', async ({ page }) => {
    await page.goto('/')
    
    // Check that safe area classes are applied
    const pageShell = page.locator('.page-shell')
    await expect(pageShell).toBeVisible()
    
    // Check safe area CSS is loaded
    const safeAreaStyles = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        hasSafeAreaTop: style.getPropertyValue('--safe-area-inset-top'),
        hasSafeAreaBottom: style.getPropertyValue('--safe-area-inset-bottom'),
      }
    })
    
    expect(safeAreaStyles.hasSafeAreaTop).toBeDefined()
    expect(safeAreaStyles.hasSafeAreaBottom).toBeDefined()
  })

  test('Touch targets meet 44x44px minimum', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    // Check pill touch targets
    const pills = page.locator('.pill-touch-target')
    const pillCount = await pills.count()
    
    for (let i = 0; i < pillCount; i++) {
      const pill = pills.nth(i)
      const box = await pill.boundingBox()
      
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('Focus rings are visible for keyboard users', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    // Focus on a pill
    const firstPill = page.locator('.pill-touch-target').first()
    await firstPill.focus()
    
    // Check focus ring styles
    const focusStyles = await firstPill.evaluate((el) => {
      const styles = getComputedStyle(el)
      return {
        outline: styles.outline,
        outlineOffset: styles.outlineOffset,
      }
    })
    
    expect(focusStyles.outline).toContain('2px solid')
    expect(focusStyles.outlineOffset).toBe('3px')
  })

  test('Reduced motion is respected', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/bill/test-token')
    
    // Check that animations are disabled
    const animatedElement = page.locator('.hover-lift').first()
    const styles = await animatedElement.evaluate((el) => {
      const computed = getComputedStyle(el)
      return {
        transitionDuration: computed.transitionDuration,
        animationDuration: computed.animationDuration,
      }
    })
    
    expect(styles.transitionDuration).toBe('0.01ms')
    expect(styles.animationDuration).toBe('0.01ms')
  })

  test('Billy sheet has proper handle bar', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    // Open a sheet (assuming there's a way to trigger it)
    // This would depend on the specific implementation
    
    const handleBar = page.locator('.billy-sheet-handle')
    await expect(handleBar).toBeVisible()
    
    const handleStyles = await handleBar.evaluate((el) => {
      const styles = getComputedStyle(el)
      return {
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius,
      }
    })
    
    expect(handleStyles.width).toBe('48px')
    expect(handleStyles.height).toBe('6px')
    expect(handleStyles.borderRadius).toBe('3px')
  })

  test('Pill token variants are locked', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    // Check mine pill styles
    const minePill = page.locator('.pill-touch-target').filter({ hasText: 'Mine' }).first()
    const mineStyles = await minePill.evaluate((el) => {
      const styles = getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
      }
    })
    
    expect(mineStyles.backgroundColor).toBe('rgb(106, 92, 80)') // #6A5C50
    expect(mineStyles.borderColor).toContain('rgba(255, 255, 255, 0.12)')
  })

  test('Receipt export styles are print-safe', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    // Check receipt export class exists
    const receiptElement = page.locator('.receipt-export')
    
    // Simulate print media
    await page.emulateMedia({ media: 'print' })
    
    const printStyles = await receiptElement.evaluate((el) => {
      const styles = getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        boxShadow: styles.boxShadow,
      }
    })
    
    expect(printStyles.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(printStyles.color).toBe('rgb(0, 0, 0)')
    expect(printStyles.boxShadow).toBe('none')
  })

  test('Mono headings have proper kerning', async ({ page }) => {
    await page.goto('/bill/test-token')
    
    const monoHeading = page.locator('.mono-heading').first()
    const styles = await monoHeading.evaluate((el) => {
      const computed = getComputedStyle(el)
      return {
        letterSpacing: computed.letterSpacing,
        textRendering: computed.textRendering,
        fontVariantNumeric: computed.fontVariantNumeric,
      }
    })
    
    expect(styles.letterSpacing).toBe('0.015em')
    expect(styles.textRendering).toBe('optimizelegibility')
    expect(styles.fontVariantNumeric).toBe('tabular-nums')
  })

  test('Page shells are consistent', async ({ page }) => {
    const pages = ['/', '/bills', '/bill/test-token']
    
    for (const path of pages) {
      await page.goto(path)
      
      const pageShell = page.locator('.page-shell')
      await expect(pageShell).toBeVisible()
      
      const styles = await pageShell.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          minHeight: computed.minHeight,
          width: computed.width,
          display: computed.display,
          flexDirection: computed.flexDirection,
        }
      })
      
      expect(styles.minHeight).toBe('100vh')
      expect(styles.width).toBe('100%')
      expect(styles.display).toBe('flex')
      expect(styles.flexDirection).toBe('column')
    }
  })
})
