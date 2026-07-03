import { test, expect } from '@playwright/test';

test('verify production website navigation and ads', async ({ page }) => {
  // 1. Visit homepage or login page
  console.log('Navigating to login page...');
  await page.goto('https://www.cambiocromos.com/login');

  // 2. Perform login
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'dsalva@gmail.com');
  await page.fill('input[type="password"]', 'test12345');
  await page.click('button[type="submit"]');

  // 3. Wait for post-login navigation (should redirect to dashboard, marketplace or collection)
  console.log('Waiting for login redirect...');
  await page.waitForURL(/\/(marketplace|mi-coleccion|profile|dashboard|$)/, {
    timeout: 25000,
  });
  console.log('Logged in successfully, redirected to:', page.url());

  // 4. Verify Marketplace Page
  console.log('Navigating to Marketplace...');
  await page.goto('https://www.cambiocromos.com/marketplace');
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForTimeout(3000); // Wait for ads / dynamic content to settle
  await page.screenshot({
    path: 'C:/Users/dsalv/.gemini/antigravity/brain/54438039-fabc-4c2d-b5c6-bdad8d25c26c/marketplace.png',
    fullPage: false,
  });
  console.log('Marketplace screenshot saved.');

  // 5. Verify Matches page
  console.log('Navigating to Matches/Intercambios...');
  await page.goto('https://www.cambiocromos.com/intercambios/buscar');
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'C:/Users/dsalv/.gemini/antigravity/brain/54438039-fabc-4c2d-b5c6-bdad8d25c26c/matches.png',
    fullPage: false,
  });
  console.log('Matches screenshot saved.');

  // 6. Verify Chats page
  console.log('Navigating to Chats...');
  await page.goto('https://www.cambiocromos.com/chats');
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'C:/Users/dsalv/.gemini/antigravity/brain/54438039-fabc-4c2d-b5c6-bdad8d25c26c/chats.png',
    fullPage: false,
  });
  console.log('Chats screenshot saved.');

  // 7. Verify Albumes page
  console.log('Navigating to Mis Plantillas...');
  await page.goto('https://www.cambiocromos.com/mis-plantillas');
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'C:/Users/dsalv/.gemini/antigravity/brain/54438039-fabc-4c2d-b5c6-bdad8d25c26c/plantillas.png',
    fullPage: false,
  });
  console.log('Mis Plantillas screenshot saved.');

  console.log('All production pages checked successfully.');
});
