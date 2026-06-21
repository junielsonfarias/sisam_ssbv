import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // Isolamento de módulo entre arquivos: services com estado singleton (ex.: o
    // configCache em Map de lib/services/notas/config.ts, TTL 60s) vazavam entre
    // arquivos de teste e causavam flakiness intermitente. forks + isolate garante
    // que cada arquivo rode com módulos zerados.
    pool: 'forks',
    isolate: true,
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
