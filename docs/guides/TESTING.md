# Testing Guide

This document explains how to run and write tests for the CambioCromos application.

## Testing Stack

- **Framework**: [Playwright](https://playwright.dev/) - End-to-end testing
- **Test Runner**: Playwright Test Runner
- **Browsers**: Chromium, Firefox, WebKit (configurable)

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode

Interactive mode with visual test execution:

```bash
npm run test:e2e:ui
```

### Run Specific Test File

```bash
npx playwright test tests/mi-coleccion-images.spec.ts
```

### Run Tests in Headed Mode

See the browser while tests run:

```bash
npx playwright test --headed
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

## Test Reports

### Generate HTML Report

```bash
npm run test:e2e:report
```

This will open an HTML report in your browser showing:
- Test results
- Screenshots on failure
- Execution traces
- Performance metrics

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform action', async ({ page }) => {
    // Arrange
    const element = page.locator('[data-testid="my-element"]');

    // Act
    await element.click();

    // Assert
    await expect(element).toHaveText('Expected Text');
  });
});
```

### Best Practices

1. **Use data-testid for selectors**
   ```typescript
   // Good
   await page.locator('[data-testid="submit-button"]').click();

   // Avoid
   await page.locator('.btn-primary').click();
   ```

2. **Wait for elements properly**
   ```typescript
   // Wait for element to be visible
   await expect(page.locator('[data-testid="result"]')).toBeVisible();

   // Wait for navigation
   await page.waitForURL('/dashboard');
   ```

3. **Use descriptive test names**
   ```typescript
   // Good
   test('should display error message when form is submitted without required fields', async ({ page }) => {
     // ...
   });

   // Avoid
   test('form test', async ({ page }) => {
     // ...
   });
   ```

4. **Clean up test data**
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clean up any test data created
     // Reset application state if needed
   });
   ```

## Test Configuration

Configuration is stored in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

### Key Configuration Options

- **testDir**: Directory containing test files
- **fullyParallel**: Run tests in parallel
- **retries**: Number of retries on failure
- **workers**: Number of parallel workers
- **baseURL**: Base URL for the application
- **trace**: When to capture execution traces

## Testing Patterns

### Authentication Tests

```typescript
test('should login with valid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

### Form Submission Tests

```typescript
test('should submit form with valid data', async ({ page }) => {
  await page.goto('/create-listing');

  await page.fill('[name="title"]', 'Test Listing');
  await page.fill('[name="description"]', 'Test description');
  await page.click('[type="submit"]');

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### API Response Tests

```typescript
test('should load data from API', async ({ page }) => {
  await page.goto('/marketplace');

  // Wait for API response
  const response = await page.waitForResponse(
    resp => resp.url().includes('/api/listings') && resp.status() === 200
  );

  expect(response.ok()).toBeTruthy();

  // Verify data is displayed
  await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Manual workflow dispatch

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### 1. View Screenshots

Failed tests automatically capture screenshots:

```
test-results/
  feature-name-should-perform-action/
    test-failed-1.png
```

### 2. View Traces

Enable tracing to see step-by-step execution:

```bash
npx playwright show-trace test-results/trace.zip
```

### 3. Use Debug Mode

```bash
npx playwright test --debug
```

This opens the Playwright Inspector where you can:
- Step through tests
- Inspect selectors
- View console logs
- See network requests

## Test Coverage

### Current Test Files

- `tests/mi-coleccion-images.spec.ts` - Collection image management tests

### Areas Needing Tests

- [ ] Marketplace listing creation
- [ ] Template creation wizard
- [ ] User authentication flow
- [ ] Profile management
- [ ] Search functionality
- [ ] Notification system

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check for timing issues (add proper waits)
- Verify environment variables
- Check for browser-specific issues

### Flaky Tests

- Add explicit waits: `await page.waitForSelector('[data-testid="element"]')`
- Use `expect().toBeVisible()` instead of checking DOM directly
- Increase timeout for slow operations

### Browser Not Found

```bash
npx playwright install
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

---

**Last Updated**: 2025-01-22
