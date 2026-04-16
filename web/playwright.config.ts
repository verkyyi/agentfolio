import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173/agentfolio/',
    launchOptions: {
      executablePath: '/home/dev/.local/bin/chromium-wrapper',
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
