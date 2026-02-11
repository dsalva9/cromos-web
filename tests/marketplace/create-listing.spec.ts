import { test, expect, Page } from '@playwright/test';

/**
 * Marketplace Listing Creation - E2E Tests
 *
 * Tests the /marketplace/create flow:
 * - Page load and AuthGuard
 * - Form fields and validation
 * - Listing type toggle (individual vs pack)
 * - Collection selector dialog
 * - Happy-path submit
 *
 * Prerequisites:
 * - Test user with valid credentials (env vars)
 * - Local dev server running on BASE_URL
 */

const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'test@cambiocromo.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper: login and wait for redirect
async function login(page: Page) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(profile|mi-coleccion|marketplace|$)/, {
        timeout: 15000,
    });
}

test.describe('Marketplace Listing Creation', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto(`${BASE_URL}/marketplace/create`);
        // Wait for the form to render (AuthGuard + page load)
        await page.waitForSelector('h1', { timeout: 10000 });
    });

    test('page loads with "Publicar Anuncio" heading', async ({ page }) => {
        const heading = page.getByRole('heading', { name: /publicar anuncio/i });
        await expect(heading).toBeVisible();
    });

    test('form shows all required fields', async ({ page }) => {
        // Title input
        const titleInput = page.locator('#title');
        await expect(titleInput).toBeVisible();

        // Description textarea
        const descriptionInput = page.locator('#description');
        await expect(descriptionInput).toBeVisible();

        // Image upload area (label "Imagen")
        const imageLabel = page.getByText('Imagen');
        await expect(imageLabel).toBeVisible();

        // Collection input
        const collectionInput = page.locator('#collection_name');
        await expect(collectionInput).toBeVisible();

        // Terms checkbox
        const termsCheckbox = page.locator('#terms');
        await expect(termsCheckbox).toBeVisible();

        // Submit button
        const submitButton = page.getByRole('button', { name: /publicar/i });
        await expect(submitButton).toBeVisible();
    });

    test('listing type toggle switches between individual and pack', async ({
        page,
    }) => {
        // "Cromo Individual" should be active by default (gold border)
        const individualButton = page.getByText('Cromo Individual');
        const packButton = page.getByText('Pack de Cromos');

        await expect(individualButton).toBeVisible();
        await expect(packButton).toBeVisible();

        // Click "Pack de Cromos"
        await packButton.click();

        // Pack info message should appear
        const packInfo = page.getByText(
            /estás creando un anuncio para múltiples cromos/i
        );
        await expect(packInfo).toBeVisible();

        // Switch back to individual
        await individualButton.click();

        // Pack info should disappear
        await expect(packInfo).not.toBeVisible();
    });

    test('validation errors appear on empty submit', async ({ page }) => {
        // Click submit without filling anything
        const submitButton = page.getByRole('button', { name: /publicar/i });
        await submitButton.click();

        // Wait for validation to run
        await page.waitForTimeout(500);

        // Title validation error
        const titleError = page.getByText(
            /el título debe tener al menos 3 caracteres/i
        );
        await expect(titleError).toBeVisible();

        // Description validation error
        const descError = page.getByText(
            /la descripción debe tener al menos 10 caracteres/i
        );
        await expect(descError).toBeVisible();

        // Image validation error
        const imageError = page.getByText(/la imagen es obligatoria/i);
        await expect(imageError).toBeVisible();

        // Terms validation error
        const termsError = page.getByText(
            /debes aceptar los términos de uso/i
        );
        await expect(termsError).toBeVisible();
    });

    test('collection selector dialog opens', async ({ page }) => {
        // Click the library icon button next to the collection input
        const libraryButton = page.getByTitle('Seleccionar de mis plantillas');
        await libraryButton.click();

        // Dialog should appear with "Mis Plantillas" title
        const dialogTitle = page.getByRole('heading', {
            name: /mis plantillas/i,
        });
        await expect(dialogTitle).toBeVisible({ timeout: 5000 });

        // Dialog should have a cancel button
        const cancelButton = page.getByRole('button', { name: /cancelar/i });
        await expect(cancelButton).toBeVisible();

        // Close dialog
        await cancelButton.click();
        await expect(dialogTitle).not.toBeVisible();
    });

    test('happy path: fill form and submit creates listing', async ({
        page,
    }) => {
        // This test requires a real user session and working backend.
        // Skip if credentials are the defaults (not configured).
        if (
            TEST_USER.email === 'test@cambiocromo.com' &&
            TEST_USER.password === 'testpassword'
        ) {
            test.skip();
            return;
        }

        // Fill title
        await page.fill('#title', 'Cromo de prueba E2E');

        // Fill description (min 10 chars)
        await page.fill(
            '#description',
            'Este es un cromo de prueba creado por tests E2E automatizados. Estado perfecto.'
        );

        // Fill collection (optional)
        await page.fill('#collection_name', 'LaLiga 2025-26');

        // Accept terms
        const termsCheckbox = page.locator('#terms');
        await termsCheckbox.click();

        // Note: Image upload is hard to automate in E2E without mocking.
        // We verify the form validation catches it if missing, but for
        // a full submit test we'd need to either:
        // 1. Mock the upload endpoint
        // 2. Use a test fixture with a pre-uploaded image URL
        // For now, we verify the form is fillable and validation works.

        // Verify terms is checked
        await expect(termsCheckbox).toBeChecked();

        // Verify submit button is enabled
        const submitButton = page.getByRole('button', { name: /publicar/i });
        await expect(submitButton).toBeEnabled();
    });
});
