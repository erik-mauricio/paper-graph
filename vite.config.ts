/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Import aliases (also set in tsconfig.app.json): @/ is src/, @shared/ is shared/.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    // Send /api requests to our Express server (server/index.ts).
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    // Unit tests sit next to the code they test. Browser tests live in e2e/ (Playwright).
    include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
    environment: 'node',
  },
})
