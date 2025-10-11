import { test, expect } from '@playwright/test';

test.describe('Receipt Scanner Modal', () => {
  test('Receipt scanner modal opens and closes correctly', async ({ page }) => {
    await page.goto('/');

    // Click "New Receipt" button to open receipt scanner
    await page.getByTestId('scan-receipt-button').first().click();

    // Wait for receipt scanner modal to appear
    await expect(page.getByTestId('receipt-scanner-modal')).toBeVisible();

    // Close the modal
    await page.getByTestId('close-modal-button').click();

    // Verify modal is closed
    await expect(page.getByTestId('receipt-scanner-modal')).not.toBeVisible();
  });

  test('Receipt scanner modal shows correct header', async ({ page }) => {
    await page.goto('/');

    // Click "New Receipt" button to open receipt scanner
    await page.getByTestId('scan-receipt-button').first().click();

    // Wait for receipt scanner modal to appear
    await expect(page.getByTestId('receipt-scanner-modal')).toBeVisible();

    // Verify the header text is correct
    await expect(page.getByText('📷 Scan Receipt')).toBeVisible();
  });
});
