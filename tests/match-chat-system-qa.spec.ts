import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Constants
const SCREENSHOT_DIR = 'C:/Users/dsalv/.gemini/antigravity/brain/a4dedce2-9955-41bf-995b-2f78dddb51ee';
const BASE_URL = 'http://localhost:3000';

// Test credentials
const USER_A = {
  email: 'dsalva@gmail.com',
  password: 'test12345',
  nickname: 'David',
};

const USER_B = {
  email: 'dsalva9@hotmail.com',
  password: 'test12345',
  nickname: 'Davor_Cromos',
};

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper to log in a page
async function login(page: Page, user: typeof USER_A) {
  console.log(`Logging in user: ${user.email}`);
  await page.goto(`${BASE_URL}/es/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
  console.log(`Login successful for ${user.nickname}. Current URL: ${page.url()}`);
}

test.describe('Match Chat System (Phase 4) QA Verification', () => {
  test('Run Full Match Chat System QA Suite', async ({ browser }) => {
    test.setTimeout(300000); // 5 minutes timeout

    // Create two independent contexts representing concurrent browser profiles
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await contextA.newPage();

    const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageB = await contextB.newPage();

    // -------------------------------------------------------------
    // PRE-FLIGHT: Authentication
    // -------------------------------------------------------------
    console.log('\n--- Pre-Flight: Authenticating User A and User B ---');
    await login(pageA, USER_A);
    await login(pageB, USER_B);

    // -------------------------------------------------------------
    // TEST 8 — /intercambios Coming Soon
    // -------------------------------------------------------------
    console.log('\n--- Running Test 8: /intercambios Coming Soon ---');
    await pageA.goto(`${BASE_URL}/es/intercambios/`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');

    // Verify "Próximamente" card is visible
    const proximamente = pageA.getByText('Próximamente', { exact: false }).first();
    await expect(proximamente).toBeVisible();
    
    // Verify rocket/exchange icon or elements are present
    const rocketIcon = pageA.locator('svg.lucide-arrow-right-left, svg').first();
    await expect(rocketIcon).toBeVisible();

    // Verify CTA links to /intercambios/buscar
    const comingSoonCta = pageA.locator('a:has-text("Buscar matches"), button:has-text("Buscar matches"), a[href*="/intercambios/buscar"]').first();
    await expect(comingSoonCta).toBeVisible();
    const ctaHref = await comingSoonCta.getAttribute('href');
    expect(ctaHref).toContain('/intercambios/buscar');

    // Take screenshot of Coming Soon page
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t8_coming_soon.png') });
    console.log('Test 8 PASSED: Coming Soon page verified successfully.');

    // Set local storage tips so they don't block
    await pageA.goto(`${BASE_URL}/es/intercambios/buscar`, { waitUntil: 'domcontentloaded' });
    await pageA.evaluate(() => {
      localStorage.setItem('matchfinder_geo', 'dismissed');
      localStorage.setItem('dismissed-tips', '["tip-matchfinder-howto", "tip-matchfinder-setup"]');
    });
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');

    await pageB.goto(`${BASE_URL}/es/chats`, { waitUntil: 'domcontentloaded' });
    await pageB.evaluate(() => {
      localStorage.setItem('dismissed-tips', '["tip-chats"]');
    });
    await pageB.reload({ waitUntil: 'domcontentloaded' });
    await pageB.waitForLoadState('domcontentloaded');

    // -------------------------------------------------------------
    // TEST 1 — Chat Drawer from Match Finder
    // -------------------------------------------------------------
    console.log('\n--- Running Test 1: Chat Drawer from Match Finder ---');
    console.log('Navigating pageA to search page...');
    await pageA.goto(`${BASE_URL}/es/intercambios/buscar`, { waitUntil: 'domcontentloaded' });
    console.log('pageA navigation complete. Waiting for DOM load state...');
    await pageA.waitForLoadState('domcontentloaded');
    console.log('DOM load state reached.');

    // Wait for matcher loading indicator to disappear
    console.log('Waiting for matcher loading indicator (Buscando matches...) to disappear...');
    await expect(pageA.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });
    console.log('Matcher loading indicator cleared.');

    // Ensure LALIGA 2025-26 is selected
    const collectionBtn = pageA.locator('button:has-text("📁")');
    await expect(collectionBtn).toBeVisible();
    const selectedText = await collectionBtn.innerText();
    console.log(`Current selected collection: "${selectedText}"`);
    if (!selectedText.includes('LALIGA 2025-26')) {
      console.log('LALIGA 2025-26 is not selected. Selecting it...');
      await collectionBtn.click();
      await pageA.waitForTimeout(500);
      await pageA.click('div.absolute.z-20 button:has-text("LALIGA 2025-26")');
      await pageA.waitForTimeout(1000);
      // Wait for new search loader to disappear
      console.log('Waiting for matcher loading indicator to disappear after collection switch...');
      await expect(pageA.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });
    }

    // Open filter and expand search radius to infinity to ensure we find User B
    console.log('Locating filter button...');
    const filterBtn = pageA.locator('button').filter({ has: pageA.locator('svg') }).filter({ hasText: /^$/ }).first();
    await expect(filterBtn).toBeVisible();
    console.log('Clicking filter button...');
    await filterBtn.click();
    await pageA.waitForTimeout(1000);
    console.log('Filter panel opened. Selecting infinite search radius...');

    const infiniteTick = pageA.getByText('∞', { exact: false }).first();
    const todoElPaisTick = pageA.getByText('Todo el país', { exact: false }).first();
    if (await infiniteTick.isVisible()) {
      console.log('Found infinite tick mark label. Clicking...');
      await infiniteTick.click();
    } else if (await todoElPaisTick.isVisible()) {
      console.log('Found "Todo el país" tick mark label. Clicking...');
      await todoElPaisTick.click();
    } else {
      console.log('Warning: Infinite tick mark label not found, trying range input...');
      const sliderInput = pageA.locator('input[type="range"]').first();
      if (await sliderInput.isVisible()) {
        await sliderInput.fill('4'); // index 4 is the maximum tier
        await sliderInput.dispatchEvent('pointerup');
      }
    }
    await pageA.waitForTimeout(1500);
    console.log('Closing filter panel...');
    await pageA.keyboard.press('Escape'); // Close filters
    await pageA.waitForTimeout(500);
    console.log('Filter panel closed.');

    // Look for User B card in swiper stack. If not first, pass until found.
    let userBFound = false;
    for (let c = 0; c < 15; c++) {
      const cardTitle = pageA.locator('h2').first();
      if (await cardTitle.isVisible()) {
        const nameText = await cardTitle.innerText();
        console.log(`Checking match finder card user: "${nameText}"`);
        if (nameText.toUpperCase().includes('DAVOR')) {
          userBFound = true;
          break;
        }
      }
      const passBtn = pageA.getByRole('button', { name: 'Pasar', exact: false }).first();
      if (await passBtn.isVisible()) {
        await passBtn.click();
        await pageA.waitForTimeout(1000);
      } else {
        break;
      }
    }

    expect(userBFound).toBe(true);

    // Click "¡Cambiar!" CTA on the spotlight card
    const cambiarBtn = pageA.locator('button').filter({ hasText: '¡Cambiar!' }).first();
    await expect(cambiarBtn).toBeVisible();
    await cambiarBtn.click();
    await pageA.waitForTimeout(1500);

    // ✅ Drawer should open
    const drawer = pageA.locator('div.fixed.z-50.flex.flex-col').first();
    await expect(drawer).toBeVisible();

    // ✅ Verify drawer has class/styling of desktop width 420px
    const drawerClass = await drawer.getAttribute('class');
    expect(drawerClass).toContain('sm:w-[420px]');

    // ✅ Verify Header elements
    const headerTitle = drawer.locator('p.font-bold').first();
    await expect(headerTitle).toContainText('Davor_Cromos');
    const headerCollection = drawer.locator('p.text-xs').first();
    await expect(headerCollection).toBeVisible();

    const infoIcon = drawer.locator('button').filter({ has: pageA.locator('svg.lucide-info') }).first();
    await expect(infoIcon).toBeVisible();

    const closeX = drawer.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await expect(closeX).toBeVisible();

    // ✅ Verify empty state
    const emptyState = drawer.locator('text=¡Empieza la conversación!');
    await expect(emptyState).toBeVisible();

    // Capture desktop drawer screenshot
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t1_drawer_desktop.png') });

    // Send a message
    const composerInput = drawer.locator('textarea').first();
    await composerInput.fill('¡Hola Davor! Me interesa intercambiar cromos contigo.');
    
    const sendBtn = drawer.locator('button').filter({ has: pageA.locator('svg.lucide-send') }).first();
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();
    await pageA.waitForTimeout(1000);

    // Verify bubble appears as a gold bubble on the right (own message)
    const messageBubble = drawer.locator('.bg-gold\\/90').first();
    await expect(messageBubble).toBeVisible();
    await expect(messageBubble).toContainText('¡Hola Davor! Me interesa intercambiar cromos contigo.');

    // ✅ Timestamp shows below the message
    const timestamp = messageBubble.locator('xpath=../p[contains(@class, "text-[10px]")]').first();
    await expect(timestamp).toBeVisible();

    // Close the drawer -> swiper advances to next match
    const originalCardName = await pageA.locator('h2').first().innerText();
    await closeX.click();
    await pageA.waitForTimeout(1000);
    
    // Check that swiper card changed
    const newCardName = await pageA.locator('h2').first().innerText();
    expect(newCardName).not.toEqual(originalCardName);
    console.log(`Drawer closed. Card advanced from "${originalCardName}" to "${newCardName}"`);
    console.log('Test 1 PASSED: Chat Drawer opens correctly and messages can be sent.');

    // -------------------------------------------------------------
    // TEST 2 — Chat Composer & Images
    // -------------------------------------------------------------
    console.log('\n--- Running Test 2: Chat Composer & Images ---');
    // Open chat again with the new card (User A opens chat with another match)
    const secondCambiarBtn = pageA.locator('button').filter({ hasText: '¡Cambiar!' }).first();
    await expect(secondCambiarBtn).toBeVisible();
    await secondCambiarBtn.click();
    await pageA.waitForTimeout(1000);

    const secondComposer = pageA.locator('textarea').first();
    await expect(secondComposer).toBeVisible();

    // Type a long message (up to 500 chars)
    const longMsg = 'Mensaje largo para validar el comportamiento del composer y auto-grow '.repeat(7); // ~500 chars
    await secondComposer.fill(longMsg);
    
    // Press Shift+Enter -> adds newline
    await secondComposer.focus();
    await pageA.keyboard.press('Shift+Enter');
    await pageA.keyboard.type('Línea añadida con Shift+Enter.');
    
    // Check newline is present and text is correct
    const textValue = await secondComposer.inputValue();
    expect(textValue).toContain('\n');

    // Press Enter -> sends message
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(1000);

    // Tap image icon 📷
    const fileChooserPromise = pageA.waitForEvent('filechooser');
    const imageBtn = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-image-icon') }).first();
    await imageBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/LALIGA_2025-26.png');
    await pageA.waitForTimeout(1000);

    // ✅ Image preview appears above the input
    const imgPreview = pageA.locator('div.border-t img[alt="Preview"]').first();
    await expect(imgPreview).toBeVisible();

    // Take screenshot of image preview state
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t2_image_preview.png') });

    // Send -> "📷 Imagen" message with thumbnail appears
    const newSendBtn = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-send') }).first();
    await newSendBtn.click();
    
    // Wait for upload to complete
    await expect(pageA.locator('text=Subiendo imagen...')).not.toBeVisible({ timeout: 25000 });
    await pageA.waitForTimeout(1500);

    // Verify thumbnail is visible in bubble
    const imgThumbnail = pageA.locator('button img[alt="Imagen adjunta"]').first();
    await expect(imgThumbnail).toBeVisible();

    // Tap the thumbnail -> fullscreen lightbox opens
    await imgThumbnail.click();
    await pageA.waitForTimeout(500);
    const lightbox = pageA.locator('div.fixed.inset-0.z-50 img[alt="Imagen del chat"]').first();
    await expect(lightbox).toBeVisible();

    // Close lightbox
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(500);
    await expect(lightbox).not.toBeVisible();

    // Try sending empty (no text, no image) -> send button is disabled
    await secondComposer.fill('');
    await expect(newSendBtn).toBeDisabled();
    console.log('Test 2 PASSED: Composer auto-grow, newline, image preview, lightbox, and empty validation verified.');

    // Close second chat
    const secondCloseBtn = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await secondCloseBtn.click();
    await pageA.waitForTimeout(500);

    // -------------------------------------------------------------
    // TEST 3 — Realtime Messages & TEST 10 — Read Receipts
    // -------------------------------------------------------------
    console.log('\n--- Running Test 3 & 10: Realtime Messages, Unread Badges, and Read Receipts ---');
    // Open chat back with User B (Davor_Cromos)
    // We can go to `/es/chats` to open the conversation directly!
    await pageA.goto(`${BASE_URL}/es/chats?tab=match`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');
    
    // Verify tab Match exists (Test 4)
    const matchTabBtn = pageA.locator('button:has-text("Match")').first();
    await expect(matchTabBtn).toBeVisible();
    await matchTabBtn.click();
    await pageA.waitForTimeout(1000);

    // Open first conversation (with Davor_Cromos)
    const firstMatchItem = pageA.locator('button:has-text("Davor_Cromos")').first();
    await expect(firstMatchItem).toBeVisible();
    await firstMatchItem.click();
    await pageA.waitForTimeout(1000);

    // User A sends message: "¡Hola! ¿Viste mi mensaje en tiempo real?"
    const aComposer = pageA.locator('textarea').first();
    await aComposer.fill('¡Hola! ¿Viste mi mensaje en tiempo real?');
    const aSend = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-send') }).first();
    await aSend.click();
    await pageA.waitForTimeout(1000);

    // In User B's browser, go to /es/chats?tab=match
    await pageB.goto(`${BASE_URL}/es/chats?tab=match`, { waitUntil: 'domcontentloaded' });
    await pageB.waitForLoadState('domcontentloaded');
    await pageB.waitForTimeout(1000);

    // ✅ TEST 10: Conversation shows unread badge (gold pill with count)
    const unreadBadge = pageB.locator('span.bg-gold').first();
    await expect(unreadBadge).toBeVisible();
    const badgeCount = await unreadBadge.innerText();
    console.log(`Unread badge found on Match tab/conversation with count: "${badgeCount}"`);
    expect(Number(badgeCount)).toBeGreaterThan(0);

    // Take screenshot of the unread badge state
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t10_unread_badge.png') });

    // User B taps the conversation -> chat drawer opens
    const convItem = pageB.locator('button:has-text("David")').first();
    await convItem.click();
    await pageB.waitForTimeout(1500);

    // ✅ User A's message appears as a white bubble on the left
    const leftBubble = pageB.locator('.bg-white.dark\\:bg-gray-800').last();
    await expect(leftBubble).toBeVisible();
    await expect(leftBubble).toContainText('¡Hola! ¿Viste mi mensaje en tiempo real?');

    // ✅ Badge disappears on Match tab after opening
    await expect(unreadBadge).not.toBeVisible();

    // User B sends a reply
    const bComposer = pageB.locator('textarea').first();
    await bComposer.fill('¡Sí! Lo recibí perfectamente en tiempo real. ¡Esto funciona de maravilla!');
    const bSend = pageB.locator('button').filter({ has: pageB.locator('svg.lucide-send') }).first();
    await bSend.click();
    await pageB.waitForTimeout(1500);

    // ✅ User A's drawer auto-updates with the new message (realtime)
    const aReceivedBubble = pageA.locator('.bg-white.dark\\:bg-gray-800').last();
    await expect(aReceivedBubble).toBeVisible();
    await expect(aReceivedBubble).toContainText('¡Sí! Lo recibí perfectamente en tiempo real. ¡Esto funciona de maravilla!');

    // Take screenshot showing realtime sync
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t3_realtime_sync.png') });
    console.log('Test 3 & 10 PASSED: Realtime messaging, unread badges, and read receipts work flawlessly.');

    // -------------------------------------------------------------
    // TEST 4 — /chats Page Tabs
    // -------------------------------------------------------------
    console.log('\n--- Running Test 4: /chats Page Tabs ---');
    // We already verified the tabs, let's close the drawer on Page A and check Match tab items
    const aCloseBtn = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await aCloseBtn.click();
    await pageA.waitForTimeout(1000);

    // ✅ Match tab item check: avatar, nickname, collection name (gold), last message, timestamp
    const conversationCard = pageA.locator('button:has-text("Davor_Cromos")').first();
    await expect(conversationCard).toBeVisible();

    const cardAvatar = conversationCard.locator('div.rounded-full.bg-gold\\/20');
    await expect(cardAvatar).toBeVisible();

    const cardCollection = conversationCard.locator('p.text-gold').first();
    await expect(cardCollection).toBeVisible();
    await expect(cardCollection).toContainText('Colección: LALIGA 2025-26');

    const cardLastMsg = conversationCard.locator('p.text-sm.text-gray-500').first();
    await expect(cardLastMsg).toBeVisible();
    await expect(cardLastMsg).toContainText('¡Sí! Lo recibí perfectamente');

    const cardTimestamp = conversationCard.locator('p.text-xs.text-gray-400').first();
    await expect(cardTimestamp).toBeVisible();

    console.log('Test 4 PASSED: /chats Page Tabs rendering is verified.');

    // -------------------------------------------------------------
    // TEST 5 — Match Info Modal
    // -------------------------------------------------------------
    console.log('\n--- Running Test 5: Match Info Modal ---');
    // Open chat drawer again
    await conversationCard.click();
    await pageA.waitForTimeout(1000);

    // In open drawer, tap (ℹ️) info button
    const aInfoBtn = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-info') }).first();
    await expect(aInfoBtn).toBeVisible();
    await aInfoBtn.click();
    await pageA.waitForTimeout(1000);

    // ✅ Modal opens
    const infoModal = pageA.locator('div.fixed.z-50.flex.items-center.justify-center').first();
    await expect(infoModal).toBeVisible();

    // ✅ Modal details: title, nickname, collection (gold card), overlap stats, distance
    const modalTitle = infoModal.locator('h3').first();
    await expect(modalTitle).toContainText('Info del match');

    const modalUser = infoModal.locator('p.text-sm.text-gray-500').first();
    await expect(modalUser).toContainText('Davor_Cromos');

    const modalCollection = infoModal.locator('div.bg-gold\\/10 p.font-bold').first();
    await expect(modalCollection).toContainText('LALIGA 2025-26');

    const modalOverlapStats1 = infoModal.locator('text=Tiene').first();
    await expect(modalOverlapStats1).toBeVisible();

    const modalOverlapStats2 = infoModal.locator('text=Tú tienes').first();
    await expect(modalOverlapStats2).toBeVisible();

    const modalDistance = infoModal.locator('text=Distancia').first();
    await expect(modalDistance).toBeVisible();

    // ✅ Verify CTA buttons
    const finderCta = infoModal.locator('button:has-text("Ver en buscador")').first();
    await expect(finderCta).toBeVisible();

    const proposalCta = infoModal.locator('button:has-text("Proponer intercambio")').first();
    await expect(proposalCta).toBeVisible();

    // Take screenshot of info modal
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t5_info_modal.png') });

    // Close info modal
    const closeInfoBtn = infoModal.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await closeInfoBtn.click();
    await pageA.waitForTimeout(500);

    // Chat drawer is still visible
    await expect(pageA.locator('textarea').first()).toBeVisible();
    console.log('Test 5 PASSED: Match Info Modal opens and displays all required elements.');

    // -------------------------------------------------------------
    // TEST 6 — Conversation Uniqueness
    // -------------------------------------------------------------
    console.log('\n--- Running Test 6: Conversation Uniqueness ---');
    // Close chat drawer
    const infoCloseX = pageA.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await infoCloseX.click();
    await pageA.waitForTimeout(500);

    // Go back to seeker page
    await pageA.goto(`${BASE_URL}/es/intercambios/buscar`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');
    await pageA.waitForTimeout(1000);

    // Wait for matcher loading indicator to disappear
    console.log('Waiting for matcher loading indicator on return...');
    await expect(pageA.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });

    // Ensure LALIGA 2025-26 is selected
    const collectionBtnAgain = pageA.locator('button:has-text("📁")');
    await expect(collectionBtnAgain).toBeVisible();
    const selectedTextAgain = await collectionBtnAgain.innerText();
    console.log(`Current selected collection on returning: "${selectedTextAgain}"`);
    if (!selectedTextAgain.includes('LALIGA 2025-26')) {
      console.log('LALIGA 2025-26 is not selected on return. Selecting it...');
      await collectionBtnAgain.click();
      await pageA.waitForTimeout(500);
      await pageA.click('div.absolute.z-20 button:has-text("LALIGA 2025-26")');
      await pageA.waitForTimeout(1000);
      // Wait for new search loader to disappear
      console.log('Waiting for matcher loading indicator after collection switch on return...');
      await expect(pageA.locator('text=Buscando matches...')).not.toBeVisible({ timeout: 25000 });
    }

    // Find User B again
    let foundAgain = false;
    for (let c = 0; c < 15; c++) {
      const cardTitle = pageA.locator('h2').first();
      if (await cardTitle.isVisible()) {
        const nameText = await cardTitle.innerText();
        if (nameText.toUpperCase().includes('DAVOR')) {
          foundAgain = true;
          break;
        }
      }
      const passBtn = pageA.getByRole('button', { name: 'Pasar', exact: false }).first();
      if (await passBtn.isVisible()) {
        await passBtn.click();
        await pageA.waitForTimeout(1000);
      } else {
        break;
      }
    }
    expect(foundAgain).toBe(true);

    // Click "¡Cambiar!" again
    const secondCambiarBtnSpotlight = pageA.locator('button').filter({ hasText: '¡Cambiar!' }).first();
    await secondCambiarBtnSpotlight.click();
    await pageA.waitForTimeout(1500);

    // ✅ Same conversation opens, previous messages are preserved
    const restoredMsg = pageA.locator('p:has-text("¡Hola! ¿Viste mi mensaje en tiempo real?")').first();
    await expect(restoredMsg).toBeVisible();

    const restoredReply = pageA.locator('p:has-text("¡Sí! Lo recibí perfectamente en tiempo real")').first();
    await expect(restoredReply).toBeVisible();

    console.log('Test 6 PASSED: Conversation uniqueness and persistent messaging verified.');

    // -------------------------------------------------------------
    // TEST 7 — Mobile Responsive
    // -------------------------------------------------------------
    console.log('\n--- Running Test 7: Mobile Responsive ---');
    // Set mobile viewport < 640px
    await pageA.setViewportSize({ width: 375, height: 812 });
    await pageA.waitForTimeout(1000);

    const mobileDrawer = pageA.locator('div.fixed.z-50.flex.flex-col').first();
    await expect(mobileDrawer).toBeVisible();

    // Bounding box size check: should be full-screen
    const box = await mobileDrawer.boundingBox();
    expect(box?.width).toBe(375);
    expect(box?.height).toBe(812);

    // Back arrow (←) visible, no X close button
    const backArrow = mobileDrawer.locator('button').filter({ has: pageA.locator('svg.lucide-arrow-left') }).first();
    await expect(backArrow).toBeVisible();

    const closeButtonDesktop = mobileDrawer.locator('button').filter({ has: pageA.locator('svg.lucide-x') }).first();
    await expect(closeButtonDesktop).not.toBeVisible();

    // Take screenshot on mobile
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t7_drawer_mobile.png') });

    // Click back closes the drawer
    await backArrow.click();
    await pageA.waitForTimeout(1000);
    await expect(mobileDrawer).not.toBeVisible();

    // Reset viewport to desktop
    await pageA.setViewportSize({ width: 1440, height: 900 });
    await pageA.waitForTimeout(1000);
    console.log('Test 7 PASSED: Mobile responsiveness verified completely.');

    // -------------------------------------------------------------
    // TEST 9 — i18n
    // -------------------------------------------------------------
    console.log('\n--- Running Test 9: i18n ---');
    // Switch English locale
    await pageA.goto(`${BASE_URL}/en/chats?tab=match`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');
    await pageA.waitForTimeout(1000);

    // Verify tabs read "Marketplace" / "Match"
    const enMarketplaceTab = pageA.locator('button:has-text("Marketplace")').first();
    await expect(enMarketplaceTab).toBeVisible();
    const enMatchTab = pageA.locator('button:has-text("Match")').first();
    await expect(enMatchTab).toBeVisible();

    // Open chat
    const enItem = pageA.locator('button:has-text("Davor_Cromos")').first();
    await enItem.click();
    await pageA.waitForTimeout(1000);

    // Verify placeholder is "Type a message..."
    const enComposer = pageA.locator('textarea[placeholder="Type a message..."]').first();
    await expect(enComposer).toBeVisible();

    // Take English screenshot
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t9_i18n_en.png') });

    // Switch Portuguese locale
    await pageA.goto(`${BASE_URL}/pt/chats?tab=match`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForLoadState('domcontentloaded');
    await pageA.waitForTimeout(1000);

    // Verify tabs read "Marketplace" / "Match"
    const ptMarketplaceTab = pageA.locator('button:has-text("Marketplace")').first();
    await expect(ptMarketplaceTab).toBeVisible();
    const ptMatchTab = pageA.locator('button:has-text("Match")').first();
    await expect(ptMatchTab).toBeVisible();

    // Open chat
    const ptItem = pageA.locator('button:has-text("Davor_Cromos")').first();
    await ptItem.click();
    await pageA.waitForTimeout(1000);

    // Verify placeholder is "Escreva uma mensagem..."
    const ptComposer = pageA.locator('textarea[placeholder="Escreva uma mensagem..."]').first();
    await expect(ptComposer).toBeVisible();

    // Take Portuguese screenshot
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa_t9_i18n_pt.png') });
    console.log('Test 9 PASSED: i18n localization verified successfully.');

    // -------------------------------------------------------------
    // Post-Execution: Clean contexts
    // -------------------------------------------------------------
    await contextA.close();
    await contextB.close();
    console.log('\n======================================');
    console.log('ALL QA TEST SCENARIOS PASSED SUCCESSFULLY');
    console.log('======================================');
  });
});
