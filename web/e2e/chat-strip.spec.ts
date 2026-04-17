import { test, expect } from '@playwright/test';

test.describe('sticky chat strip', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/hints', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hints: [
            'Why Anthropic?',
            'Walk me through the Flink pipeline',
            "What's not on the résumé?",
          ],
        }),
      });
    });
  });

  test('pins on scroll, drips a hint, clicks back to chat', async ({ page }, testInfo) => {
    await page.goto('./');

    // Skip if offline (no proxy configured — strip never mounts)
    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();
    const strip = page.locator('.chat-strip');
    if (!(await strip.count())) test.skip(true, 'chat is offline in this deploy');

    // Initially hidden
    await expect(strip).toBeHidden();
    await page.screenshot({
      path: testInfo.outputPath('01-idle-initial.png'),
      fullPage: false,
    });

    // Scroll to the bottom so the chat leaves the viewport
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(strip).toBeVisible();

    // Wait for the debounced fetch (400ms) and the first type tick (40ms × N chars)
    await page.waitForFunction(
      () => {
        const hint = document.querySelector('.chat-strip__hint') as HTMLElement | null;
        return !!hint && (hint.textContent?.length ?? 0) > 0;
      },
      undefined,
      { timeout: 5000 },
    );

    await page.screenshot({
      path: testInfo.outputPath('02-strip-with-hint.png'),
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 80 },
    });

    // Click the strip — chat input should regain focus
    await strip.click();
    await expect(page.getByRole('textbox', { name: /message/i })).toBeFocused();
    // Wait for smooth scroll to complete so the strip unpins (chat sentinel is back in view)
    await expect(strip).toBeHidden({ timeout: 3000 });

    await page.screenshot({
      path: testInfo.outputPath('03-returned-to-chat.png'),
      fullPage: false,
    });
  });

  test('strip stays hidden when the chat sentinel is still in view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 2400 });
    await page.goto('./');
    await expect(page.locator('.chatp')).toBeVisible();
    const strip = page.locator('.chat-strip');
    if (!(await strip.count())) test.skip(true, 'chat is offline in this deploy');
    // With a 2400px viewport the chat + sentinel remain visible on a small scroll
    await page.evaluate(() => window.scrollTo(0, 50));
    await expect(strip).toBeHidden();
  });
});
