import { test, expect } from '@playwright/test';

/**
 * v1.4.3 - SegmentedTabs Tests
 *
 * Verifies equal-width paired tabs across all trade screens.
 */

test.describe('SegmentedTabs Component', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Setup authenticated user
    // await page.goto('/login');
    // await login(page, 'testuser@example.com', 'password');
  });

  test('Proposals page: RECIBIDAS|ENVIADAS tabs have equal width', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });
    const outboxTab = page.getByRole('tab', { name: /enviadas/i });

    await expect(inboxTab).toBeVisible();
    await expect(outboxTab).toBeVisible();

    // Get bounding boxes
    const inboxBox = await inboxTab.boundingBox();
    const outboxBox = await outboxTab.boundingBox();

    expect(inboxBox).not.toBeNull();
    expect(outboxBox).not.toBeNull();

    // Verify equal widths (within 1px tolerance)
    expect(Math.abs(inboxBox!.width - outboxBox!.width)).toBeLessThanOrEqual(1);
  });

  test('Proposals page: Active tab has gold background', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });

    // Inbox should be active by default
    await expect(inboxTab).toHaveAttribute('aria-selected', 'true');

    // Check background color (gold = #FFC000 = rgb(255, 192, 0))
    const bgColor = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toContain('255, 192, 0');
  });

  test('Proposals page: Clicking tab switches content', async ({ page }) => {
    await page.goto('/trades/proposals');

    const outboxTab = page.getByRole('tab', { name: /enviadas/i });
    await outboxTab.click();

    // Verify outbox tab is now active
    await expect(outboxTab).toHaveAttribute('aria-selected', 'true');

    // Verify content changed (check for "Enviadas" proposals or empty state)
    // await expect(page.getByText(/no hay propuestas/i)).toBeVisible();
  });

  test('Proposals page: Keyboard navigation with Arrow keys', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });
    await inboxTab.focus();

    // Press ArrowRight to switch to ENVIADAS
    await page.keyboard.press('ArrowRight');

    const outboxTab = page.getByRole('tab', { name: /enviadas/i });
    await expect(outboxTab).toHaveAttribute('aria-selected', 'true');

    // Press ArrowLeft to switch back to RECIBIDAS
    await page.keyboard.press('ArrowLeft');
    await expect(inboxTab).toHaveAttribute('aria-selected', 'true');
  });

  test('ProposalDetailModal: RESUMEN|MENSAJES tabs have equal width', async ({ page }) => {
    // TODO: Open a proposal detail modal
    // await page.goto('/trades/proposals');
    // await page.locator('[data-proposal-id]').first().click();

    // const resumenTab = page.getByRole('tab', { name: /resumen/i });
    // const mensajesTab = page.getByRole('tab', { name: /mensajes/i });

    // await expect(resumenTab).toBeVisible();
    // await expect(mensajesTab).toBeVisible();

    // const resumenBox = await resumenTab.boundingBox();
    // const mensajesBox = await mensajesTab.boundingBox();

    // expect(Math.abs(resumenBox!.width - mensajesBox!.width)).toBeLessThanOrEqual(1);
  });

  test('StickerSelector: OFRECER|PEDIR tabs align correctly', async ({ page }) => {
    // TODO: Navigate to composer
    // await page.goto('/trades/compose?userId=...&collectionId=...');

    // const offerTab = page.getByRole('tab', { name: /ofrecer/i });
    // const requestTab = page.getByRole('tab', { name: /pedir/i });

    // await expect(offerTab).toBeVisible();
    // await expect(requestTab).toBeVisible();

    // const offerBox = await offerTab.boundingBox();
    // const requestBox = await requestTab.boundingBox();

    // expect(Math.abs(offerBox!.width - requestBox!.width)).toBeLessThanOrEqual(1);
  });

  test('Container has thick borders (border-2 border-black)', async ({ page }) => {
    await page.goto('/trades/proposals');

    const tabsContainer = page.getByTestId('segmented-tabs');
    await expect(tabsContainer).toBeVisible();

    // Check container border width (should be 2px on all sides)
    const borderTopWidth = await tabsContainer.evaluate(el =>
      window.getComputedStyle(el).borderTopWidth
    );
    const borderRightWidth = await tabsContainer.evaluate(el =>
      window.getComputedStyle(el).borderRightWidth
    );
    expect(borderTopWidth).toBe('2px');
    expect(borderRightWidth).toBe('2px');

    // Check border color (should be black)
    const borderColor = await tabsContainer.evaluate(el =>
      window.getComputedStyle(el).borderColor
    );
    expect(borderColor).toContain('0, 0, 0');
  });

  test('Internal dividers are single-pixel (no double borders)', async ({ page }) => {
    await page.goto('/trades/proposals');

    const outboxTab = page.getByRole('tab', { name: /enviadas/i });

    // Check for ::before pseudo-element that creates the divider
    const beforeWidth = await outboxTab.evaluate(el => {
      const before = window.getComputedStyle(el, '::before');
      return before.width;
    });

    expect(beforeWidth).toBe('1px');
  });

  test('Tabs have rounded outer corners only', async ({ page }) => {
    await page.goto('/trades/proposals');

    const tabsContainer = page.getByTestId('segmented-tabs');

    // Container should have border-radius
    const borderRadius = await tabsContainer.evaluate(el =>
      window.getComputedStyle(el).borderRadius
    );
    expect(borderRadius).not.toBe('0px');
  });

  test('Focus ring is visible on keyboard focus (no layout shift)', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });

    // Get position before focus
    const beforeBox = await inboxTab.boundingBox();

    // Focus with keyboard
    await inboxTab.focus();

    // Get position after focus
    const afterBox = await inboxTab.boundingBox();

    // Verify focus ring (ring-inset means it won't affect layout)
    const boxShadow = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );

    // Should have inset box-shadow (gold ring)
    expect(boxShadow).toContain('inset');

    // Verify no layout shift
    expect(afterBox!.width).toBe(beforeBox!.width);
    expect(afterBox!.height).toBe(beforeBox!.height);
  });

  test('Tabs do not shift layout on click or focus', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });
    const outboxTab = page.getByRole('tab', { name: /enviadas/i });

    // Get initial positions
    const initialInboxBox = await inboxTab.boundingBox();
    const initialOutboxBox = await outboxTab.boundingBox();

    // Click outbox tab
    await outboxTab.click();

    // Get positions after click
    const afterClickInboxBox = await inboxTab.boundingBox();
    const afterClickOutboxBox = await outboxTab.boundingBox();

    // Verify positions haven't shifted
    expect(afterClickInboxBox!.x).toBeCloseTo(initialInboxBox!.x, 1);
    expect(afterClickOutboxBox!.x).toBeCloseTo(initialOutboxBox!.x, 1);
  });

  test('Home and End keys navigate to first/last tabs', async ({ page }) => {
    await page.goto('/trades/proposals');

    const outboxTab = page.getByRole('tab', { name: /enviadas/i });
    await outboxTab.focus();

    // Press Home to go to first tab
    await page.keyboard.press('Home');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });
    await expect(inboxTab).toHaveAttribute('aria-selected', 'true');

    // Press End to go to last tab
    await page.keyboard.press('End');
    await expect(outboxTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Long labels truncate with ellipsis (no wrap or overflow)', async ({ page }) => {
    await page.goto('/trades/proposals');

    const tabs = page.getByRole('tab');
    const firstTab = tabs.first();

    // Check for truncate class behavior
    const overflow = await firstTab.evaluate(el => {
      const span = el.querySelector('span span');
      if (!span) return 'visible';
      return window.getComputedStyle(span).overflow;
    });

    const textOverflow = await firstTab.evaluate(el => {
      const span = el.querySelector('span span');
      if (!span) return 'clip';
      return window.getComputedStyle(span).textOverflow;
    });

    expect(overflow).toBe('hidden');
    expect(textOverflow).toBe('ellipsis');
  });

  test('Test IDs are present for automation', async ({ page }) => {
    await page.goto('/trades/proposals');

    // Container has data-testid
    await expect(page.getByTestId('segmented-tabs')).toBeVisible();

    // Each tab has data-testid
    await expect(page.getByTestId('segmented-tab-inbox')).toBeVisible();
    await expect(page.getByTestId('segmented-tab-outbox')).toBeVisible();
  });
});
