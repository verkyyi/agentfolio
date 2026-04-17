import { test, expect } from '@playwright/test';

test('chat widget: opens, sends, streams a reply', async ({ page, context }) => {
  // Fake the proxy: intercept POST /chat with a short SSE body.
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

  await page.goto('./notion');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /chat/i }).click();
  await page.getByRole('textbox', { name: /message/i }).fill('tell me about notion');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByText('Hi there')).toBeVisible();
});
