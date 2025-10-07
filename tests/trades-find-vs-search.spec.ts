import { test, expect } from '@playwright/test';

/**
 * v1.4.3 - Trades Find vs Search Tests
 *
 * Verifies the simplified /trades/find (active collection only)
 * and the advanced /trades/search (full filters) pages work correctly.
 */

test.describe('Trades Find vs Search', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Setup authenticated user with active collection
    // await page.goto('/login');
    // await login(page, 'testuser@example.com', 'password');
  });

  test('Find page shows minimal UI with "Búsqueda avanzada" button', async ({ page }) => {
    await page.goto('/trades/find');

    // Verify title
    await expect(page.getByRole('heading', { name: /intercambios/i })).toBeVisible();

    // Verify description mentions active collection
    await expect(page.getByText(/colección activa/i)).toBeVisible();

    // Verify "Búsqueda avanzada" button exists
    const advancedButton = page.getByRole('link', { name: /búsqueda avanzada/i });
    await expect(advancedButton).toBeVisible();

    // Verify filters are NOT visible (no collection dropdown, no player search, no advanced accordion)
    await expect(page.getByLabel(/colección/i)).not.toBeVisible();
    await expect(page.getByPlaceholder(/nombre del jugador/i)).not.toBeVisible();
    await expect(page.getByText(/filtros avanzados/i)).not.toBeVisible();
  });

  test('Clicking "Búsqueda avanzada" navigates to /trades/search', async ({ page }) => {
    await page.goto('/trades/find');

    const advancedButton = page.getByRole('link', { name: /búsqueda avanzada/i });
    await advancedButton.click();

    await expect(page).toHaveURL(/\/trades\/search/);
  });

  test('Search page shows full filter controls', async ({ page }) => {
    await page.goto('/trades/search');

    // Verify title
    await expect(page.getByRole('heading', { name: /búsqueda avanzada/i })).toBeVisible();

    // Verify tip text
    await expect(page.getByText(/en 'intercambios' verás atajos/i)).toBeVisible();

    // Verify "Volver a Intercambios" link
    const backLink = page.getByRole('link', { name: /volver a intercambios/i });
    await expect(backLink).toBeVisible();

    // Verify all filter controls are visible
    await expect(page.getByLabel(/colección/i)).toBeVisible();
    await expect(page.getByPlaceholder(/nombre del jugador/i)).toBeVisible();

    // Expand advanced filters
    const advancedToggle = page.getByRole('button', { name: /filtros avanzados/i });
    await advancedToggle.click();

    await expect(page.getByLabel(/rareza/i)).toBeVisible();
    await expect(page.getByPlaceholder(/nombre del equipo/i)).toBeVisible();
    await expect(page.getByText(/coincidencias mínimas/i)).toBeVisible();
  });

  test('Clicking "Volver a Intercambios" navigates back to /trades/find', async ({ page }) => {
    await page.goto('/trades/search');

    const backLink = page.getByRole('link', { name: /volver a intercambios/i });
    await backLink.click();

    await expect(page).toHaveURL(/\/trades\/find/);
  });

  test('Filter badges appear and are removable in search page', async ({ page }) => {
    await page.goto('/trades/search');

    // Type in player search
    const playerInput = page.getByPlaceholder(/nombre del jugador/i);
    await playerInput.fill('Messi');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Verify badge appears
    const badge = page.getByText(/jugador: messi/i);
    await expect(badge).toBeVisible();

    // Click remove button on badge
    const removeButton = badge.locator('button[aria-label*="jugador"]');
    await removeButton.click();

    // Verify badge is gone
    await expect(badge).not.toBeVisible();
  });

  test('Find page uses active collection (no manual selection)', async ({ page }) => {
    // TODO: Mock fixture with active collection
    await page.goto('/trades/find');

    // Verify no collection dropdown
    await expect(page.getByLabel(/colección/i)).not.toBeVisible();

    // Verify results load for active collection
    // (requires mocking find_mutual_traders RPC or test database)
    // await expect(page.getByText(/intercambios encontrados/i)).toBeVisible();
  });
});
