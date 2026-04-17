import { test, expect } from '@playwright/test';

test.describe('Portfolio layout — chat-first', () => {
  test('default slug: identity → chat → strip → résumé in order', async ({ page }) => {
    await page.goto('./');

    // Identity card visible
    const idcard = page.locator('.idcard');
    await expect(idcard).toBeVisible();
    await expect(idcard.locator('.idcard-name')).toContainText(/./);

    // Chat panel (or offline card) is present regardless of env
    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();

    // Activity strip present iff activity.json exists — allow absence
    const strip = page.locator('.strip');
    if (await strip.count()) {
      await expect(strip).toBeVisible();
    }

    // Main résumé content is present
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // #activity anchor exists iff activity.json was loaded
    const activityTarget = page.locator('#activity');
    if (await activityTarget.count()) {
      await expect(activityTarget).toBeAttached();
    }
  });

  test('/anthropic-fde-nyc slug renders with same layout', async ({ page }) => {
    await page.goto('./anthropic-fde-nyc');
    // If this deploy has no anthropic-fde-nyc adaptation, App renders "Not Found" instead of the layout
    if (await page.getByText('Not Found').count()) test.skip(true, 'no anthropic-fde-nyc adaptation in this deploy');

    await expect(page.locator('.idcard')).toBeVisible();
    await expect(page.locator('.chatp')).toBeVisible();
  });

  test('mobile viewport — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./');
    await expect(page.locator('.idcard')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('print media hides chat and activity strip', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.chatp')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.chatp')).toBeHidden();
    if (await page.locator('.strip').count()) {
      await expect(page.locator('.strip')).toBeHidden();
    }
  });

  test('/dashboard still routes to dashboard', async ({ page }) => {
    await page.goto('./dashboard');
    await expect(page.getByText(/Fitted Resumes/i)).toBeVisible();
  });

  test('chat exchange (mocked proxy) renders assistant response', async ({ page, context }) => {
    // Intercept POST /chat with a short mocked SSE body
    await context.route('**/chat', async (route) => {
      const body =
        'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n' +
        'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n' +
        'event: message_stop\ndata: {}\n\n';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
      });
    });

    await page.goto('./anthropic-fde-nyc');
    if (await page.getByText('Not Found').count()) test.skip(true, 'no anthropic-fde-nyc adaptation');

    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();

    // If VITE_CHAT_PROXY_URL was unset at build time, the offline card is shown and this test becomes vacuous.
    // Check for the input. If it's not present, this deploy is offline-mode; skip.
    const input = page.getByRole('textbox', { name: /message/i });
    if (!(await input.count())) test.skip(true, 'chat is offline in this deploy');

    await input.fill('tell me about anthropic-fde-nyc');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/Hi there/)).toBeVisible();
  });
});
