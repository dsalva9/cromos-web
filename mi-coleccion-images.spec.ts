import { test, expect, Page } from '@playwright/test';

test.describe('Collection Page Image Handling', () => {
  const collectionUrl = '/mi-coleccion/1'; // Assuming a valid collection page

  test.beforeEach(async ({ page }) => {
    // You would typically log in here. For this test, we'll assume direct access
    // or a valid session state is already present.
    await page.goto(collectionUrl);
    await page.waitForSelector('img[alt*="-"]'); // Wait for images to be present
  });

  test('should use thumbnail images in the grid', async ({ page }) => {
    // Get the first sticker image in the grid
    const firstImage = page.locator('.grid > div:first-child img').first();

    // Assert that the `src` attribute points to a thumbnail.
    // This test assumes thumbnail URLs contain a specific path segment like '/sticker-images/thumbs/'.
    // Adjust the pattern if your URL structure is different.
    const src = await firstImage.getAttribute('src');
    expect(src).not.toBeNull();

    // A robust way is to check if the URL is for a thumbnail.
    // Here, we check if it's NOT a full image URL, assuming thumbs have a different path.
    // This is less brittle than matching an exact thumb path.
    expect(src).not.toContain('image_path_webp_300');
    console.log(`Verified image src does not contain full image path: ${src}`);
  });

  test('should gracefully fallback without layout shift on image error', async ({
    page,
  }) => {
    const firstImage = page.locator('.grid > div:first-child img').first();
    const imageUrl = await firstImage.getAttribute('src');
    expect(imageUrl).not.toBeNull();

    // Get the initial size of the image container
    const imageContainer = page
      .locator('.grid > div:first-child .aspect-\\[3\\/4\\]')
      .first();
    const initialBoundingBox = await imageContainer.boundingBox();
    expect(initialBoundingBox).not.toBeNull();

    // Intercept the image request and make it fail
    await page.route(imageUrl!, route => route.abort());

    // Reload the page to trigger the failed request
    await page.reload();

    // After reload, the image should have a fallback (e.g., initials)
    // but the container size must remain the same to prevent layout shift.
    const finalBoundingBox = await imageContainer.boundingBox();
    expect(finalBoundingBox).not.toBeNull();

    // Assert that height and width have not changed
    expect(finalBoundingBox!.width).toBe(initialBoundingBox!.width);
    expect(finalBoundingBox!.height).toBe(initialBoundingBox!.height);
    console.log('Verified no layout shift on image fallback.');
  });
});
