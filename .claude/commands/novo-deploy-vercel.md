Configure deploy na Vercel com todas as otimizacoes do padrao SISAM.

Entrada: $ARGUMENTS (nome do projeto Vercel)

## 1. Criar `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "functions": {
    "app/api/admin/importar-completo/route.ts": { "maxDuration": 300 },
    "app/api/admin/importar-cadastros/route.ts": { "maxDuration": 300 },
    "app/api/admin/importar-resultados/route.ts": { "maxDuration": 300 },
    "app/api/admin/dashboard-dados/route.ts": { "maxDuration": 60 },
    "app/api/admin/graficos/route.ts": { "maxDuration": 60 }
  }
}
```

## 2. next.config.js — Otimizacoes para Vercel
```javascript
// Validar env vars no build
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']
const missing = requiredEnvVars.filter(v => !process.env[v])
if (missing.length > 0) {
  const msg = \`Variaveis obrigatorias nao configuradas: \${missing.join(', ')}\`
  if (process.env.NODE_ENV === 'production') throw new Error(msg)
  console.warn(msg)
}

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true }, // lint roda no CI separado

  // Cache headers para assets estaticos
  async headers() {
    return [
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=7776000, immutable' }] },
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }] },
    ]
  },

  // Webpack: excluir pacotes pesados do bundle cliente
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false, net: false, tls: false, dns: false }
      if (!Array.isArray(config.externals)) config.externals = [config.externals].filter(Boolean)
      config.externals.push({ 'pdfkit': 'commonjs pdfkit' })
    }
    return config
  },
}
```

## 3. Rotas com maxDuration (para operacoes pesadas)
```typescript
// No topo da rota que pode demorar:
export const maxDuration = 300 // 5 minutos (maximo Hobby)
export const dynamic = 'force-dynamic'
```

## 4. Variaveis de ambiente na Vercel
Configurar no painel Vercel > Settings > Environment Variables:
- DB_HOST, DB_PORT (6543), DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET (32+ chars)
- DB_SSL=true
- UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
- NODE_ENV=production (automatico)

## 5. Dominio customizado
```bash
# Apontar nameservers para Vercel
ns1.vercel-dns.com
ns2.vercel-dns.com
# SSL automatico
```

## 6. Checklist pre-deploy
- [ ] `npx tsc --noEmit` — 0 erros
- [ ] `npm test` — todos passam
- [ ] `npm run build` — build OK
- [ ] `.env.example` atualizado com todas vars
- [ ] vercel.json com maxDuration para rotas pesadas
- [ ] Variaveis de ambiente configuradas na Vercel
- [ ] DB_PORT=6543 (Transaction Mode para serverless)

## O que deu certo
- `maxDuration = 300` para importacoes — evita timeout
- `maxDuration = 60` para dashboards — tempo adequado para queries pesadas
- `eslint.ignoreDuringBuilds` — lint no CI, nao no build
- `export const dynamic = 'force-dynamic'` — em TODAS APIs (evita cache indesejado)
- Webpack fallbacks — evita erros de modulos de servidor no cliente
- Validacao de env vars — build falha se faltar variavel (nao deploy quebrado)
