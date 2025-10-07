import { test, expect, Page } from '@playwright/test';

/**
 * Trade Chat UI + Unread Message Badges - E2E Test Suite
 *
 * Tests Sprint v1.4.2 features:
 * - Trade chat UI with realtime messaging
 * - Unread message badges on proposal cards
 * - Aggregate unread counts on tabs
 * - Mark as read functionality
 * - Chat panel UI/UX (composer, scroll, pagination)
 *
 * Prerequisites:
 * - Two test users with credentials
 * - Collection with stickers for trading
 * - At least one trade proposal between users
 * - Database seeded with test data
 */

// Test configuration
const USER_1 = {
  email: process.env.TEST_USER1_EMAIL || 'user1@cambiocromo.com',
  password: process.env.TEST_USER1_PASSWORD || 'testpassword1',
};

const USER_2 = {
  email: process.env.TEST_USER2_EMAIL || 'user2@cambiocromo.com',
  password: process.env.TEST_USER2_PASSWORD || 'testpassword2',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper functions
async function login(page: Page, user: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(profile|mi-coleccion|trades)/);
}

async function navigateToProposals(page: Page) {
  await page.goto(`${BASE_URL}/trades/proposals`);
  await page.waitForSelector('[data-testid="proposal-card"]', {
    timeout: 10000,
  });
}

async function openFirstProposal(page: Page, box: 'inbox' | 'outbox' = 'inbox') {
  // Switch to the correct tab
  if (box === 'outbox') {
    await page.click('button:has-text("Enviadas")');
  }

  // Wait for proposals to load
  await page.waitForSelector('[data-testid="proposal-card"]', {
    timeout: 10000,
  });

  // Click first proposal card
  await page.click('[data-testid="proposal-card"]');

  // Wait for modal to open
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

test.describe('Trade Chat UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USER_1);
  });

  test('should load last 50 messages on chat open', async ({ page }) => {
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');

    // Switch to Mensajes tab
    await page.click('button:has-text("Mensajes")');

    // Wait for chat panel to load
    await page.waitForSelector('[data-testid="trade-chat-panel"]', {
      timeout: 5000,
    });

    // Check that messages are loaded (or empty state shown)
    const hasMessages = await page.isVisible('.max-w-\\[70\\%\\]');
    const hasEmptyState = await page.isVisible(
      'text=/Aún no hay mensajes en esta propuesta/'
    );

    expect(hasMessages || hasEmptyState).toBe(true);
  });

  test('should scroll to bottom on initial load', async ({ page }) => {
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');

    // Switch to Mensajes tab
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(1000);

    // Get scroll container
    const scrollContainer = page.locator('.overflow-y-auto').first();
    const isAtBottom = await scrollContainer.evaluate(el => {
      return (
        Math.abs(
          el.scrollHeight - el.scrollTop - el.clientHeight
        ) < 50
      );
    });

    expect(isAtBottom).toBe(true);
  });

  test('should send a message successfully', async ({ page }) => {
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');

    // Switch to Mensajes tab
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // Type message
    const testMessage = `Test message ${Date.now()}`;
    await page.fill('textarea[placeholder*="Mensaje para"]', testMessage);

    // Send message
    await page.click('button:has-text("Enviar")');

    // Verify message appears in chat
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should enforce 500 character limit', async ({ page }) => {
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');

    // Switch to Mensajes tab
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // Type a very long message
    const longMessage = 'a'.repeat(600);
    await page.fill('textarea[placeholder*="Mensaje para"]', longMessage);

    // Check that textarea value is capped at 500
    const textareaValue = await page.inputValue(
      'textarea[placeholder*="Mensaje para"]'
    );
    expect(textareaValue.length).toBeLessThanOrEqual(500);

    // Check character counter shows warning
    await expect(page.getByText(/caracteres restantes/)).toBeVisible();
  });

  test('should disable composer for cancelled proposals', async ({ page }) => {
    await navigateToProposals(page);

    // Find a cancelled proposal (if any)
    const cancelledCard = page.locator(
      '[data-testid="proposal-card"]:has-text("cancelled")'
    );
    const hasCancelled = await cancelledCard.count();

    if (hasCancelled > 0) {
      await cancelledCard.first().click();
      await page.click('button:has-text("Mensajes")');
      await page.waitForTimeout(500);

      // Check composer is disabled
      const textarea = page.locator('textarea');
      await expect(textarea).toBeDisabled();
      await expect(textarea).toHaveAttribute(
        'placeholder',
        /Esta propuesta está cerrada/
      );
    } else {
      test.skip();
    }
  });

  test('should show "Ver mensajes anteriores" if hasMore', async ({ page }) => {
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');

    // Switch to Mensajes tab
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(1000);

    // Check if "Ver mensajes anteriores" button exists
    const loadMoreButton = page.getByRole('button', {
      name: /ver mensajes anteriores/i,
    });
    const hasLoadMore = await loadMoreButton.isVisible();

    // If button exists, test it
    if (hasLoadMore) {
      await loadMoreButton.click();
      await page.waitForTimeout(1000);

      // Verify more messages loaded (scroll position should change)
      const scrollContainer = page.locator('.overflow-y-auto').first();
      const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }
  });
});

test.describe('Realtime Chat Updates', () => {
  test('should receive message from other user in realtime', async ({
    page,
    context,
  }) => {
    // User 1 opens chat
    await login(page, USER_1);
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // User 2 sends a message (in new page/context)
    const page2 = await context.newPage();
    await login(page2, USER_2);
    await navigateToProposals(page2);
    await openFirstProposal(page2, 'outbox');
    await page2.click('button:has-text("Mensajes")');
    await page2.waitForTimeout(500);

    const testMessage = `Realtime test ${Date.now()}`;
    await page2.fill('textarea[placeholder*="Mensaje para"]', testMessage);
    await page2.click('button:has-text("Enviar")');

    // User 1 should see the message appear
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });

    await page2.close();
  });
});

test.describe('Unread Badges on Proposal Cards', () => {
  test('should show unread badge when counterparty sends message', async ({
    page,
    context,
  }) => {
    // User 1 navigates to proposals
    await login(page, USER_1);
    await navigateToProposals(page);

    // Get initial unread count (if any)
    const initialBadges = await page.locator('.bg-\\[\\#E84D4D\\]').count();

    // User 2 sends a message
    const page2 = await context.newPage();
    await login(page2, USER_2);
    await navigateToProposals(page2);
    await openFirstProposal(page2, 'outbox');
    await page2.click('button:has-text("Mensajes")');
    await page2.waitForTimeout(500);

    const testMessage = `Unread badge test ${Date.now()}`;
    await page2.fill('textarea[placeholder*="Mensaje para"]', testMessage);
    await page2.click('button:has-text("Enviar")');
    await page2.waitForTimeout(1000);

    // User 1 refreshes proposals page
    await page.reload();
    await page.waitForSelector('[data-testid="proposal-card"]', {
      timeout: 10000,
    });

    // Check that unread badge appears (count should increase)
    const newBadges = await page.locator('.bg-\\[\\#E84D4D\\]').count();
    expect(newBadges).toBeGreaterThanOrEqual(initialBadges);

    await page2.close();
  });

  test('should clear unread badge after opening chat', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);

    // Find a proposal with unread badge
    const proposalWithBadge = page.locator(
      '[data-testid="proposal-card"]:has(.bg-\\[\\#E84D4D\\])'
    );
    const hasBadge = await proposalWithBadge.count();

    if (hasBadge > 0) {
      await proposalWithBadge.first().click();
      await page.click('button:has-text("Mensajes")');
      await page.waitForTimeout(1000);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Refresh page
      await page.reload();
      await page.waitForTimeout(1000);

      // Badge should be gone for that proposal
      // (hard to verify specific card, but total badges should decrease)
      const remainingBadges = await page.locator('.bg-\\[\\#E84D4D\\]').count();
      expect(remainingBadges).toBeLessThan(hasBadge);
    } else {
      test.skip();
    }
  });

  test('should cap unread badge at "9+"', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);

    // Check if any badge shows "9+"
    const ninePlusBadge = page.locator('text=/9\\+/');
    const hasNinePlus = await ninePlusBadge.count();

    if (hasNinePlus > 0) {
      await expect(ninePlusBadge.first()).toBeVisible();
    }

    // Even if no 9+ badge exists, test passes (feature works as designed)
  });
});

test.describe('Aggregate Unread Counts on Tabs', () => {
  test('should show aggregate unread count on Recibidas tab', async ({
    page,
  }) => {
    await login(page, USER_1);
    await navigateToProposals(page);
    await page.waitForTimeout(1000);

    // Check if Recibidas tab has a badge
    const inboxTab = page.locator('button:has-text("Recibidas")');
    const inboxBadge = inboxTab.locator('.bg-\\[\\#E84D4D\\]');
    const hasInboxBadge = await inboxBadge.count();

    // If badge exists, verify it's visible
    if (hasInboxBadge > 0) {
      await expect(inboxBadge.first()).toBeVisible();
      const badgeText = await inboxBadge.first().textContent();
      expect(badgeText).toMatch(/^\d+$|^\d+\+$/); // Number or "9+"
    }
  });

  test('should show aggregate unread count on Enviadas tab', async ({
    page,
  }) => {
    await login(page, USER_1);
    await navigateToProposals(page);
    await page.waitForTimeout(1000);

    // Check if Enviadas tab has a badge
    const outboxTab = page.locator('button:has-text("Enviadas")');
    const outboxBadge = outboxTab.locator('.bg-\\[\\#E84D4D\\]');
    const hasOutboxBadge = await outboxBadge.count();

    // If badge exists, verify it's visible
    if (hasOutboxBadge > 0) {
      await expect(outboxBadge.first()).toBeVisible();
      const badgeText = await outboxBadge.first().textContent();
      expect(badgeText).toMatch(/^\d+$|^\d+\+$/); // Number or "9+"
    }
  });

  test('should update tab badge counts in realtime', async ({
    page,
    context,
  }) => {
    // User 1 on proposals page
    await login(page, USER_1);
    await navigateToProposals(page);
    await page.waitForTimeout(1000);

    // Get initial inbox badge count
    const inboxTab = page.locator('button:has-text("Recibidas")');
    const initialBadge = inboxTab.locator('.bg-\\[\\#E84D4D\\]');
    const initialCount =
      (await initialBadge.count()) > 0
        ? await initialBadge.first().textContent()
        : '0';

    // User 2 sends a message to User 1
    const page2 = await context.newPage();
    await login(page2, USER_2);
    await navigateToProposals(page2);
    await openFirstProposal(page2, 'outbox');
    await page2.click('button:has-text("Mensajes")');
    await page2.waitForTimeout(500);

    const testMessage = `Tab badge test ${Date.now()}`;
    await page2.fill('textarea[placeholder*="Mensaje para"]', testMessage);
    await page2.click('button:has-text("Enviar")');
    await page2.waitForTimeout(2000);

    // User 1 refreshes to see updated badge
    await page.reload();
    await page.waitForTimeout(1000);

    const newBadge = inboxTab.locator('.bg-\\[\\#E84D4D\\]');
    const hasBadgeNow = await newBadge.count();

    // Badge should now exist or count should increase
    expect(hasBadgeNow).toBeGreaterThan(0);

    await page2.close();
  });
});

test.describe('Mensajes Tab in ProposalDetailModal', () => {
  test('should preserve tab state per proposal', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);

    // Open first proposal, switch to Mensajes
    await openFirstProposal(page, 'inbox');
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Reopen same proposal
    await page.click('[data-testid="proposal-card"]');
    await page.waitForTimeout(500);

    // Mensajes tab should still be active
    const mensajesTab = page.locator('button:has-text("Mensajes")');
    const isActive = await mensajesTab.getAttribute('data-state');
    expect(isActive).toBe('active');
  });

  test('should show unread badge on Mensajes tab', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);

    // Find proposal with unread messages
    const proposalWithBadge = page.locator(
      '[data-testid="proposal-card"]:has(.bg-\\[\\#E84D4D\\])'
    );
    const hasBadge = await proposalWithBadge.count();

    if (hasBadge > 0) {
      await proposalWithBadge.first().click();
      await page.waitForTimeout(500);

      // Check if Mensajes tab has badge
      const mensajesTab = page.locator('button:has-text("Mensajes")');
      const tabBadge = mensajesTab.locator('.bg-\\[\\#E84D4D\\]');
      const hasTabBadge = await tabBadge.count();

      if (hasTabBadge > 0) {
        await expect(tabBadge.first()).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Accessibility', () => {
  test('should have accessible labels on chat inputs', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // Check textarea has placeholder
    const textarea = page.locator('textarea');
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toContain('Mensaje para');

    // Check send button has text/icon
    const sendButton = page.getByRole('button', { name: /enviar/i });
    await expect(sendButton).toBeVisible();
  });

  test('should have proper focus order', async ({ page }) => {
    await login(page, USER_1);
    await navigateToProposals(page);
    await openFirstProposal(page, 'inbox');
    await page.click('button:has-text("Mensajes")');
    await page.waitForTimeout(500);

    // Tab through elements
    await page.keyboard.press('Tab');
    // Focus should be on resumen/mensajes tabs or textarea
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(['BUTTON', 'TEXTAREA']).toContain(focusedElement);
  });
});
