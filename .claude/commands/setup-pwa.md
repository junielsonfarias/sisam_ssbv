Configure PWA (Progressive Web App) com offline-first no padrao SISAM.

Entrada: $ARGUMENTS (nome do app e descricao)

## 1. Instalar dependencias
```bash
npm install @ducanh2912/next-pwa
```

## 2. Configurar next.config.js
```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  navigationPreload: true,
  runtimeCaching: [
    { urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'pages', expiration: { maxEntries: 100, maxAgeSeconds: 7200 }, networkTimeoutSeconds: 5 } },
    { urlPattern: /\/_next\/static\/.*/, handler: 'CacheFirst', options: { cacheName: 'static', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } } },
    { urlPattern: /^https?.*\.(js|css)$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'assets', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } } },
    { urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } } },
    { urlPattern: /\/api\/auth\/.*/, handler: 'NetworkOnly' },
    { urlPattern: /\/api\/offline\/.*/, handler: 'NetworkFirst', options: { cacheName: 'offline-data', expiration: { maxEntries: 50, maxAgeSeconds: 604800 }, networkTimeoutSeconds: 10 } },
    { urlPattern: /\/api\/.*/, handler: 'NetworkFirst', options: { cacheName: 'api', expiration: { maxEntries: 100, maxAgeSeconds: 300 }, networkTimeoutSeconds: 10 } },
  ]
})
module.exports = withPWA(nextConfig)
```

## 3. Criar manifest.json em public/
```json
{
  "name": "[Nome do App]",
  "short_name": "[Nome Curto]",
  "description": "[Descricao]",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 4. Criar lib/offline-storage.ts
Funcoes para salvar/recuperar dados offline via localStorage:
- `saveUser(user)` / `getUser()`
- `isOnline()` / `setOnline(status)`
- `saveData(key, data)` / `getData(key)`
- Limite de storage com eviction

## 5. Criar lib/offline-sync-queue.ts
Fila de operacoes offline para sincronizar quando voltar online:
- `enqueue(operation)` — salvar operacao pendente
- `processQueue()` — enviar todas pendentes ao servidor
- `getQueueSize()` — contar pendentes
- Badge visual no header mostrando pendentes

## 6. Metadata no layout.tsx
```typescript
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '[Nome]' },
  icons: { icon: [...], apple: [...] },
}
```

## 7. Criar icones PWA
Gerar icones em public/icons/ nos tamanhos: 72, 96, 128, 144, 152, 180, 192, 384, 512.
