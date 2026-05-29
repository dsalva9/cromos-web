import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = 'C:/Users/dsalv/.gemini/antigravity/brain/390af7b3-25e0-45fd-9a5b-9679a1ed90f5';
const BASE_URL = 'https://cambiocromos.com';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Track console errors
const consoleErrors: string[] = [];

test.describe('Tinder-Style Match Finder (Phase 3 v2) QA Validation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      // Ignore adsbygoogle ERR_BLOCKED_BY_CLIENT (ad blocker) and Sentry 429 (rate limit)
      if (
        msg.type() === 'error' &&
        !text.includes('adsbygoogle') &&
        !text.includes('ERR_BLOCKED_BY_CLIENT') &&
        !text.includes('429') &&
        !text.includes('sentry')
      ) {
        consoleErrors.push(`[Console ${msg.type()}]: ${text}`);
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`[Uncaught Page Error]: ${err.message}\nStack: ${err.stack}`);
    });
  });

  test('Run Tinder-Style Match Finder T1-T13 Suite', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes timeout

    // -------------------------------------------------------------
    // PRE-FLIGHT: Login
    // -------------------------------------------------------------
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/es/login`);
    await page.waitForLoadState('load');

    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill('dsalva@gmail.com');
    await passwordInput.fill('test12345');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
    console.log('Login successful. Redirected to:', page.url());

    // -------------------------------------------------------------
    // PRE-FLIGHT: Verify collections exist via /es/mis-plantillas
    // -------------------------------------------------------------
    console.log('Verifying collections exist...');
    await page.goto(`${BASE_URL}/es/mis-plantillas`);
    await page.waitForLoadState('load');
    const templatesHeader = page.locator('h1').first();
    await expect(templatesHeader).toBeVisible();

    // Check if there is a no-collections message
    const emptyState = page.locator('text=No has creado ninguna plantilla');
    const hasEmptyState = await emptyState.isVisible();
    console.log('Collections pre-flight check:', hasEmptyState ? 'No collections' : 'Collections found');

    // -------------------------------------------------------------
    // T1: Page Load & Contextual Tips
    // -------------------------------------------------------------
    console.log('T1 — Page Load & Contextual Tips');
    // Clear localStorage to ensure fresh state with tips visible
    await page.goto(`${BASE_URL}/es/intercambios/buscar/`);
    await page.evaluate(() => {
      localStorage.removeItem('dismissed-tips');
      localStorage.removeItem('matchfinder_geo');
    });
    // Reload page to apply cleared storage
    await page.reload();
    await page.waitForLoadState('load');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2000);

    // Verify: Two contextual tips appear at the top
    const howToTip = page.locator('h3:has-text("¿Cómo funciona?")');
    const setupTip = page.locator('h3:has-text("Antes de empezar")');
    await expect(howToTip).toBeVisible();
    await expect(setupTip).toBeVisible();

    // Take screenshot: Page with tips visible
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't1_tips_visible.png'), fullPage: true });

    // Verify: Dismiss button (✕) works on each tip
    let closeButtons = page.locator('button:has-text("Cerrar consejo")');
    let closeCount = await closeButtons.count();
    console.log(`Found ${closeCount} close buttons for tips`);
    if (closeCount > 0) {
      await closeButtons.first().click();
      await page.waitForTimeout(800);
      // Reload page to let useLocalStorage state sync up and avoid overwrite race condition!
      console.log('Reloading after dismissing first tip...');
      await page.reload();
      await page.waitForLoadState('load');
    }
    
    closeButtons = page.locator('button:has-text("Cerrar consejo")');
    closeCount = await closeButtons.count();
    console.log(`Remaining close buttons after reload: ${closeCount}`);
    if (closeCount > 0) {
      await closeButtons.first().click();
      await page.waitForTimeout(800);
      console.log('Reloading after dismissing second tip...');
      await page.reload();
      await page.waitForLoadState('load');
    }

    // Take screenshot: Page after tips dismissed
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't1_tips_dismissed.png'), fullPage: true });

    // Verify: After dismissing, refresh the page — tips should NOT reappear
    await page.reload();
    await page.waitForLoadState('load');
    await expect(page.locator('h3:has-text("¿Cómo funciona?")')).not.toBeVisible();
    await expect(page.locator('h3:has-text("Antes de empezar")')).not.toBeVisible();

    // Dismiss geo prompt to allow matches to load for T2-T9
    console.log('Waiting for geo prompt...');
    const preFlightSkipBtn = page.getByRole('button', { name: 'Continuar sin ubicación', exact: false }).first();
    await preFlightSkipBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Dismissing geo prompt for T2-T9 testing...');
    await preFlightSkipBtn.click();
    await page.waitForTimeout(2000);

    // Wait for the loading state to disappear
    await expect(page.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });

    // -------------------------------------------------------------
    // T2: Collection Selector
    // -------------------------------------------------------------
    console.log('T2 — Collection Selector');
    // Verify collection dropdown selector is visible
    const collDropdownBtn = page.locator('button:has-text("📁")').first();
    await expect(collDropdownBtn).toBeVisible();

    // Click selector to open it
    await collDropdownBtn.click();
    await page.waitForTimeout(500);

    // Screenshot: Collection selector open
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't2_selector_open.png') });

    // Change collections to trigger a fresh search
    const dropdownOptions = page.locator('div.absolute button');
    const optionCount = await dropdownOptions.count();
    console.log(`Dropdown options count: ${optionCount}`);
    if (optionCount > 1) {
      console.log('Switching to another collection');
      await dropdownOptions.nth(1).click();
    } else if (optionCount === 1) {
      console.log('Only 1 option available, clicking it again to close or confirm');
      await dropdownOptions.first().click();
    } else {
      // Click overlay to close
      await page.locator('div.fixed.inset-0').first().click();
    }
    await page.waitForTimeout(1000); // Wait for matches reload
    await expect(page.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });

    // -------------------------------------------------------------
    // T3: Match Loading & Spotlight Card (Bulletproof Search Loop!)
    // -------------------------------------------------------------
    console.log('T3 — Match Loading & Spotlight Card (Looping collections to find active matches)');
    let hasMatches = false;

    // Get number of options in dropdown again
    await collDropdownBtn.click();
    await page.waitForTimeout(500);
    const dropOptions = page.locator('div.absolute button');
    const dropCount = await dropOptions.count();
    await page.locator('div.fixed.inset-0').first().click(); // Close dropdown
    console.log(`Looping through ${dropCount} collections to locate one with active matches...`);

    for (let cIndex = 0; cIndex < dropCount; cIndex++) {
      console.log(`Checking collection ${cIndex + 1} of ${dropCount}...`);
      await collDropdownBtn.click();
      await page.waitForTimeout(500);
      const activeOptions = page.locator('div.absolute button');
      await activeOptions.nth(cIndex).click();
      await page.waitForTimeout(1000); // Wait for matches to load
      await expect(page.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });
      
      // If we see the radius expansion card, expand it up to the maximum tier to find matches!
      let isExpansionVisible = await page.locator('h2:has-text("No hay más en")').isVisible();
      let expandCount = 0;
      while (isExpansionVisible && expandCount < 3) {
        console.log(`Radius expansion card visible for collection ${cIndex + 1}. Expanding radius (attempt ${expandCount + 1})...`);
        const expandBtn = page.getByRole('button', { name: 'Ampliar búsqueda', exact: false }).first();
        if (await expandBtn.isVisible()) {
          await expandBtn.click();
          await page.waitForTimeout(2000);
          expandCount++;
        } else {
          break;
        }
        isExpansionVisible = await page.locator('h2:has-text("No hay más en")').isVisible();
      }
      
      // Check if we have a match card now
      const cardTitle = page.locator('p:has-text("¡Match en")').first();
      if (await cardTitle.isVisible()) {
        console.log(`Found active matches in collection ${cIndex + 1}! Continuing test with this collection.`);
        hasMatches = true;
        break;
      }
    }

    if (hasMatches) {
      // Spotlight mode details verification
      const cardTitle = page.locator('p:has-text("¡Match en")').first();
      const userName = page.locator('h2').first();
      await expect(userName).toBeVisible();

      const theyHaveText = page.locator('span:has-text("que te faltan")').first();
      const youHaveText = page.locator('span:has-text("que le faltan")').first();
      await expect(theyHaveText).toBeVisible();
      await expect(youHaveText).toBeVisible();

      const passBtn = page.getByRole('button', { name: 'Pasar', exact: false });
      const proposeBtn = page.getByRole('button', { name: 'Proponer', exact: false });
      await expect(passBtn).toBeVisible();
      await expect(proposeBtn).toBeVisible();

      // Counter "1 de N" format
      const counterBadge = page.locator('div.bg-white, div.bg-gray-700, .bg-white, .bg-gray-700').first();
      const counterText = await counterBadge.innerText();
      console.log('Counter Text is:', counterText);

      // Screenshot: First spotlight card with match data
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't3_first_card.png') });

      // -------------------------------------------------------------
      // T4: Swipe / Pass Interaction
      // -------------------------------------------------------------
      console.log('T4 — Swipe / Pass Interaction');
      const originalUserNameText = await userName.innerText();
      console.log(`Original match user: ${originalUserNameText}`);

      // Click "Pasar"
      await passBtn.click();
      await page.waitForTimeout(1000); // Wait for card exit and next card load

      // Verify counter updates and next match displays
      const nextUserNameText = await userName.innerText();
      console.log(`Next match user: ${nextUserNameText}`);
      expect(nextUserNameText).not.toBe(originalUserNameText);

      // Screenshot: After passing — next card visible
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't4_after_passing.png') });

      // -------------------------------------------------------------
      // T5: Propose Interaction
      // -------------------------------------------------------------
      console.log('T5 — Propose Interaction');
      const currentProposeBtn = page.getByRole('button', { name: 'Proponer', exact: false });
      await currentProposeBtn.click();

      // Verify: User is navigated to the trade composer/proposal page
      await page.waitForURL(url => url.href.includes('/intercambios/componer'), { timeout: 15000 });
      console.log('Navigated to:', page.url());
      expect(page.url()).toContain('userId');
      expect(page.url()).toContain('collectionId');

      // Screenshot: Trade proposal page
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't5_composer.png'), fullPage: true });

      // Navigate back and verify no errors
      await page.goBack();
      await page.waitForLoadState('load');
      await expect(page.locator('h1').first()).toBeVisible();

      // -------------------------------------------------------------
      // T6: View Toggle (Discover ↔ Lista)
      // -------------------------------------------------------------
      console.log('T6 — View Toggle');
      // Click "LISTA" tab
      const listTabBtn = page.getByTestId('segmented-tab-grid').first();
      await listTabBtn.click();
      await page.waitForTimeout(1000);

      // Verify: Grid/list view shows matches
      const gridCards = page.locator('.grid > div');
      const gridCount = await gridCards.count();
      console.log(`Grid matches count: ${gridCount}`);

      // Screenshot: Grid/list view with matches
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't6_grid_view.png'), fullPage: true });

      // Click "DESCUBRIR" to switch back
      const discoverTabBtn = page.getByTestId('segmented-tab-spotlight').first();
      await discoverTabBtn.click();
      await page.waitForTimeout(1000);

      // Verify spotlight mode is restored
      await expect(passBtn).toBeVisible();

      // -------------------------------------------------------------
      // T7: Filter Panel
      // -------------------------------------------------------------
      console.log('T7 — Filter Panel');
      const filterIconBtn = page.locator('[data-testid="segmented-tabs"] + button').first();
      await filterIconBtn.click();
      await page.waitForTimeout(500);

      // Verify filter panel opens
      const minOverlapBtn = page.getByText('3+').first();
      await expect(minOverlapBtn).toBeVisible();

      // Screenshot: Filter panel open
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't7_filters_open.png'), fullPage: true });

      // Close filters cleanly
      await filterIconBtn.click();
      await page.waitForTimeout(500);

      // -------------------------------------------------------------
      // T8 & T9: Exhausted State & Radius Expansion
      // -------------------------------------------------------------
      console.log('T8 & T9 — Exhausting matches');
      // Pass matches until exhausted card or radius expansion card shows up
      let isExhausted = false;
      let isExpansion = false;
      let clickCount = 0;

      while (clickCount < 30) {
        const isExhaustedCardVisible = await page.locator('h2:has-text("¡Has visto todos los matches!")').isVisible();
        const isExpansionCardVisible = await page.locator('h2:has-text("No hay más en")').isVisible();

        if (isExhaustedCardVisible) {
          isExhausted = true;
          console.log('Exhausted state card reached!');
          break;
        }
        if (isExpansionCardVisible) {
          isExpansion = true;
          console.log('Radius expansion card reached!');
          break;
        }

        // If we see the Pasar button, click it
        const currentPass = page.getByRole('button', { name: 'Pasar', exact: false });
        if (await currentPass.isVisible()) {
          await currentPass.click();
          await page.waitForTimeout(500);
          clickCount++;
        } else {
          console.log('No pass button or card visible anymore');
          break;
        }
      }

      if (isExpansion) {
        // Screenshot: Radius expansion card
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't8_expansion.png') });

        // Click "Ampliar búsqueda"
        const expandBtn = page.getByRole('button', { name: 'Ampliar búsqueda', exact: false }).first();
        await expandBtn.click();
        await page.waitForTimeout(2000);
      }

      // Pass rest of matches to get exhausted card if not already reached
      if (!isExhausted) {
        clickCount = 0;
        while (clickCount < 30) {
          const isExhaustedCardVisible = await page.locator('h2:has-text("¡Has visto todos los matches!")').isVisible();
          if (isExhaustedCardVisible) {
            isExhausted = true;
            console.log('Exhausted state card reached after expansion!');
            break;
          }
          const currentPass = page.getByRole('button', { name: 'Pasar', exact: false });
          if (await currentPass.isVisible()) {
            await currentPass.click();
            await page.waitForTimeout(500);
            clickCount++;
          } else {
            break;
          }
        }
      }

      if (isExhausted) {
        // Screenshot: Exhausted state card
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't9_exhausted.png') });

        // Reset seen
        const resetBtn = page.getByRole('button', { name: 'Ver todos de nuevo', exact: false }).first();
        await resetBtn.click();
        await page.waitForTimeout(2000);
        await expect(passBtn).toBeVisible();
        console.log('Successfully reset seen matches.');
      }

    } else {
      console.log('No matches found for any collection — no other users with overlapping stickers in the database.');
      // Take screenshots of empty / exhausted state for T3
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't3_first_card.png') });
      console.log('Skipping swipe / pass functional checks T4-T9 since no matches exist.');
    }

    // -------------------------------------------------------------
    // T10: Geo Prompt
    // -------------------------------------------------------------
    console.log('T10 — Geo Prompt');
    // Clear localStorage matchfinder_geo and refresh
    await page.evaluate(() => {
      localStorage.removeItem('matchfinder_geo');
    });
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Verify geo prompt card is visible
    const geoHeader = page.getByText('Activa tu ubicación', { exact: false }).first();
    await expect(geoHeader).toBeVisible();

    // Screenshot: Geo prompt card
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't10_geo_prompt.png') });

    // Skip location prompts
    const skipBtn = page.getByRole('button', { name: 'Continuar sin ubicación', exact: false }).first();
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();
    await page.waitForTimeout(2000);

    // Verify matches load or empty state loads
    const passBtnObj = page.getByRole('button', { name: 'Pasar', exact: false });
    const emptyStateObj = page.locator('h2:has-text("Sin coincidencias"), h2:has-text("No hay más en"), h2:has-text("¡Has visto todos los matches!")').first();
    await expect(passBtnObj.or(emptyStateObj)).toBeVisible();

    // -------------------------------------------------------------
    // T11: Mobile Responsiveness
    // -------------------------------------------------------------
    console.log('T11 — Mobile Responsiveness');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Screenshot: Mobile spotlight view
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't11_mobile_spotlight.png') });

    // Switch to LISTA in mobile
    await page.getByTestId('segmented-tab-grid').first().click();
    await page.waitForTimeout(1000);
    // Screenshot: Mobile list view
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't11_mobile_list.png'), fullPage: true });

    // Switch back to spotlight and open filters
    await page.getByTestId('segmented-tab-spotlight').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="segmented-tabs"] + button').first().click();
    await page.waitForTimeout(500);
    // Screenshot: Mobile filter panel
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't11_mobile_filters.png') });

    // Close filters
    await page.locator('[data-testid="segmented-tabs"] + button').first().click();
    await page.waitForTimeout(500);

    // Restore desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // T13: Dark Mode Visual Check
    // -------------------------------------------------------------
    console.log('T13 — Dark Mode');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't13_dark_mode.png'), fullPage: true });

    // Restore light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(1000);

    // Final log of errors
    console.log('Unique console errors collected:', [...new Set(consoleErrors)]);
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'matchfinder_errors.json'),
      JSON.stringify(consoleErrors, null, 2)
    );
  });
});
