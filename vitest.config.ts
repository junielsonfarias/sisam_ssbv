import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/services/**', 'lib/api-helpers.ts', 'lib/auth/**'],
      reporter: ['text', 'text-summary'],
    },
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
