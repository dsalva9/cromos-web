import { test, expect } from '@playwright/test';

/**
 * Mark Team Page Complete - E2E Test
 *
 * Tests the "Marcar equipo completo" feature that allows users
 * to mark all missing stickers on a team page as owned in one action.
 *
 * Prerequisites:
 * - Test user with credentials
 * - Collection with partially filled team pages
 * - Database seeded with test data
 */

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@cambiocromo.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Mark Team Page Complete', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/(profile|mi-coleccion)/);
  });

  test('should mark all missing stickers as owned on desktop', async ({ page }) => {
    // Navigate to a partially filled team page
    // Assuming collection ID 1 and a team page with missing stickers
    await page.goto(`${BASE_URL}/mi-coleccion/1?page=1`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="album-page-grid"]', {
      timeout: 10000
    });

    // Get initial missing count from header
    const initialMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const initialOwnedMatch = initialMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!initialOwnedMatch) {
      throw new Error('Could not parse initial ownership counts');
    }

    const initialOwned = parseInt(initialOwnedMatch[1]);
    const totalSlots = parseInt(initialOwnedMatch[2]);
    const initialMissing = totalSlots - initialOwned;

    // Skip if page is already complete
    if (initialMissing === 0) {
      console.log('Team page already complete, skipping test');
      test.skip();
      return;
    }

    // Click "Marcar equipo completo" button (desktop only, ≥md)
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop viewport

    const completeButton = page.getByRole('button', {
      name: /marcar equipo completo/i
    });

    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // Confirm in modal
    const confirmButton = page.getByRole('button', { name: /confirmar/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for success toast
    await expect(page.getByText(/equipo completado/i)).toBeVisible({
      timeout: 5000
    });

    // Verify all tiles are now owned (header shows Tengo X / X)
    await page.waitForTimeout(1000); // Wait for UI to update

    const updatedMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const updatedOwnedMatch = updatedMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!updatedOwnedMatch) {
      throw new Error('Could not parse updated ownership counts');
    }

    const updatedOwned = parseInt(updatedOwnedMatch[1]);
    expect(updatedOwned).toBe(totalSlots);

    // Verify "Faltan" stat in header is 0
    const statsHeader = page.locator('[data-testid="album-summary-header"]');
    const faltanText = await statsHeader.locator('text=/Me faltan/i').textContent();
    expect(faltanText).toContain('0');

    // Reload page and verify state persists
    await page.reload();
    await page.waitForSelector('[data-testid="album-page-grid"]', {
      timeout: 10000
    });

    const persistedMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const persistedOwnedMatch = persistedMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!persistedOwnedMatch) {
      throw new Error('Could not parse persisted ownership counts');
    }

    const persistedOwned = parseInt(persistedOwnedMatch[1]);
    expect(persistedOwned).toBe(totalSlots);
  });

  test('should show "already complete" message when repeating action', async ({ page }) => {
    // Navigate to a team page that is already complete
    await page.goto(`${BASE_URL}/mi-coleccion/1?page=1`);

    await page.waitForSelector('[data-testid="album-page-grid"]', {
      timeout: 10000
    });

    // Verify page is complete
    const missingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const ownedMatch = missingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!ownedMatch) {
      throw new Error('Could not parse ownership counts');
    }

    const owned = parseInt(ownedMatch[1]);
    const total = parseInt(ownedMatch[2]);

    if (owned !== total) {
      console.log('Page not complete yet, completing it first');

      // Complete the page first
      await page.setViewportSize({ width: 1280, height: 720 });
      const completeButton = page.getByRole('button', {
        name: /marcar equipo completo/i
      });
      await completeButton.click();
      await page.getByRole('button', { name: /confirmar/i }).click();
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-testid="album-page-grid"]', {
        timeout: 10000
      });
    }

    // Button should not be visible when page is complete
    await page.setViewportSize({ width: 1280, height: 720 });
    const completeButton = page.getByRole('button', {
      name: /marcar equipo completo/i
    });

    await expect(completeButton).not.toBeVisible();
  });

  test('should work via mobile long-press', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Navigate to a partially filled team page
    await page.goto(`${BASE_URL}/mi-coleccion/1?page=2`); // Different page to avoid conflicts

    await page.waitForSelector('[data-testid="album-page-grid"]', {
      timeout: 10000
    });

    // Get initial state
    const initialMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const initialOwnedMatch = initialMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!initialOwnedMatch) {
      throw new Error('Could not parse initial ownership counts');
    }

    const initialOwned = parseInt(initialOwnedMatch[1]);
    const totalSlots = parseInt(initialOwnedMatch[2]);
    const initialMissing = totalSlots - initialOwned;

    if (initialMissing === 0) {
      console.log('Team page already complete, skipping mobile test');
      test.skip();
      return;
    }

    // Long-press on title area (simulate by holding touch)
    const titleArea = page.locator('.text-lg.font-extrabold.uppercase.text-white');

    // Trigger touch events to simulate long-press
    await titleArea.dispatchEvent('touchstart');
    await page.waitForTimeout(700); // Wait longer than 600ms threshold
    await titleArea.dispatchEvent('touchend');

    // Action sheet should appear
    await expect(page.getByText(/marcar todo el equipo como completado/i)).toBeVisible();

    // Click primary action
    await page.getByRole('button', {
      name: /marcar todo el equipo como completado/i
    }).click();

    // Wait for success toast
    await expect(page.getByText(/equipo completado/i)).toBeVisible({
      timeout: 5000
    });

    // Verify completion
    await page.waitForTimeout(1000);
    const updatedMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const updatedOwnedMatch = updatedMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!updatedOwnedMatch) {
      throw new Error('Could not parse updated ownership counts');
    }

    const updatedOwned = parseInt(updatedOwnedMatch[1]);
    expect(updatedOwned).toBe(totalSlots);
  });

  test('should work via mobile overflow menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to a partially filled team page
    await page.goto(`${BASE_URL}/mi-coleccion/1?page=3`); // Different page

    await page.waitForSelector('[data-testid="album-page-grid"]', {
      timeout: 10000
    });

    // Get initial state
    const initialMissingText = await page.textContent('.text-sm.font-bold.text-gray-300');
    const initialOwnedMatch = initialMissingText?.match(/Tengo (\d+) \/ (\d+)/);

    if (!initialOwnedMatch) {
      throw new Error('Could not parse initial ownership counts');
    }

    const initialMissing = parseInt(initialOwnedMatch[2]) - parseInt(initialOwnedMatch[1]);

    if (initialMissing === 0) {
      console.log('Team page already complete, skipping overflow menu test');
      test.skip();
      return;
    }

    // Click overflow menu button (⋯)
    const overflowButton = page.getByRole('button', {
      name: /más opciones/i
    });

    await expect(overflowButton).toBeVisible();
    await overflowButton.click();

    // Action sheet should appear
    await expect(page.getByText(/marcar todo el equipo como completado/i)).toBeVisible();

    // Click primary action
    await page.getByRole('button', {
      name: /marcar todo el equipo como completado/i
    }).click();

    // Wait for success toast
    await expect(page.getByText(/equipo completado/i)).toBeVisible({
      timeout: 5000
    });
  });
});
