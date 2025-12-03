import { test, expect, type Locator } from '@playwright/test';

/**
 * Theme Rollout - E2E Visual Verification Tests
 *
 * Tests that the Retro-Comic theme has been properly applied
 * across all major pages and components.
 *
 * Prerequisites:
 * - Test user with credentials
 * - Collection with test data
 * - Database seeded with test data
 */

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@cambiocromo.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Theme verification helpers
async function verifyThickBorders(locator: Locator) {
  const borderWidth = await locator.evaluate((el: HTMLElement) => {
    return window.getComputedStyle(el).borderWidth;
  });
  // border-2 should be 2px
  expect(borderWidth).toBe('2px');
}

async function verifyGoldAccent(locator: Locator) {
  const backgroundColor = await locator.evaluate((el: HTMLElement) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  // #FFC000 in RGB is rgb(255, 192, 0)
  expect(backgroundColor).toMatch(/rgb\(255,\s*192,\s*0\)/);
}

async function verifyDarkBackground(locator: Locator) {
  const backgroundColor = await locator.evaluate((el: HTMLElement) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  // Should be dark gray (various shades acceptable)
  expect(backgroundColor).toMatch(/rgb\((31|55|107|75),\s*(41|65|114|85),\s*(55|79|128|99)\)/);
}

test.describe('Theme Rollout Visual Verification', () => {
  test.describe('Authentication Pages', () => {
    test('login page should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Dark background
      const mainContainer = page.locator('.min-h-screen').first();
      await verifyDarkBackground(mainContainer);

      // Logo with gold background and thick borders
      const logo = page.locator('.w-20.h-20.bg-\\[\\#FFC000\\]').first();
      await expect(logo).toBeVisible();
      await verifyGoldAccent(logo);
      await verifyThickBorders(logo);

      // Card with thick borders
      const card = page.locator('.bg-gray-800.border-2').first();
      await expect(card).toBeVisible();
      await verifyThickBorders(card);

      // Submit button with gold accent
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await verifyGoldAccent(submitButton);
      await verifyThickBorders(submitButton);

      // Input fields with thick borders
      const emailInput = page.locator('input[type="email"]');
      await verifyThickBorders(emailInput);
    });

    test('signup page should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Dark background
      const mainContainer = page.locator('.min-h-screen').first();
      await verifyDarkBackground(mainContainer);

      // Logo with gold background
      const logo = page.locator('.w-20.h-20.bg-\\[\\#FFC000\\]').first();
      await expect(logo).toBeVisible();
      await verifyGoldAccent(logo);

      // Submit button with gold accent
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await verifyGoldAccent(submitButton);
      await verifyThickBorders(submitButton);
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(profile|mi-coleccion)/);
    });

    test('site header should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);

      // Header exists and has dark background
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Active nav link should have gold background
      const activeNavLink = page.locator('[aria-current="page"]').first();
      if (await activeNavLink.isVisible()) {
        await verifyGoldAccent(activeNavLink);
        await verifyThickBorders(activeNavLink);
      }

      // Desktop: Check that nav links are visible and styled
      await page.setViewportSize({ width: 1280, height: 720 });
      const navLinks = page.locator('nav a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('site footer should have themed links', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);

      const footer = page.locator('footer').first();
      await expect(footer).toBeVisible();

      // Footer links should exist
      const footerLinks = footer.locator('a');
      const count = await footerLinks.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Trading Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(profile|mi-coleccion)/);
    });

    test('trades find page should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/trades/find`);

      // Dark page background
      const mainContainer = page.locator('.min-h-screen').first();
      await verifyDarkBackground(mainContainer);

      // Page title should be uppercase and bold
      const title = page.getByRole('heading', { name: /buscar intercambios/i });
      await expect(title).toBeVisible();
      const fontWeight = await title.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).fontWeight
      );
      expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(700);

      // Filter card should have thick borders
      const filterCard = page.locator('.bg-gray-800.border-2').first();
      if (await filterCard.isVisible()) {
        await verifyThickBorders(filterCard);
      }
    });

    test('trade proposals page should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/trades/proposals`);

      // Dark page background
      const mainContainer = page.locator('.min-h-screen').first();
      await verifyDarkBackground(mainContainer);

      // "Nueva propuesta" button should have gold accent
      const newProposalButton = page.getByRole('button', { name: /nueva propuesta/i });
      await expect(newProposalButton).toBeVisible();
      await verifyGoldAccent(newProposalButton);
      await verifyThickBorders(newProposalButton);

      // Tabs should have thick borders
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toBeVisible();
      await verifyThickBorders(tabsList);

      // Active tab should have gold accent
      const activeTab = page.locator('[role="tab"][data-state="active"]').first();
      if (await activeTab.isVisible()) {
        await verifyGoldAccent(activeTab);
      }
    });
  });

  test.describe('Album Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(profile|mi-coleccion)/);
    });

    test('album page should have Retro-Comic theme', async ({ page }) => {
      // Navigate to first available collection
      await page.goto(`${BASE_URL}/mi-coleccion`);

      // Wait for collections to load
      await page.waitForTimeout(1000);

      // Find and click first collection card
      const firstCollection = page.locator('[href^="/mi-coleccion/"]').first();

      if (await firstCollection.isVisible()) {
        await firstCollection.click();
        await page.waitForURL(/\/mi-coleccion\/\d+/);

        // Album summary header should exist with thick borders
        const summaryHeader = page.locator('[data-testid="album-summary-header"]');
        if (await summaryHeader.isVisible()) {
          await verifyThickBorders(summaryHeader);
        }

        // Album pager tabs should exist
        const pagerTabs = page.locator('[role="tablist"]').first();
        if (await pagerTabs.isVisible()) {
          // Active tab should have gold accent
          const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
          if (await activeTab.isVisible()) {
            await verifyGoldAccent(activeTab);
            await verifyThickBorders(activeTab);
          }
        }

        // Page header progress bar should be visible
        const progressBar = page.locator('[role="progressbar"]').first();
        if (await progressBar.isVisible()) {
          // Progress indicator should have gold color
          const indicator = progressBar.locator('> div').first();
          if (await indicator.isVisible()) {
            await verifyGoldAccent(indicator);
          }
        }

        // Desktop: "Marcar equipo completo" button if visible
        await page.setViewportSize({ width: 1280, height: 720 });
        const completeButton = page.getByRole('button', {
          name: /marcar equipo completo/i
        });

        if (await completeButton.isVisible()) {
          await verifyGoldAccent(completeButton);
          await verifyThickBorders(completeButton);
        }
      }
    });

    test('sticker tiles should follow theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/mi-coleccion`);
      await page.waitForTimeout(1000);

      const firstCollection = page.locator('[href^="/mi-coleccion/"]').first();

      if (await firstCollection.isVisible()) {
        await firstCollection.click();
        await page.waitForURL(/\/mi-coleccion\/\d+/);

        // Wait for stickers to load
        const stickerGrid = page.locator('[data-testid="album-page-grid"]');
        await expect(stickerGrid).toBeVisible({ timeout: 5000 });

        // At least one sticker should be visible
        const stickers = page.locator('[data-testid^="sticker-tile-"]');
        const count = await stickers.count();
        expect(count).toBeGreaterThan(0);

        // First sticker should have thick borders
        const firstSticker = stickers.first();
        await verifyThickBorders(firstSticker);
      }
    });
  });

  test.describe('Profile Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(profile|mi-coleccion)/);
    });

    test('profile page should have Retro-Comic theme', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`);

      // Dark page background
      const mainContainer = page.locator('.min-h-screen').first();
      await verifyDarkBackground(mainContainer);

      // Profile cards should have thick borders
      const cards = page.locator('.bg-gray-800.border-2');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      if (count > 0) {
        await verifyThickBorders(cards.first());
      }

      // Primary buttons should have gold accent
      const saveButton = page.getByRole('button', { name: /guardar/i });
      if (await saveButton.isVisible()) {
        await verifyGoldAccent(saveButton);
        await verifyThickBorders(saveButton);
      }
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(profile|mi-coleccion)/);
    });

    test('gold buttons should have sufficient contrast', async ({ page }) => {
      await page.goto(`${BASE_URL}/trades/proposals`);

      const goldButton = page.getByRole('button', { name: /nueva propuesta/i });
      await expect(goldButton).toBeVisible();

      // Get computed colors
      const bgColor = await goldButton.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      const textColor = await goldButton.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).color;
      });

      // Gold buttons should have dark text (gray-900)
      expect(textColor).toMatch(/rgb\((17|31|55),\s*(24|41|65),\s*(39|55|79)\)/);

      // Background should be gold
      expect(bgColor).toMatch(/rgb\(255,\s*192,\s*0\)/);
    });

    test('navigation should be keyboard accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);

      // Tab through navigation
      await page.keyboard.press('Tab');

      // Should be able to focus on nav elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('mobile menu should close on Escape key', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/`);

      // Open mobile menu
      const menuButton = page.getByRole('button', { name: /menú/i });
      if (await menuButton.isVisible()) {
        await menuButton.click();

        // Mobile menu should be visible
        const mobileNav = page.locator('[role="dialog"]');
        await expect(mobileNav).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');

        // Mobile menu should be closed
        await expect(mobileNav).not.toBeVisible();
      }
    });
  });
});
