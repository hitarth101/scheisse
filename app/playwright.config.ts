import { defineConfig, devices } from '@playwright/test';

// Screens are checked in WebKit (Safari's engine) at iPhone 14 Pro size, in light and dark.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4174/scheisse/',
    ...devices['iPhone 14 Pro'],
    browserName: 'webkit',
  },
  projects: [
    { name: 'light', use: { colorScheme: 'light' } },
    { name: 'dark', use: { colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4174/scheisse/',
    reuseExistingServer: !process.env.CI,
  },
});
