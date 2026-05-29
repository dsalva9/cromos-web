import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = 'C:/Users/dsalv/.gemini/antigravity/brain/390af7b3-25e0-45fd-9a5b-9679a1ed90f5';
const BASE_URL = 'https://cambiocromos.com';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Track console errors and soft QA bugs
const consoleErrors: string[] = [];
const qaBugs: string[] = [];

test.describe('Tinder-Style Match Finder (UX Refinements) QA Validation', () => {
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

  test('Run Tinder-Style Match Finder UX Refinements Suite', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes timeout

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

    if (hasEmptyState) {
      console.log('Blocker: No collections exist. Stopping.');
      qaBugs.push('Blocker: User has zero collections with stickers.');
      return;
    }

    // -------------------------------------------------------------
    // CASE 1: Coming Soon Page (/es/intercambios/)
    // -------------------------------------------------------------
    console.log('Case 1 — Coming Soon Page (/es/intercambios/)');
    await page.goto(`${BASE_URL}/es/intercambios/`);
    await page.waitForLoadState('load');

    // Expected: A "Próximamente" card with gold header, ArrowRightLeft icon, description text
    const proximamenteCard = page.getByText('Próximamente', { exact: false }).first();
    const isCardVisible = await proximamenteCard.isVisible();
    if (!isCardVisible) {
      qaBugs.push('Case 1: "Próximamente" card is missing on /es/intercambios/');
    }

    const ctaButton = page.locator('a:has-text("Buscar matches"), button:has-text("Buscar matches"), a:has-text("Buscar matches →")').first();
    const isCtaButtonVisible = await ctaButton.isVisible();
    if (!isCtaButtonVisible) {
      console.log('Case 1 SOFT FAIL: "Buscar matches" CTA button is missing from the Coming Soon page.');
      qaBugs.push('Case 1: "Buscar matches" CTA button is missing from the Coming Soon page.');
    } else {
      // Verify: The CTA links to /es/intercambios/buscar
      const hrefValue = await ctaButton.getAttribute('href');
      console.log('CTA links to:', hrefValue);
      if (!hrefValue || !hrefValue.includes('/intercambios/buscar')) {
        qaBugs.push(`Case 1: CTA links to invalid URL: ${hrefValue}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't1_coming_soon.png'), fullPage: true });

    // -------------------------------------------------------------
    // CASE 2: Match Finder Page Load (/es/intercambios/buscar)
    // -------------------------------------------------------------
    console.log('Case 2 — Match Finder Page Load (/es/intercambios/buscar)');
    await page.goto(`${BASE_URL}/es/intercambios/buscar`);
    await page.waitForLoadState('load');
    await page.setViewportSize({ width: 1440, height: 900 });

    // Handle Geo Prompt on fresh page load if visible
    const preFlightSkipBtn = page.getByRole('button', { name: 'Continuar sin ubicación', exact: false }).first();
    if (await preFlightSkipBtn.isVisible()) {
      console.log('Dismissing initial Geo Prompt...');
      await preFlightSkipBtn.click();
      await page.waitForTimeout(2000);
    }

    // Wait for the loader to clear
    await expect(page.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });

    // Expected: Header shows "BUSCAR COINCIDENCIAS" on desktop
    const desktopHeader = page.getByText('BUSCAR COINCIDENCIAS', { exact: false }).first();
    const isHeaderVisible = await desktopHeader.isVisible();
    if (!isHeaderVisible) {
      qaBugs.push('Case 2: "BUSCAR COINCIDENCIAS" header is missing on desktop.');
    }

    // Expected: A collection selector dropdown is visible below the header
    const collDropdownBtn = page.locator('button:has-text("📁"), button:has-text("Panini")').first();
    await expect(collDropdownBtn).toBeVisible();

    // Expected: A filter icon button is visible in the header row
    const filterIconBtn = page.locator('[data-testid="segmented-tabs"] + button, button:has(svg)').first();
    await expect(filterIconBtn).toBeVisible();

    // Expected: View toggle (Descubrir / Lista) is visible on desktop
    const viewToggle = (await page.locator('[data-testid="segmented-tabs"]').first().isVisible())
      ? page.locator('[data-testid="segmented-tabs"]').first()
      : page.getByText('DESCUBRIR', { exact: false }).first();
    await expect(viewToggle).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't2_desktop_load.png'), fullPage: true });

    // -------------------------------------------------------------
    // CASE 3: Rarity Filter Removed
    // -------------------------------------------------------------
    console.log('Case 3 — Rarity Filter Removed');
    // Open the filter panel
    await filterIconBtn.click();
    await page.waitForTimeout(500);

    // Expected: Search radius slider, team search input, min overlaps
    await expect(page.getByText('Radio de búsqueda', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Equipo', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Coincidencias mínimas', { exact: false }).first()).toBeVisible();

    // NOT expected: No "Rareza" filter should exist anywhere
    const rarityLabel = page.getByText('Rareza', { exact: false });
    const isRarityVisible = await rarityLabel.isVisible();
    if (isRarityVisible) {
      qaBugs.push('Case 3: "Rareza" filter still exists in the filter panel.');
    }

    // Take screenshot of filter panel
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't3_filter_panel.png') });

    // -------------------------------------------------------------
    // CASE 4: Radius Slider
    // -------------------------------------------------------------
    console.log('Case 4 — Radius Slider');
    // Verify tick marks exist (e.g. labels 5, 10, 25, 50, 100, 200, 500, 1000, ∞ / "Todo el país")
    const maxTick = page.locator('text=Todo el país, text=∞, text=Cualquiera').first();
    const isMaxTickVisible = await maxTick.isVisible();
    if (!isMaxTickVisible) {
      qaBugs.push('Case 4: Radius slider max tick (∞ / Todo el país) is not visible.');
    }

    // Drag the slider to 25km (usually index 2 or clicking the tick mark label "25")
    const tick25 = page.getByText('25', { exact: true }).first();
    if (await tick25.isVisible()) {
      console.log('Clicking the 25km slider tick...');
      await tick25.click();
      await page.waitForTimeout(1500); // observe reload
    } else {
      const sliderInput = page.locator('input[type="range"]').first();
      if (await sliderInput.isVisible()) {
        await sliderInput.fill('2'); // index 2 represents 25km
        await page.waitForTimeout(1500);
      } else {
        qaBugs.push('Case 4: Could not find clickable 25km tick or input range element.');
      }
    }

    // Take screenshot at 25km
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't4_radius_25km.png') });

    // Reset radius to max (∞) to ensure we find matches for remaining tests
    console.log('Resetting search radius to maximum (∞) to gather matches...');
    const infiniteTick = page.getByText('∞', { exact: false }).first();
    const todoElPaisTick = page.getByText('Todo el país', { exact: false }).first();
    if (await infiniteTick.isVisible()) {
      await infiniteTick.click();
    } else if (await todoElPaisTick.isVisible()) {
      await todoElPaisTick.click();
    } else {
      const sliderInput = page.locator('input[type="range"]').first();
      if (await sliderInput.isVisible()) {
        await sliderInput.fill('8'); // Max index for ∞
      }
    }
    await page.waitForTimeout(1500);

    // Close filter panel
    await filterIconBtn.click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // CASE 5: Mobile Layout
    // -------------------------------------------------------------
    console.log('Case 5 — Mobile Layout');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Expected: Title reads "BUSCAR MATCH" (not "BUSCAR COINCIDENCIAS")
    const mobileHeaderTitle = page.getByText('BUSCAR MATCH', { exact: true }).first();
    const isMobileTitleVisible = await mobileHeaderTitle.isVisible();
    if (!isMobileTitleVisible) {
      qaBugs.push(`Case 5: Mobile header title does not read "BUSCAR MATCH".`);
    }

    // Subtitle is hidden, view toggle is hidden, only filter shows next to title
    const mobileSubtitle = page.locator('text=Encuentra otros coleccionistas').first();
    const isSubtitleVisible = await mobileSubtitle.isVisible();
    if (isSubtitleVisible) {
      qaBugs.push('Case 5: Subtitle is not hidden on mobile.');
    }

    // Open filter panel on mobile
    const filterMobileBtn = page.locator('button:has(svg)').first();
    await filterMobileBtn.click();
    await page.waitForTimeout(500);

    // Expected: View mode toggle appears inside the filter panel
    const filterPanelTabs = page.locator('[data-testid="segmented-tabs"]').first();
    const isToggleInPanelVisible = await filterPanelTabs.isVisible();
    if (!isToggleInPanelVisible) {
      qaBugs.push('Case 5: View toggle does not appear inside the filter panel on mobile.');
    }

    // Take screenshot of mobile filter panel
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't5_mobile_filters.png') });

    // Close filters on mobile
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Take screenshot of mobile header
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't5_mobile_header.png') });

    // Restore desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // CASE 6: Sticker Detail (CRITICAL BUG FIX)
    // -------------------------------------------------------------
    console.log('Case 6 — Sticker Detail (CRITICAL BUG FIX)');
    // Traversal loop to find matches if needed (just in case they are not in the current collection)
    let matchesFound = false;
    await collDropdownBtn.click();
    await page.waitForTimeout(500);
    const dropOptions = page.locator('div.absolute button, button[role="menuitem"]');
    const dropCount = await dropOptions.count();
    await page.keyboard.press('Escape'); // close dropdown
    await page.waitForTimeout(500);

    for (let c = 0; c < Math.max(1, dropCount); c++) {
      if (dropCount > 1) {
        await collDropdownBtn.click();
        await page.waitForTimeout(500);
        const options = page.locator('div.absolute button, button[role="menuitem"]');
        await options.nth(c).click();
        await page.waitForTimeout(1500);
        await expect(page.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 20000 });
      }

      // Expand search radius to ∞
      const filterIcon = page.locator('[data-testid="segmented-tabs"] + button, button:has(svg)').first();
      await filterIcon.click();
      await page.waitForTimeout(500);
      const infiniteTick = page.getByText('∞', { exact: false }).first();
      const todoElPaisTick = page.getByText('Todo el país', { exact: false }).first();
      if (await infiniteTick.isVisible()) {
        await infiniteTick.click();
      } else if (await todoElPaisTick.isVisible()) {
        await todoElPaisTick.click();
      }
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape'); // close panel
      await page.waitForTimeout(500);

      const spotlightCard = page.locator('p:has-text("Match en")').first();
      if (await spotlightCard.isVisible()) {
        console.log(`Found active match in collection ${c + 1}`);
        matchesFound = true;
        break;
      }
    }

    if (matchesFound) {
      // Expected: "Cromos destacados" section showing up to 5 sticker previews
      const destacadosHeader = page.locator('text=Cromos destacados, text=Destacados').first();
      const isDestacadosVisible = await destacadosHeader.isVisible();
      if (!isDestacadosVisible) {
        qaBugs.push('Case 6: "Cromos destacados" section is not visible on spotlight card.');
      }

      // Click "Ver detalle" to open detail drawer
      const verDetalleBtn = page.getByRole('button', { name: 'Ver detalle', exact: false }).first();
      await expect(verDetalleBtn).toBeVisible();
      await verDetalleBtn.click();
      await page.waitForTimeout(1000);

      // Expected: "They offer" (Te ofrece) and "I offer" (Le ofreces)
      const theyOfferSection = page.locator('div, span, p, h2, h3').filter({ hasText: /Te ofrece|Tiene que te faltan|Ofrece/ }).first();
      const iOfferSection = page.locator('div, span, p, h2, h3').filter({ hasText: /Le ofreces|Tienes que le faltan|Ofreces/ }).first();
      
      const isTheyOfferVisible = await theyOfferSection.isVisible();
      const isIOfferVisible = await iOfferSection.isVisible();
      if (!isTheyOfferVisible) qaBugs.push('Case 6: "They offer" section is missing from the detail drawer.');
      if (!isIOfferVisible) qaBugs.push('Case 6: "I offer" section is missing from the detail drawer.');

      // Ensure neither section has empty text "Este usuario no tiene cromos que necesites"
      const emptyTextMsg = page.locator('text=Este usuario no tiene cromos que necesites').first();
      const isEmptyTextVisible = await emptyTextMsg.isVisible();
      if (isEmptyTextVisible) {
        qaBugs.push('Case 6: Drawer incorrectly displays "Este usuario no tiene cromos que necesites" for active matches.');
      }

      // Take screenshot of drawer
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't6_detail_drawer.png') });

      // -------------------------------------------------------------
      // CASE 7: CTA Label
      // -------------------------------------------------------------
      console.log('Case 7 — CTA Label');
      // In the detail drawer, verify bottom CTA button says "¡Cambiar!" (not "Proponer Intercambio →")
      const drawerCta = page.locator('button, a').filter({ hasText: '¡Cambiar!' }).first();
      const isDrawerCtaCorrect = await drawerCta.isVisible();
      if (!isDrawerCtaCorrect) {
        console.log('Case 7 SOFT FAIL: Detail drawer CTA button does not say "¡Cambiar!".');
        qaBugs.push('Case 7: Detail drawer CTA button does not say "¡Cambiar!".');
      }

      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // On spotlight card, verify right action button says "¡Cambiar!" (not "Proponer")
      const spotlightCta = page.locator('button, a, [data-testid="spotlight-cta-right"]').filter({ hasText: '¡Cambiar!' }).first();
      const spotlightCtaText = await spotlightCta.innerText().catch(() => '');
      if (spotlightCtaText.trim() !== '¡Cambiar!') {
        console.log(`Case 7 SOFT FAIL: Spotlight card right action button is: "${spotlightCtaText}" (expected "¡Cambiar!").`);
        qaBugs.push(`Case 7: Spotlight card right action button is: "${spotlightCtaText}" (expected "¡Cambiar!").`);
      }

      // Take screenshot
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't7_cta_labels.png') });

      // -------------------------------------------------------------
      // CASE 8: Grid View
      // -------------------------------------------------------------
      console.log('Case 8 — Grid View');
      const gridTabBtn = page.getByTestId('segmented-tab-grid').first();
      await gridTabBtn.click();
      await page.waitForTimeout(1000);

      // Expected: Match cards display in a grid. Click a card
      const gridCards = page.locator('.grid > div, .grid a, .grid button').first();
      await gridCards.click();
      await page.waitForTimeout(1000);

      // Verify the drawer CTA says "¡Cambiar!"
      const gridDrawerCta = page.locator('button, a').filter({ hasText: '¡Cambiar!' }).first();
      const isGridDrawerCtaCorrect = await gridDrawerCta.isVisible();
      if (!isGridDrawerCtaCorrect) {
        qaBugs.push('Case 8: Grid list drawer CTA button does not say "¡Cambiar!".');
      }

      // Close drawer and take screenshot
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't8_grid_view.png'), fullPage: true });

      // Switch back to spotlight (Descubrir)
      const discoverTabBtn = page.getByTestId('segmented-tab-spotlight').first();
      await discoverTabBtn.click();
      await page.waitForTimeout(1000);

      // -------------------------------------------------------------
      // CASE 9: Swipe Interaction
      // -------------------------------------------------------------
      console.log('Case 9 — Swipe Interaction');
      const userName = page.locator('h2').first();
      const originalUserNameText = await userName.innerText();
      console.log(`Original user card: ${originalUserNameText}`);

      const passBtn = page.getByRole('button', { name: 'Pasar', exact: false }).first();
      await passBtn.click();
      await page.waitForTimeout(1000);

      const nextUserNameText = await userName.innerText();
      console.log(`Next user card: ${nextUserNameText}`);
      if (nextUserNameText === originalUserNameText) {
        qaBugs.push('Case 9: Clicking "Pasar" did not advance to the next user.');
      }

      // Take screenshot of next card
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't9_swipe_pass.png') });

      // -------------------------------------------------------------
      // CASE 10: Exhausted State
      // -------------------------------------------------------------
      console.log('Case 10 — Exhausted State');
      let isExhausted = false;
      let clickCount = 0;

      while (clickCount < 30) {
        const isExhaustedCardVisible = await page.locator('h2:has-text("¡Has visto todos los matches!")').isVisible();
        if (isExhaustedCardVisible) {
          isExhausted = true;
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

      if (isExhausted) {
        // Expected: Green gradient header with 🎉, "¡Has visto todos los matches!" title, buttons: "Ver todos de nuevo" and "Cambiar colección"
        await expect(page.locator('h2:has-text("¡Has visto todos los matches!")').first()).toBeVisible();
        await expect(page.getByText('🎉').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ver todos de nuevo', exact: false }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cambiar colección', exact: false }).first()).toBeVisible();

        // Take screenshot
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't10_exhausted_state.png') });

        // Reset
        await page.getByRole('button', { name: 'Ver todos de nuevo', exact: false }).first().click();
        await page.waitForTimeout(1500);
      } else {
        console.log('Could not exhaust matches fully under loop limit, skipping exhausted card verification.');
      }

    } else {
      console.log('No matches found for any collection. Skipping cases 6-10.');
      qaBugs.push('Pre-flight: No active matches found in any collection to execute swipe/propose cases (6-10).');
    }

    // -------------------------------------------------------------
    // CASE 11: UX & Visual Quality Assessment (Dark Mode)
    // -------------------------------------------------------------
    console.log('Case 11 — UX & Visual Quality Assessment (Dark Mode)');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(1000);

    // Take screenshot of dark mode
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 't11_ux_dark_mode.png'), fullPage: true });

    // Restore light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(1000);

    // Final log of errors & bugs
    console.log('Unique console errors collected:', [...new Set(consoleErrors)]);
    console.log('QA Bugs collected:', qaBugs);
    
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'matchfinder_errors.json'),
      JSON.stringify(consoleErrors, null, 2)
    );
    
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'matchfinder_bugs.json'),
      JSON.stringify(qaBugs, null, 2)
    );
  });
});
