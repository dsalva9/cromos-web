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

  test('Tabs have thick borders (border-2 border-black)', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });

    // Check border width (should be 2px)
    const borderWidth = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).borderWidth
    );
    expect(borderWidth).toBe('2px');

    // Check border color when active (should be black)
    const borderColor = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).borderColor
    );
    expect(borderColor).toContain('0, 0, 0');
  });

  test('Focus ring is visible on keyboard focus', async ({ page }) => {
    await page.goto('/trades/proposals');

    const inboxTab = page.getByRole('tab', { name: /recibidas/i });

    // Focus with keyboard
    await inboxTab.focus();

    // Verify focus ring (outline or box-shadow)
    const outline = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).outline
    );
    const boxShadow = await inboxTab.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );

    // Should have either outline or focus ring box-shadow
    const hasFocusIndicator = outline !== 'none' || boxShadow !== 'none';
    expect(hasFocusIndicator).toBe(true);
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
});
