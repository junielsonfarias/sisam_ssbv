// Validação de variáveis de ambiente obrigatórias no build
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
if (missingEnvVars.length > 0) {
  const msg = `ERRO: Variáveis de ambiente obrigatórias não configuradas: ${missingEnvVars.join(', ')}`
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }
  console.warn(`⚠️  ${msg}`)
  console.warn('   O build de produção será bloqueado sem estas variáveis.')
}

const withPWA = require('@ducanh2912/next-pwa').default({
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
      // Navegação de páginas - NetworkFirst com cache curto para evitar dados stale
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 2 * 60 * 60 // 2 horas (reduzido de 24h para evitar dados stale)
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
          maxEntries: 100,
          maxAgeSeconds: 2 * 60 * 60 // 2 horas
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
      // Cache de modelos face-api.js (estáticos, ~12MB total)
      urlPattern: /\/models\/face-api\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'face-api-models',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 90 * 24 * 60 * 60 // 90 dias
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
  eslint: {
    // Lint warnings não devem bloquear o build de produção
    ignoreDuringBuilds: true,
  },
  // Redirects de compatibilidade durante a reorganização de rotas por módulo.
  // permanent: false (307) — não cacheia no navegador enquanto a migração
  // está em andamento (permite reverter sem resíduo). Promover a true (308)
  // quando a reorganização estiver concluída e estável.
  async redirects() {
    // Reorganização de rotas por módulo: cada rota antiga /admin/<rota>
    // redireciona para /admin/<modulo>/<rota>, cobrindo a rota base e subrotas
    // dinâmicas. permanent: false (307) durante a migração — promover a true
    // (308) quando concluída e estável.
    const rotasSisam = [
      'dashboard', 'dados', 'graficos', 'relatorios', 'resultados',
      'comparativos', 'comparativos-polos', 'comparativo-notas', 'evolucao',
      'evolucao-escolas', 'avaliacoes', 'questoes', 'cartao-resposta',
      'importar-completo', 'importar-cadastros', 'importar-resultados',
      'importacoes', 'metas', 'configuracao-series', 'modulos-tecnico',
    ]
    const rotasGestor = [
      'escolas', 'polos', 'alunos', 'turmas', 'matriculas', 'pre-matriculas',
      'transferencias', 'controle-vagas', 'fila-espera', 'frequencia',
      'frequencia-diaria', 'infrequencia', 'painel-turma', 'dispositivos-faciais',
      'facial-enrollment', 'terminal-facial', 'notas-escolares', 'recuperacao',
      'regras-avaliacao', 'fechamento-ano', 'conselho-classe', 'historico-escolar',
      'avaliacoes-descritivas', 'relatorios-pdf', 'divergencias', 'professores',
      'professor-turmas', 'responsaveis', 'anos-letivos', 'series-escolares',
      'disciplinas', 'horarios-aula', 'calendario-escolar', 'calendario-eventos',
    ]
    const rotasSemed = [
      'ficai', 'aee', 'ed-infantil', 'analytics-preditiva', 'censo-escolar',
      'documentos', 'pnae', 'pnate', 'pnld', 'pdde', 'bolsa-familia', 'rh',
      'patrimonio', 'biblioteca', 'ordens-servico',
    ]
    const gerarRedirects = (modulo, rotas) =>
      rotas.flatMap((r) => [
        { source: `/admin/${r}`, destination: `/admin/${modulo}/${r}`, permanent: false },
        { source: `/admin/${r}/:path*`, destination: `/admin/${modulo}/${r}/:path*`, permanent: false },
      ])
    return [
      ...gerarRedirects('sisam', rotasSisam),
      ...gerarRedirects('gestor', rotasGestor),
      ...gerarRedirects('semed', rotasSemed),
      // dashboards renomeados para <modulo>/dashboard (não cabem no gerador uniforme)
      { source: '/admin/dashboard-gestor', destination: '/admin/gestor/dashboard', permanent: false },
      { source: '/admin/dashboard-semed', destination: '/admin/semed/dashboard', permanent: false },
    ]
  },
  // Headers de cache e permissões
  async headers() {
    return [
      {
        source: '/models/face-api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=7776000, immutable' }, // 90 dias
        ],
      },
      // Permitir camera nas rotas admin (SPA compartilha headers entre navegações client-side)
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/terminal/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
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
        net: false,
        tls: false,
        dns: false,
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

// ============================================================================
// Sentry — só envolve se a env SENTRY_DSN estiver configurada
// ============================================================================
let configFinal = withPWA(nextConfig)

if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs')
    configFinal = withSentryConfig(configFinal, {
      // Org/Project só são usados para upload de source maps (requer SENTRY_AUTH_TOKEN)
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true, // não polui o output do build
      widenClientFileUpload: true,
      reactComponentAnnotation: { enabled: true },
      // Tunnel route opcional (passa eventos pelo proxy do app para evitar bloqueio de adblocks)
      tunnelRoute: '/monitoring-tunnel',
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  } catch (e) {
    console.warn('Sentry não configurado:', e.message)
  }
}

module.exports = configFinal
