import { test, expect, devices } from '@playwright/test';
import * as path from 'path';

test.use({
  ...devices['iPhone 12'],
});

test('Marketplace Mobile UX Optimization checks', async ({ page }) => {
  const artifactDir = 'C:/Users/dsalv/.gemini/antigravity/brain/269f72cd-84a5-420a-841e-eb64a1d37bf3';
  
  // 1. Go to login page
  console.log('Navigating to login page...');
  await page.goto('https://www.cambiocromos.com/login');
  
  // 2. Fill login form
  console.log('Logging in...');
  await page.fill('#email', 'dsalva@gmail.com');
  await page.fill('#password', 'test12345');
  await page.click('button[type="submit"]');
  
  // 3. Wait for redirect
  console.log('Waiting for authentication redirect...');
  await page.waitForURL(/\/(marketplace|profile|mi-coleccion|$)/, { timeout: 20000 });
  
  // 4. Go to marketplace
  console.log('Navigating to marketplace page...');
  await page.goto('https://www.cambiocromos.com/marketplace');
  await page.waitForLoadState('networkidle');
  
  // Ensure some marketplace items are rendered
  const listingCard = page.locator('article, div.group').first();
  await expect(listingCard).toBeVisible({ timeout: 15000 });
  
  // 5. Verify yellow button 'VIEW DETAILS / VER DETALLE' is hidden on mobile
  console.log('Checking that VIEW DETAILS buttons are hidden...');
  const viewDetailsButton = page.locator('button:has-text("VER DETALLE"), button:has-text("VIEW DETAILS"), button:has-text("Ver Detalles"), button:has-text("Ver detalle")');
  
  // Check count of visible details buttons
  const count = await viewDetailsButton.count();
  for (let i = 0; i < count; i++) {
    await expect(viewDetailsButton.nth(i)).not.toBeVisible();
  }
  console.log('Successfully confirmed VIEW DETAILS buttons are not visible on mobile.');

  // Take initial screenshot
  const initialScreenshotPath = path.join(artifactDir, '01_initial_mobile.png');
  await page.screenshot({ path: initialScreenshotPath });
  console.log(`Saved screenshot to: ${initialScreenshotPath}`);
  
  // Get header and search bar initial states
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  
  const searchBar = page.locator('div.sticky').first();
  await expect(searchBar).toBeVisible();
  
  // 6. Scroll down to trigger hide
  console.log('Scrolling down...');
  await page.evaluate(() => {
    window.scrollTo(0, 400);
  });
  await page.waitForTimeout(1000); // Wait for transition
  
  // Take scrolled down screenshot
  const scrolledDownScreenshotPath = path.join(artifactDir, '02_scrolled_down.png');
  await page.screenshot({ path: scrolledDownScreenshotPath });
  console.log(`Saved screenshot to: ${scrolledDownScreenshotPath}`);
  
  // Verify header is translated offscreen (y < 0 or class contains -translate-y-full)
  const headerClass = await header.getAttribute('class');
  console.log('Header class after scroll down:', headerClass);
  expect(headerClass).toContain('-translate-y-full');
  
  const searchBarClass = await searchBar.getAttribute('class');
  console.log('Search Bar class after scroll down:', searchBarClass);
  expect(searchBarClass).toContain('-translate-y-[');
  
  // 7. Scroll up to trigger show
  console.log('Scrolling up...');
  await page.evaluate(() => {
    window.scrollTo(0, 100);
  });
  await page.waitForTimeout(1000); // Wait for transition
  
  // Take scrolled up screenshot
  const scrolledUpScreenshotPath = path.join(artifactDir, '03_scrolled_up.png');
  await page.screenshot({ path: scrolledUpScreenshotPath });
  console.log(`Saved screenshot to: ${scrolledUpScreenshotPath}`);
  
  // Verify header and search bar are back in position (class doesn't have -translate-y-full)
  const headerClassUp = await header.getAttribute('class');
  expect(headerClassUp).toContain('translate-y-0');
  expect(headerClassUp).not.toContain('-translate-y-full');
  
  const searchBarClassUp = await searchBar.getAttribute('class');
  expect(searchBarClassUp).toContain('translate-y-0');
  
  // Ensure bottom navbar remains fixed and visible
  const bottomNav = page.locator('nav').last();
  await expect(bottomNav).toBeVisible();
  
  console.log('All automated checks passed successfully!');
});
