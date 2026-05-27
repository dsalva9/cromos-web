import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = 'C:/Users/dsalv/.gemini/antigravity/brain/a0dad0ea-89ad-4aa2-9f97-6e103ff1acbb';
const BASE_URL = 'https://cambiocromos.com';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Track console errors
const consoleErrors: string[] = [];

test.describe('Phase 3 Matching Discovery Hub QA Validation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error]: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`[Uncaught Page Error]: ${err.message}\nStack: ${err.stack}`);
    });
  });

  test('Execute all QA functional and layout checks', async ({ page }) => {
    // -------------------------------------------------------------
    // Step 1: Login Flow
    // -------------------------------------------------------------
    console.log('Starting Step 1: Login Flow');
    await page.goto(`${BASE_URL}/es/login`);
    await page.waitForLoadState('networkidle');

    // Check login page elements are visible
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fill credentials
    await emailInput.fill('dsalva@gmail.com');
    await passwordInput.fill('test12345');
    
    // Take a screenshot showing the inputs filled before submitting (or right after)
    // Click submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard/mi-coleccion or dashboard route
    await page.waitForURL(/\/dashboard|mi-coleccion|profile/, { timeout: 15000 });
    console.log('Login successful. Redirected to:', page.url());

    // Take login success screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login_success.png'), fullPage: true });

    // -------------------------------------------------------------
    // Step 2: Navigate to Match Finder
    // -------------------------------------------------------------
    console.log('Starting Step 2: Navigating to Match Finder');
    await page.goto(`${BASE_URL}/es/intercambios/buscar`);
    await page.waitForLoadState('networkidle');

    // Wait for the match finder content to render
    await page.waitForSelector('h1', { timeout: 10000 });

    // Viewport 1440px desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000); // Wait for transition/renders
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'match_finder_page_desktop.png'), fullPage: true });

    // Viewport 375px mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'match_finder_page_mobile.png'), fullPage: true });

    // Restore desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 3: Collection Selector
    // -------------------------------------------------------------
    console.log('Starting Step 3: Collection Selector');
    // Find the collection selector button
    const collDropdownBtn = page.locator('button[aria-haspopup="listbox"]').first();
    await expect(collDropdownBtn).toBeVisible();

    // Click the dropdown
    await collDropdownBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'collection_dropdown_open.png') });

    // Select the second collection if available, or just click first
    const items = page.locator('div.absolute button');
    const itemCount = await items.count();
    if (itemCount > 1) {
      console.log(`Found ${itemCount} collections. Selecting the second one.`);
      await items.nth(1).click();
    } else if (itemCount === 1) {
      console.log('Only 1 collection found, clicking it.');
      await items.nth(0).click();
    } else {
      // Click off to close dropdown
      await page.click('h1');
    }
    await page.waitForTimeout(1000); // Wait for matches refresh

    // -------------------------------------------------------------
    // Step 4: Filter Controls
    // -------------------------------------------------------------
    console.log('Starting Step 4: Filter Controls');
    // Find "Filtros avanzados" button
    const advancedFiltersBtn = page.getByRole('button', { name: /filtros avanzados/i });
    if (await advancedFiltersBtn.isVisible()) {
      await advancedFiltersBtn.click();
      await page.waitForTimeout(500);

      // Verify active rarity selector and choose a rarity
      // Find rarity dropdown button inside the expanded filters
      const rarityBtn = page.locator('button[aria-haspopup="listbox"]').nth(1);
      if (await rarityBtn.isVisible()) {
        await rarityBtn.click();
        await page.waitForTimeout(300);
        // Let's choose the second option (Common or Epic etc.)
        const rarityOptions = page.locator('div.absolute button');
        const rarityCount = await rarityOptions.count();
        if (rarityCount > 1) {
          await rarityOptions.nth(1).click(); // Select first non-all option
        }
        await page.waitForTimeout(1000);
      }

      // Take screenshot with expanded filters and rarity selected
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'filters_expanded.png'), fullPage: true });

      // Clear filters
      const clearBtn = page.getByRole('button', { name: /limpiar filtros/i });
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // -------------------------------------------------------------
    // Step 5: Sort Controls
    // -------------------------------------------------------------
    console.log('Starting Step 5: Sort Controls');
    // Segmented tabs are used for sorting: Relevancia, Coincidencias, Distancia
    // Let's click each tab
    const tabsContainer = page.getByTestId('segmented-tabs');
    if (await tabsContainer.isVisible()) {
      const tabs = tabsContainer.locator('button');
      const tabCount = await tabs.count();
      console.log(`Found ${tabCount} sort tabs`);
      
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(800); // wait for sorting
      }
      
      // Select the first tab (Mixed/Relevance) back
      await tabs.nth(0).click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'sort_controls.png') });

    // -------------------------------------------------------------
    // Step 6: Match Cards Grid
    // -------------------------------------------------------------
    console.log('Starting Step 6: Match Cards Grid');
    const cards = page.locator('.grid > div');
    const cardCount = await cards.count();
    console.log(`Found ${cardCount} match cards in the grid`);

    if (cardCount > 0) {
      // Hover the first card to verify the lift animation
      const firstCard = cards.first();
      await firstCard.scrollIntoViewIfNeeded();
      await firstCard.hover();
      await page.waitForTimeout(500);

      // Verify #1 Match badge if card count > 1
      const matchBadge = page.getByText('#1 Match');
      if (await matchBadge.isVisible()) {
        console.log('#1 Match gold badge is visible!');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'match_cards_grid.png'), fullPage: true });
    } else {
      console.log('No match cards found to test.');
    }

    // -------------------------------------------------------------
    // Step 7: Match Detail Drawer
    // -------------------------------------------------------------
    console.log('Starting Step 7: Match Detail Drawer');
    if (cardCount > 0) {
      const firstCard = cards.first();
      await firstCard.click();
      await page.waitForTimeout(2000); // Wait for details RPC and modal render

      // Verify Dialog/modal in desktop mode
      const dialogTitle = page.locator('[role="dialog"] h2').first();
      const proposeCta = page.getByRole('button', { name: /proponer intercambio/i });
      
      await expect(proposeCta).toBeVisible({ timeout: 5000 });
      console.log('Desktop dialog propose exchange button is visible');

      // Screenshot desktop drawer
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'match_detail_desktop.png') });

      // Close the desktop dialog
      const closeBtn = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button svg[class*="X"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        // Press Escape key to close
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);

      // Now test on Mobile Viewport
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);

      // Click card again to open mobile bottom drawer
      await firstCard.click();
      await page.waitForTimeout(2000);

      // Take screenshot of mobile bottom drawer
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'match_detail_mobile.png') });

      // Close drawer (swipe down or press escape)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // Restore desktop viewport
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(1000);
    }

    // -------------------------------------------------------------
    // Step 8: Load More
    // -------------------------------------------------------------
    console.log('Starting Step 8: Load More');
    const loadMoreBtn = page.getByRole('button', { name: /cargar más/i });
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'load_more_results.png'), fullPage: true });
    } else {
      console.log('Load More button not visible (less than 20 results). Skipping screenshot.');
    }

    // -------------------------------------------------------------
    // Step 9: Empty State
    // -------------------------------------------------------------
    console.log('Starting Step 9: Empty State');
    // If possible, try filtering with a crazy name like "xyz123abc" to trigger empty state
    const teamInput = page.locator('input[placeholder*="Equipo"], input[placeholder*="equipo"]').first();
    if (await teamInput.isVisible()) {
      await teamInput.fill('NonExistentTeamName123');
      await page.waitForTimeout(1500);

      const emptyTitle = page.getByText(/sin resultados/i);
      const noMatchesTitle = page.getByText(/sin coincidencias/i);
      
      if (await emptyTitle.isVisible() || await noMatchesTitle.isVisible()) {
        console.log('Empty state is active and visible!');
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'empty_state.png') });

      // Reset team input
      await teamInput.fill('');
      await page.waitForTimeout(1500);
    }

    // -------------------------------------------------------------
    // Step 10: Responsive Layout
    // -------------------------------------------------------------
    console.log('Starting Step 10: Responsive Layout');
    // Desktop 1440
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'responsive_1440.png'), fullPage: true });

    // Tablet 768
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'responsive_768.png'), fullPage: true });

    // Mobile 375
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'responsive_375.png'), fullPage: true });

    // Restore desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 11: Dark Mode
    // -------------------------------------------------------------
    console.log('Starting Step 11: Dark Mode');
    // Emulate dark mode media feature
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dark_mode_page.png'), fullPage: true });

    // Restore light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 12: Navigation Regression
    // -------------------------------------------------------------
    console.log('Starting Step 12: Navigation Regression');
    // Navigate to /es/intercambios and verify inbox/outbox tabs still work
    await page.goto(`${BASE_URL}/es/intercambios`);
    await page.waitForLoadState('networkidle');
    const inboxTab = page.getByRole('tab', { name: /recibidas/i });
    const outboxTab = page.getByRole('tab', { name: /enviadas/i });
    await expect(inboxTab).toBeVisible();
    await expect(outboxTab).toBeVisible();

    // Navigate to /es/marketplace
    await page.goto(`${BASE_URL}/es/marketplace`);
    await page.waitForLoadState('networkidle');
    const marketplaceHeader = page.locator('h1').first();
    await expect(marketplaceHeader).toBeVisible();

    // Take regression screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'navigation_regression.png'), fullPage: true });

    // Log all gathered errors
    console.log('Console Errors gathered:', consoleErrors);
    
    // Save report metadata
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'console_errors.json'), 
      JSON.stringify(consoleErrors, null, 2)
    );
  });
});
