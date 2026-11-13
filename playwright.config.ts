import { defineConfig } from '@playwright/test'

// Browser tests for the graph editor. They run against the dev sample graph
// (/?sample), so no API key or Gemini calls are needed.
// Port 5199, so they don't clash with `npm run dev` on 5173.
const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the Chrome already installed on the machine; no browser download.
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
