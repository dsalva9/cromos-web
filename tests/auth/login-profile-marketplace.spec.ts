import { test, expect, Page } from '@playwright/test';

/**
 * Login → Profile Completion → Marketplace Redirect - E2E Tests
 *
 * Tests the onboarding journey:
 * - Login page rendering and validation
 * - Profile completion page fields and validation
 * - End-to-end flow: login → complete profile → redirect
 *
 * Prerequisites:
 * - Test user with valid credentials (env vars)
 * - Optionally: test user with incomplete profile
 * - Local dev server running on BASE_URL
 */

const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'test@cambiocromo.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword',
};

// User with incomplete profile (no nickname/postcode/avatar set)
const INCOMPLETE_USER = {
    email: process.env.TEST_INCOMPLETE_USER_EMAIL || '',
    password: process.env.TEST_INCOMPLETE_USER_PASSWORD || '',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper: login with given credentials
async function login(
    page: Page,
    user: { email: string; password: string }
) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
}

test.describe('Login Page', () => {
    test('renders login form with all elements', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Page heading
        const heading = page.getByRole('heading', {
            name: /iniciar sesión/i,
        });
        await expect(heading).toBeVisible();

        // Email and password inputs
        const emailInput = page.locator('#email');
        await expect(emailInput).toBeVisible();

        const passwordInput = page.locator('#password');
        await expect(passwordInput).toBeVisible();

        // Submit button
        const submitButton = page.getByRole('button', {
            name: /iniciar sesión/i,
        });
        await expect(submitButton).toBeVisible();

        // Google login button
        const googleButton = page.getByRole('button', {
            name: /continuar con google/i,
        });
        await expect(googleButton).toBeVisible();

        // Signup link
        const signupLink = page.getByRole('link', { name: /crear cuenta/i });
        await expect(signupLink).toBeVisible();

        // Forgot password link
        const forgotLink = page.getByRole('link', {
            name: /olvidaste tu contraseña/i,
        });
        await expect(forgotLink).toBeVisible();
    });

    test('shows error message for invalid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        await page.fill('#email', 'invalid@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message to appear
        const errorBox = page.locator('.bg-\\[\\#E84D4D\\]');
        await expect(errorBox).toBeVisible({ timeout: 10000 });

        // Error should contain contact info
        await expect(
            page.getByText(/soporte@cambiocromos.com/)
        ).toBeVisible();
    });

    test('successful login redirects authenticated user', async ({
        page,
    }) => {
        // Skip if using default credentials
        if (
            TEST_USER.email === 'test@cambiocromo.com' &&
            TEST_USER.password === 'testpassword'
        ) {
            test.skip();
            return;
        }

        await login(page, TEST_USER);

        // Should redirect away from /login to either home, profile, or collection
        await page.waitForURL(/\/(profile|mi-coleccion|$)/, {
            timeout: 15000,
        });
        expect(page.url()).not.toContain('/login');
    });
});

test.describe('Profile Completion Page', () => {
    test.beforeEach(async ({ page }) => {
        // Skip if using default credentials
        if (
            TEST_USER.email === 'test@cambiocromo.com' &&
            TEST_USER.password === 'testpassword'
        ) {
            test.skip();
            return;
        }

        await login(page, TEST_USER);
        await page.waitForURL(/\/(profile|mi-coleccion|$)/, {
            timeout: 15000,
        });
        // Navigate directly to profile completion page
        await page.goto(`${BASE_URL}/profile/completar`);
        await page.waitForSelector('h1', { timeout: 10000 });
    });

    test('page has required form fields', async ({ page }) => {
        // Heading
        const heading = page.getByRole('heading', {
            name: /completa tu perfil/i,
        });
        await expect(heading).toBeVisible();

        // Info text
        await expect(
            page.getByText(/necesitamos algunos datos básicos/i)
        ).toBeVisible();

        // Nickname input
        const nicknameInput = page.locator('#nickname');
        await expect(nicknameInput).toBeVisible();

        // Postcode input
        const postcodeInput = page.locator('#postcode');
        await expect(postcodeInput).toBeVisible();

        // Avatar label
        const avatarLabel = page.getByText('Avatar');
        await expect(avatarLabel).toBeVisible();

        // Save button
        const saveButton = page.getByRole('button', {
            name: /guardar y continuar/i,
        });
        await expect(saveButton).toBeVisible();
    });

    test('validation: empty nickname shows error', async ({ page }) => {
        // Clear nickname field
        await page.fill('#nickname', '');
        await page.fill('#postcode', '28001');

        // Click save
        const saveButton = page.getByRole('button', {
            name: /guardar y continuar/i,
        });
        await saveButton.click();
        await page.waitForTimeout(500);

        // Should show error about nickname being required
        const error = page.getByText(/el campo usuario es obligatorio/i);
        await expect(error).toBeVisible();
    });

    test('validation: invalid postcode shows error', async ({ page }) => {
        await page.fill('#nickname', 'TestUser');
        await page.fill('#postcode', 'abc');

        const saveButton = page.getByRole('button', {
            name: /guardar y continuar/i,
        });
        await saveButton.click();
        await page.waitForTimeout(500);

        // Should show postcode validation error
        const error = page.getByText(
            /introduce un código postal válido/i
        );
        await expect(error).toBeVisible();
    });

    test('validation: "Sin nombre" nickname is rejected', async ({
        page,
    }) => {
        await page.fill('#nickname', 'Sin nombre');
        await page.fill('#postcode', '28001');

        const saveButton = page.getByRole('button', {
            name: /guardar y continuar/i,
        });
        await saveButton.click();
        await page.waitForTimeout(500);

        const error = page.getByText(
            /elige un usuario distinto a "sin nombre"/i
        );
        await expect(error).toBeVisible();
    });
});

test.describe('Login → Profile Completion → Redirect Flow', () => {
    test('incomplete user is redirected to profile completion after login', async ({
        page,
    }) => {
        // This test requires a user with an incomplete profile
        if (!INCOMPLETE_USER.email || !INCOMPLETE_USER.password) {
            test.skip();
            return;
        }

        await login(page, INCOMPLETE_USER);

        // Should redirect to /profile/completar
        await page.waitForURL(/\/profile\/completar/, { timeout: 15000 });
        expect(page.url()).toContain('/profile/completar');

        // Profile completion page should be showing
        const heading = page.getByRole('heading', {
            name: /completa tu perfil/i,
        });
        await expect(heading).toBeVisible();
    });
});
