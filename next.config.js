const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Excluir APIs de autenticação do pre-cache
  buildExcludes: [/middleware-manifest\.json$/],
  // Importante: permitir navegação offline
  navigationPreload: true,
  runtimeCaching: [
    {
      // Navegação de páginas - NetworkFirst para funcionar offline
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60 // 24 horas
        },
        networkTimeoutSeconds: 5
      }
    },
    {
      // Cache de páginas HTML
      urlPattern: /^https?.*\.(html|htm)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60 // 24 horas
        }
      }
    },
    {
      // Next.js build chunks - essencial para navegação offline
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 dias
        }
      }
    },
    {
      // Next.js data (RSC, JSON)
      urlPattern: /\/_next\/data\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 24 horas
        },
        networkTimeoutSeconds: 5
      }
    },
    {
      // Cache de assets estáticos (JS, CSS)
      urlPattern: /^https?.*\.(js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 dias
        }
      }
    },
    {
      // Cache de imagens
      urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 dias
        }
      }
    },
    {
      // Cache de fontes
      urlPattern: /^https?.*\.(woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 ano
        }
      }
    },
    {
      // APIs de autenticação - nunca cachear
      urlPattern: /\/api\/auth\/.*/,
      handler: 'NetworkOnly'
    },
    {
      // APIs de dados para sincronização offline
      urlPattern: /\/api\/offline\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-data-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 dias
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      // Outras APIs - Network First com fallback
      urlPattern: /\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60 // 5 minutos
        },
        networkTimeoutSeconds: 10
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Melhorar tratamento de chunks para evitar erros de módulos ausentes
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        sharp: false,
        fs: false,
        path: false,
        crypto: false,
        'iconv-lite': false,
      }

      // Excluir pdfkit e suas dependências do bundle do cliente
      if (!config.externals) {
        config.externals = []
      }

      // Garantir que externals seja um array
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals]
      }

      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
        'restructure': 'commonjs restructure',
        'fontkit': 'commonjs fontkit',
        'iconv-lite': 'commonjs iconv-lite',
      })
    }

    // Melhorar cache de chunks em desenvolvimento
    if (dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      }
    }

    return config
  },
}

module.exports = withPWA(nextConfig)
