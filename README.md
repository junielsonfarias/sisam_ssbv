# SISAM - Sistema de Avaliacao Municipal

Sistema educacional completo da SEMED (Secretaria Municipal de Educacao) de Sao Sebastiao da Boa Vista - PA. Gerencia avaliacoes municipais, gestao escolar, portal do professor, reconhecimento facial e site institucional.

**Producao**: [educacaossbv.com.br](https://educacaossbv.com.br)
**Repositorio**: [sisam_ssbv](https://github.com/junielsonfarias/sisam_ssbv)

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5.4 |
| Frontend | React 18, Tailwind CSS 3.4, Lucide Icons, Recharts, Chart.js |
| Backend | API Routes (184 endpoints), Zod validation |
| Banco de Dados | PostgreSQL (Supabase) com pg driver |
| Cache | Upstash Redis (REST-based, serverless) |
| Autenticacao | JWT (cookie httpOnly) com bcryptjs |
| PWA | @ducanh2912/next-pwa (offline-first) |
| Facial | @vladmandic/face-api (reconhecimento facial) |
| PDF | PDFKit, @react-pdf/renderer |
| Excel | ExcelJS (importacao/exportacao) |
| Testes | Vitest (515+ testes) |
| Deploy | Vercel (serverless) |

## Arquitetura

```
SISAM/
├── app/                    # Next.js App Router
│   ├── admin/              # Painel administrativo (SISAM + Gestor)
│   ├── api/                # 184 API Routes (REST)
│   ├── boletim/            # Consulta publica de boletim
│   ├── editor/             # Modulo editor de noticias
│   ├── escola/             # Dashboard da escola
│   ├── eventos/            # Pagina publica de eventos
│   ├── login/              # Tela de login
│   ├── matricula/          # Pre-matricula online (3 etapas)
│   ├── modulos/            # Seletor de modulos (SISAM/Gestor)
│   ├── ouvidoria/          # Ouvidoria digital
│   ├── perfil/             # Perfil do usuario
│   ├── polo/               # Dashboard do polo
│   ├── professor/          # Portal do professor (PWA)
│   ├── publicacoes/        # Publicacoes oficiais
│   ├── publicador/         # Modulo publicador
│   ├── tecnico/            # Dashboard do tecnico
│   ├── terminal/           # Terminal de reconhecimento facial
│   ├── transparencia/      # Transparencia escolar
│   ├── layout.tsx          # Layout global
│   └── page.tsx            # Site institucional (homepage)
├── components/             # Componentes React reutilizaveis
│   ├── site/               # Componentes do site institucional
│   ├── ui/                 # Componentes UI genericos
│   ├── protected-route.tsx # HOC de protecao de rotas
│   ├── toast.tsx           # Sistema de notificacoes
│   └── rodape.tsx          # Rodape global
├── lib/                    # Logica de negocios
│   ├── auth/               # Autenticacao (with-auth wrapper)
│   ├── cache/              # Redis cache (Upstash REST)
│   ├── services/           # Service layer (18 services)
│   ├── hooks/              # React hooks customizados
│   ├── relatorios/         # Geracao de PDFs
│   ├── schemas.ts          # Schemas Zod (validacao 100%)
│   ├── types.ts            # Tipos TypeScript
│   ├── constants.ts        # Constantes do sistema
│   ├── logger.ts           # Logger estruturado
│   └── config-series.ts    # Calculo niveis N1-N4
├── database/               # Conexao e migracoes
│   ├── connection.ts       # Pool PG com retry, health check, fila
│   └── migrations/         # SQL de migracoes
├── __tests__/              # Testes unitarios (Vitest)
├── public/                 # Assets estaticos + PWA
├── scripts/                # Scripts de manutencao/migracao
├── middleware.ts           # Rate limiting, CSRF, CSP, headers
└── docs/                   # Documentacao (OpenAPI, planos)
```

## Modulos do Sistema

### 1. SISAM (Avaliacao Municipal)
Dashboard com graficos comparativos, importacao de resultados via planilha, calculo automatico de niveis (N1-N4), cartao-resposta digital, relatorios por escola/polo/serie.

### 2. Gestor Escolar
Matriculas, turmas, disciplinas, periodos letivos, notas escolares, frequencia diaria, boletim, historico escolar, transferencias, configuracao de series/avaliacao.

### 3. Portal do Professor (PWA)
Lancamento de notas e frequencia, diario de classe, planos de aula, comunicados para responsaveis. Funciona offline com sincronizacao automatica.

### 4. Terminal Facial
Reconhecimento facial para registro de presenca. PWA com camera, face-api.js, base64 embeddings no PostgreSQL, consentimento LGPD.

### 5. Site Institucional
CMS completo com 10 secoes editaveis (hero, sobre, redes sociais, estatisticas, servicos, noticias, escolas, contato, rodape, manutencao). Modo manutencao com tela animada.

### 6. Publicacoes Oficiais
CRUD de portarias, resolucoes, decretos, calendarios, atas. Perfil publicador dedicado.

### 7. Dashboard Executivo
KPIs, ranking de escolas, graficos donut, alertas automaticos, metas por escola, evolucao historica, relatorios para conselhos (CACSFUNDEB, CAE, CME).

## Tipos de Usuario

| Tipo | Acesso |
|------|--------|
| `administrador` | Acesso total ao sistema |
| `tecnico` | Acesso total (igual administrador) |
| `polo` | Seu polo e escolas vinculadas |
| `escola` | Apenas sua escola |
| `professor` | Suas turmas, notas, frequencia |
| `editor` | CRUD de noticias |
| `publicador` | CRUD de publicacoes oficiais |

## Como Rodar

### Pre-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou conta Supabase)
- (Opcional) Upstash Redis para cache

### Instalacao

```bash
git clone https://github.com/junielsonfarias/sisam_ssbv.git
cd sisam_ssbv
npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

### Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `DB_HOST` | Sim | Host do PostgreSQL (ex: xxx.supabase.co) |
| `DB_PORT` | Sim | Porta (6543 = Transaction Mode, recomendado) |
| `DB_NAME` | Sim | Nome do banco (default: postgres) |
| `DB_USER` | Sim | Usuario do banco |
| `DB_PASSWORD` | Sim | Senha do banco |
| `DB_SSL` | Nao | Habilitar SSL (default: true em producao) |
| `JWT_SECRET` | Sim | Chave JWT (gere com `openssl rand -hex 32`) |
| `NODE_ENV` | Nao | development / production |
| `NEXT_PUBLIC_APP_URL` | Nao | URL da aplicacao |
| `UPSTASH_REDIS_REST_URL` | Nao | URL do Redis (Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | Nao | Token do Redis (Upstash) |

### Executar

```bash
# Desenvolvimento
npm run dev

# Build de producao
npm run build && npm start

# Testes
npm test                  # Rodar todos os testes
npm run test:watch        # Modo watch
npm run test:coverage     # Com cobertura
```

### Scripts Uteis

```bash
npm run setup-db                   # Criar tabelas no banco
npm run seed                       # Popular com dados de exemplo
npm run testar-conexao-supabase    # Testar conexao
npm run verificar-status           # Status atual do banco
npm run teste-carga                # Teste de carga
npm run backup                     # Backup do banco
npm run restore <arquivo.dump>     # Restaurar backup
```

## API

184 endpoints REST organizados em grupos:

- **Auth** — Login, logout, verificacao, cadastro professor
- **Admin/Alunos** — CRUD, historico, evolucao, situacao
- **Admin/Escolas** — CRUD, series, regras de avaliacao
- **Admin/Turmas** — CRUD, alunos por turma, composicao
- **Admin/Importacoes** — Upload planilha, progresso, cancelar
- **Admin/SISAM** — Avaliacoes, resultados, niveis, cartao-resposta
- **Admin/Dashboard** — Estatisticas, graficos, executivo, evolucao
- **Admin/Gestao** — Notas, frequencia, periodos, disciplinas
- **Admin/Facial** — Dispositivos, embeddings, presenca, LGPD
- **Admin/Site** — Config do site, eventos, ouvidoria, calendario
- **Professor** — Turmas, notas, frequencia, diario, planos
- **Publico** — Site, boletim, publicacoes, transparencia, eventos
- **Offline** — Sync de dados para funcionamento offline

Documentacao completa: [`docs/openapi.yaml`](docs/openapi.yaml)

## Seguranca

- **Autenticacao**: JWT em cookie httpOnly com SameSite=Lax
- **Validacao**: 100% dos inputs validados com Zod
- **Rate Limiting**: Por operacao (read: 600/min, write: 120/min)
- **CSRF**: Validacao de Origin header em mutacoes
- **CSP**: Content Security Policy endurecido por rota
- **Headers**: HSTS, X-Frame-Options, X-Content-Type-Options
- **Erros**: Nunca expoe mensagens internas (safeErrorResponse)
- **Build**: Bloqueado sem env vars em producao

## Cache (Redis)

24 APIs com cache via Upstash Redis (REST):

| Tipo | TTL | Exemplos |
|------|-----|----------|
| Publico | 60-300s | site-config, boletim, publicacoes |
| Admin | 60-120s | estatisticas, executivo, turmas |
| Referencia | 300-600s | series, disciplinas, periodos |

Invalidacao automatica em 9 rotas de escrita. Funciona sem Redis (fallback graceful).

## Database

PostgreSQL via Supabase com:
- Pool inteligente (detecta Transaction/Session Mode automaticamente)
- Retry com backoff exponencial (4 tentativas)
- Health check periodico
- Fila de queries (max 50 concorrentes, max 500 na fila)
- 17+ indices otimizados (v3 + v4)
- Coluna desnormalizada `serie_numero` com triggers automaticos
- pg_trgm para busca ILIKE performatica
- Batch queries para operacoes pesadas

## Deploy (Vercel)

O deploy e automatico via push na branch `main`:

```bash
git push origin main
```

- Funcoes serverless com maxDuration ate 300s para importacoes
- PWA com service worker e cache offline
- SSL automatico via Vercel
- Dominio: educacaossbv.com.br (NS apontando para Vercel)

## Licenca

Projeto privado — SEMED Sao Sebastiao da Boa Vista / PA.

Desenvolvido por **Junielson Farias**.
