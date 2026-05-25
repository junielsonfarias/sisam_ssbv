# Diagnóstico de Adaptação — SISAM → Plataforma Completa de Secretaria Municipal de Educação

**Data:** 2026-05-25
**Versão atual analisada:** Educatec 2.0.0 (next-app SISAM)
**Objetivo:** Levantar todos os pontos para evoluir o sistema atual em uma plataforma de gestão escolar completa para Secretaria Municipal de Educação (SEMED), cobrindo aspectos pedagógicos, administrativos, infraestrutura, segurança, escalabilidade e disponibilidade.

> **Importante:** este documento é apenas diagnóstico. Nenhuma alteração foi feita no código. A próxima etapa é priorizar e planejar a execução por sprints.

---

## 1. Visão Executiva

### 1.1 Resumo do estado atual

| Aspecto | Nota | Observação |
|---|---|---|
| **Qualidade de Código** | 8/10 | Padrão `withAuth` + Zod 100%, SQL parametrizado 100%, mas há 1-2 services > 400 linhas e 42 worktrees temporários no repo |
| **Segurança** | 8.5/10 | JWT seguro, CSRF por Origin, rate limit por tipo, CSP diferenciado por rota, LGPD parcial |
| **Performance** | 8/10 | Pool inteligente Supabase, 276 índices, cache em 3 camadas (memory + file + Redis) |
| **Escalabilidade** | 7.5/10 | Suporta ~50 usuários simultâneos em Transaction Mode; sem multi-region nem read-replicas |
| **Cobertura Funcional** | 7/10 | ~70% do que uma SEMED completa precisa; falta BNCC, Censo INEP, PNAE, PNATE, RH, PDDE |
| **DevOps / Observabilidade** | 7/10 | CI/CD verde, health check, backup, mas sem APM (Sentry/Datadog) nem métricas persistentes |
| **Documentação** | 9/10 | CLAUDE.md detalhado, OpenAPI 3.0, JSDoc, 70+ docs |
| **Testes** | 5/10 | 23 arquivos de teste para 167 rotas — cobertura < 20%, apenas 1 E2E |

### 1.2 Conclusão de alto nível

O SISAM é uma **base sólida, segura e bem arquitetada**. Tem ~70% das funcionalidades necessárias para virar plataforma SEMED. Os gaps são principalmente:

1. **Funcional**: módulos administrativos municipais (RH escolar, PNAE/PNATE, PDDE, Censo Escolar, BNCC, EJA, Educação Infantil).
2. **Compliance**: LGPD precisa endpoints de exportação/portabilidade/exclusão; assinatura digital de documentos formais.
3. **Qualidade**: cobertura de testes baixa (especialmente E2E); falta observabilidade em produção (Sentry); 42 worktrees Claude no repo precisam ser limpos.
4. **Escalabilidade**: para suportar 10k+ alunos e múltiplas escolas concorrentes, considerar read-replicas e métricas persistidas.

---

## 2. Inventário do Sistema Atual

### 2.1 Stack Técnica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript 5.4
- **UI**: Tailwind CSS 3.4 + Radix + Lucide + Recharts
- **Banco**: PostgreSQL via Supabase (Transaction Mode porta 6543)
- **Cache**: Upstash Redis (REST) + memory + file
- **Auth**: JWT em cookie httpOnly + bcryptjs (salt 10)
- **Validação**: Zod 100% nas APIs
- **PWA**: `@ducanh2912/next-pwa` offline-first
- **Mobile**: Capacitor 8 (Android pronto, iOS preparado)
- **Reconhecimento facial**: `@vladmandic/face-api` (local, LGPD-friendly)
- **Push**: Firebase FCM
- **Testes**: Vitest + Playwright
- **Deploy**: Vercel + GitHub Actions

### 2.2 Módulos Implementados (resumo)

| Domínio | Cobertura | Itens |
|---|---|---|
| **Cadastros base** | ✅ Completo | Polos, escolas, professores, alunos, turmas, séries, disciplinas |
| **Matrículas** | ✅ Completo | CRUD, pré-matrícula online, fila de espera, controle de vagas |
| **Notas/Boletim** | ✅ Completo | Lançamento por bimestre, recuperação, boletim PDF, consulta pública |
| **Frequência** | ✅ Completo | Diária, hora-aula, bimestral, facial, QR code, justificativas |
| **Transferências** | ✅ Completo | Entre escolas e turmas, histórico |
| **Diário de classe** | ⚠️ Parcial | Tabela existe, falta conteúdo ministrado e atividades por aula |
| **Conselho de classe** | ✅ Completo | Registros, alunos em risco, recomendações, relatórios |
| **Calendário escolar** | ✅ Completo | Eventos, períodos letivos |
| **Avaliação Municipal (SISAM)** | ✅ Completo | Avaliações, banco de questões, OMR, níveis N1-N4, produção textual |
| **Portal Professor** | ✅ Completo | PWA, frequência, notas, diário, planos, comunicados, chat, tarefas, QR |
| **Portal Responsável** | ✅ Completo | Boletim, frequência, chat, calendário, tarefas |
| **Reconhecimento Facial** | ✅ Completo | Terminal PWA, LGPD, 3 embeddings/aluno |
| **Site Institucional** | ✅ Completo | CMS 11 abas, notícias, eventos, transparência, SEO, mapa |
| **Ouvidoria** | ✅ Completo | Registros, fluxo |
| **Auditoria/Logs** | ✅ Completo | logs_acesso, logs_auditoria, logs_dispositivos, logs_backup |
| **Backup** | ✅ Completo | Scripts SQL + agendamento manual |
| **Reconhecimento por QR** | ✅ Completo | Geração e leitura |

### 2.3 Tipos de Usuário Atuais

`administrador`, `tecnico`, `polo`, `escola`, `professor`, `responsavel`, `editor`, `publicador`

### 2.4 Volume do Código

- **167 endpoints REST** em `app/api/`
- **109 componentes** em `components/`
- **23 services** em `lib/services/`
- **116 migrations SQL** em `database/migrations/`
- **51 tabelas** no banco
- **172 scripts utilitários** em `scripts/`
- **70+ arquivos de documentação** em `docs/`
- **OpenAPI 3.0** com 214 endpoints documentados

---

## 3. Comparação com Sistemas de Mercado

| Sistema | Foco | Cobertura SISAM atual | Gap principal |
|---|---|---|---|
| **i-Educar** (open source) | Referência nacional para SEMEDs | 80% | Falta Censo INEP, PNAE, PNATE, EJA |
| **Sponte** | Privado, foco pedagógico | 65% | Falta RH, folha, PDDE |
| **ClassApp** | Comunicação escolar | 70% | Forte em chat — SISAM já cobre |
| **SophiA** | Pedagógico BNCC | 60% | Falta vinculação BNCC nas atividades |
| **GENNERA** | Administrativo amplo | 75% | Falta EJA e Educação Infantil |
| **Q-Acadêmico** | Superior | 65% | Foco diferente (não é municipal) |
| **e-Cidade Educação** | Suite municipal | 70% | Falta integração com prefeitura |

**Diferenciais do SISAM** que sistemas concorrentes raramente têm:
- Reconhecimento facial local (LGPD-friendly, não envia para nuvem)
- Avaliação municipal nativa com níveis N1-N4
- PWA offline-first real (terminal facial e portal professor)
- Multi-tenancy por polo + escola já estruturado

---

## 4. Gaps Funcionais para SEMED Completa

### 4.1 Críticos (bloqueadores para SEMED média/grande)

| Gap | Descrição | Esforço |
|---|---|---|
| **BNCC** | Tabela de habilidades/competências por ano, vinculação em questões, atividades e planos de aula | M |
| **Censo Escolar (INEP)** | Exportação XML/CSV no formato Educacenso; sincronização com Sistema Educacenso | G |
| **EJA (Educação Jovens e Adultos)** | Modalidade com séries próprias, períodos diferenciados, certificação | M |
| **Educação Infantil** | Berçário, Creche, Pré-escola; relatórios descritivos (sem nota numérica), portfólio do aluno | G |
| **AEE / Inclusão (PNE)** | Plano de Atendimento Educacional Especializado, deficiências, laudos, sala de recursos | M |
| **Histórico escolar formal** | Documento PDF com timbre, assinatura digital (ICP-Brasil), validação por QR | M |
| **Guia de transferência formal** | PDF com timbre municipal, código de validação | P |
| **Carga horária mínima legal** | Validação automática de 200 dias letivos / 800h anuais (LDB Art. 24) | P |

### 4.2 Importantes (esperados em SEMED moderna)

| Gap | Descrição | Esforço |
|---|---|---|
| **PNAE (Alimentação Escolar)** | Cardápio semanal, nutricionista responsável, alunos atendidos, controle de estoque | M |
| **PNATE (Transporte Escolar)** | Rotas, paradas, veículos, motoristas, alunos por rota | M |
| **PDDE (Recursos Financeiros)** | Orçamento por escola, despesas, prestação de contas | G |
| **PNLD (Livro Didático)** | Distribuição, inventário por escola/série, devolução | M |
| **Bolsa Família / Auxílio Brasil** | Geração do mapa de frequência para condicionalidades | P |
| **FICAI (Busca Ativa Escolar)** | Fluxo de notificação de evasão, ações até Conselho Tutelar | M |
| **Avaliação descritiva** | Para anos iniciais e educação infantil (sem nota numérica) | M |
| **Recuperação contínua/paralela** | Cronograma, professor designado, conteúdo, avaliação | P |
| **Reuniões de pais (ata)** | Convocação, lista de presença, ata | P |
| **Atestados/Declarações** | Geração automática (matrícula, frequência, conclusão) | P |

### 4.3 Administrativos / RH

| Gap | Descrição | Esforço |
|---|---|---|
| **Lotação de servidores** | Cadastro de servidor (concursado/contrato), lotação por escola, função | M |
| **Folha de pagamento** | Cálculo ou integração com sistema folha municipal | G |
| **Frequência de servidor** | Ponto eletrônico, abonos, atestados médicos | M |
| **Formação continuada** | Cursos, certificados, horas, vinculação a planos de carreira | M |
| **Avaliação de desempenho do professor** | Critérios, ciclos, feedback, plano de melhoria | M |
| **Substituição docente** | Banco de substitutos, escalas automáticas | M |
| **Patrimônio** | Inventário de bens por escola, manutenção, baixa | G |
| **Ordens de serviço** | Manutenção predial, TI, demanda da escola para SEMED | M |
| **Biblioteca** | Acervo, empréstimos, devoluções, reservas | M |

### 4.4 Diferenciais Modernos

| Gap | Descrição | Esforço |
|---|---|---|
| **Notificações push completas** | Infra existe, falta handler de eventos (nota lançada, falta, comunicado) | P |
| **App nativo (iOS)** | Capacitor preparado, mas iOS não foi compilado | M |
| **Dashboard estratégico SEMED** | KPIs municipais (IDEB projetado, evasão, repetência por escola, gasto/aluno) | M |
| **Analytics preditiva** | ML simples para predição de evasão e baixo desempenho | G |
| **Chatbot pais (WhatsApp Business API)** | Consulta de notas/frequência por mensagem | M |
| **Painel transparência (cidadão)** | Dados abertos do sistema educacional municipal | M |
| **Integração e-SUS Escolar** | Cruzamento com saúde escolar | G |

---

## 5. Auditoria de Segurança

### 5.1 Pontos Fortes

- ✅ **JWT** em cookie httpOnly + bcrypt (salt 10), JWT_SECRET com mínimo 32 chars (bloqueia deploy se menor)
- ✅ **CSRF** via validação Origin vs Host em POST/PUT/PATCH/DELETE
- ✅ **Rate limit** por tipo: read 600/min, write 120/min, import 15/min, device 300/min
- ✅ **CSP** diferenciado por rota (face-api precisa de `unsafe-eval` apenas no terminal)
- ✅ **Security headers** completos (HSTS 1 ano, X-Frame-Options DENY, Permissions-Policy)
- ✅ **SQL injection**: 0 ocorrências de interpolação — 100% queries parametrizadas
- ✅ **XSS**: apenas 3 `dangerouslySetInnerHTML`, todos em contextos controlados (layout, terminal, JSON-LD)
- ✅ **Validação**: Zod em 100% dos endpoints
- ✅ **Auditoria**: logs_acesso, logs_auditoria, logs_dispositivos
- ✅ **LGPD facial**: consentimento explícito com revogação

### 5.2 Gaps de Segurança

| Gap | Prioridade | Descrição |
|---|---|---|
| **LGPD: exportação de dados** | Alta | Faltam endpoints `/usuarios/[id]/exportar-dados` (art. 18 LGPD) |
| **LGPD: portabilidade** | Alta | Falta formato padrão de exportação interoperável |
| **LGPD: exclusão (direito ao esquecimento)** | Alta | Falta workflow de exclusão completa com backup |
| **LGPD: aviso de cookies / política de privacidade** | Alta | Sem banner de cookies no site público |
| **DPO (Encarregado de Dados)** | Alta | Sem registro do DPO nem canal formal de denúncias |
| **Política de força de senha** | Média | Não verificado se exige maiúscula/número/símbolo |
| **2FA** | Média | Não há autenticação em dois fatores — crítico para admin/técnico |
| **Brute-force login** | Média | Rate limit é por IP, não por usuário; faltam tentativas máximas + bloqueio |
| **Recovery de senha** | Média | Verificar se existe fluxo "esqueci senha" com token por email |
| **Anonimização de logs** | Média | Logs podem conter PII (CPF, NIS) sem mascaramento |
| **Retenção de logs** | Baixa | Sem política de retenção (LGPD exige tempo mínimo necessário) |
| **Criptografia de PII em repouso** | Baixa | CPF/RG/NIS em texto plano no banco (SSL no transporte é OK) |
| **WAF** | Baixa | Vercel tem WAF nativo, mas regras customizadas não exploradas |
| **CSP estrita** | Baixa | Ainda usa `'unsafe-inline'` para CSS; migrar para nonce |
| **Detecção de múltiplas sessões** | Baixa | Sem identificação de login simultâneo suspeito |
| **IP pinning** | Baixa | Sessão aceita IP diferente do login (útil para mobile, ruim para admin) |
| **Assinatura digital documentos** | Alta | Histórico/transferência sem assinatura ICP-Brasil |
| **Hardening Supabase** | Média | Verificar RLS (Row Level Security) — atualmente confia no `withAuth` |

### 5.3 Recomendações de Segurança Imediatas

1. **Implementar 3 endpoints LGPD** + página "Solicitar meus dados" no portal do responsável
2. **Adicionar 2FA TOTP** para perfis `administrador` e `tecnico` (Google Authenticator)
3. **Banner de cookies + política de privacidade** publicada no site
4. **Mascarar PII em logs** (CPF → ***.***.123-**)
5. **Rate limit por usuário** para login (5 tentativas em 15min → bloqueio temporário)
6. **Recovery de senha** com token assinado e expiração 1h
7. **Política de senha**: 10+ chars, maiúscula, número, símbolo; bloqueio de senhas comuns

---

## 6. Qualidade de Código

### 6.1 Pontos Fortes

- ✅ 100% das rotas API seguem padrão `withAuth` + `dynamic = 'force-dynamic'`
- ✅ Schemas Zod centralizados em `lib/schemas.ts`
- ✅ Service layer bem definida (23 services com tipos e JSDoc)
- ✅ Cache em 3 camadas com invalidação por pattern
- ✅ Logger estruturado (`lib/logger.ts`) com níveis e contexto
- ✅ Type-safe end-to-end (TypeScript + Zod)
- ✅ Convenções claras: `kebab-case.tsx` → `PascalCase` componente
- ✅ Dark mode 100% nas páginas

### 6.2 Code Smells / Dívida Técnica

| Item | Severidade | Detalhe |
|---|---|---|
| **42 diretórios `tmpclaude-*` na raiz** | Alta | Worktrees abandonados de sessões Claude — limpar com `git clean -fd` (cuidado) |
| **Services > 400 linhas** | Média | CLAUDE.md define limite de 400 — auditar e decompor (especialmente `importacao.service.ts`) |
| **`console.log` residuais** | Baixa | 3 arquivos: `lib/offline-storage.ts` (39 ocorrências), `lib/crypto.ts`, `lib/cache/session.ts` |
| **TODOs/FIXMEs** | Baixa | ~10 ocorrências, concentradas em facial e offline |
| **172 scripts em `scripts/`** | Média | Organizar em subpastas: `import/`, `debug/`, `infra/`, `seed/` |
| **Migrations duplicadas/iterativas** | Baixa | Várias `add-performance-indexes-v1..v4` indicam iteração — natural, mas considerar consolidação |
| **Falta `.gitignore` para `tmpclaude-*`** | Alta | Adicionar padrão no `.gitignore` para evitar voltar a aparecer |
| **Arquivo `nul` na raiz** | Baixa | Provavelmente artefato de redirecionamento Windows (`> nul`) — remover |
| **`image.png` na raiz** | Baixa | Mover para `docs/` ou `public/` ou remover |

### 6.3 Padrões Bem Estabelecidos (manter)

- `export const dynamic = 'force-dynamic'` em 100% das rotas
- `withAuth([roles], handler)` em rotas protegidas
- Queries parametrizadas (`$1, $2`) — sem string interpolation
- `{ mensagem: '...' }` para erros
- `useToast()` para feedback no UI
- `<ProtectedRoute tiposPermitidos={[...]}>` em todas as páginas

---

## 7. Performance e Escalabilidade

### 7.1 Pontos Fortes

- ✅ **Pool inteligente Supabase**: detecta Transaction Mode (porta 6543) e ajusta para max 40 conexões
- ✅ **Fila de queries**: MAX_CONCURRENT_QUERIES=50, MAX_QUEUE_SIZE=500 (evita memory leak em picos)
- ✅ **276 índices** distribuídos em 60 migrations
- ✅ **3 camadas de cache**: Upstash Redis (TTL 1-10min) + memory + file
- ✅ **Health check** a cada 30s no pool
- ✅ **Retry com backoff exponencial** em falhas transientes
- ✅ **PWA** com NetworkFirst para páginas, CacheFirst para estáticos (30 dias)
- ✅ **Lazy load** automático do Next.js (App Router)
- ✅ **vercel.json** com `maxDuration: 300s` para importação pesada

### 7.2 Gaps de Performance

| Gap | Severidade | Detalhe |
|---|---|---|
| **N+1 queries** | Média | Auditar `dashboard.service.ts`, `estatisticas.service.ts`, `comparativos.service.ts` |
| **Read replicas** | Média | Supabase paid plan oferece; usar para dashboards e relatórios |
| **Cache warming** | Baixa | Pré-carregar dados estáticos (séries, escolas, polos) ao deploy |
| **Métricas em memória** | Média | `RequestMetrics` no middleware é perdido a cada deploy — persistir em Redis |
| **Bundle size** | Baixa | Não auditado: verificar se `recharts`, `chart.js`, `face-api` são lazy-loaded |
| **Imagens** | Baixa | Verificar uso uniforme de `next/image` (não há `<img>` solto) |
| **Server-side filtering** | Média | Algumas páginas filtram client-side — auditar para grandes volumes |
| **Pagination virtualizada** | Baixa | Já existe `@tanstack/react-virtual` para listas longas — expandir uso |

### 7.3 Escalabilidade

**Capacidade atual estimada:**
- ~50 usuários simultâneos (Supabase Transaction Mode + pool 40)
- ~2000-5000 alunos por instância sem degradação perceptível
- ~500 escolas em comparativos (com cache)

**Para escalar para SEMED grande (10k+ alunos, 50+ escolas, 200+ usuários simultâneos):**

| Item | Recomendação |
|---|---|
| **Banco** | Supabase Pro com read-replica em outra região |
| **Cache** | Redis dedicado (não shared free tier) |
| **Imagens** | CDN + transformação on-the-fly (Vercel Image já faz isso) |
| **Fila de jobs** | Vercel Queues ou Inngest para importações longas |
| **APM** | Sentry + Vercel Analytics (Speed Insights) |
| **Logs** | Logtail / Axiom para retenção e busca |
| **Database connection** | Avaliar PgBouncer dedicado se passar de 100 conexões |

---

## 8. Infraestrutura e Disponibilidade

### 8.1 Estado Atual

- **Hosting**: Vercel (serverless, auto-scaling)
- **Banco**: Supabase managed PostgreSQL (single region)
- **Cache**: Upstash Redis (serverless)
- **DNS/Domínio**: `sisam-ssbv-junielsonfarias.vercel.app` (subdomínio Vercel)
- **CDN**: Vercel Edge Network nativo
- **CI/CD**: GitHub Actions (checkout → tsc → lint → test → build)
- **PWA**: Service worker, offline-first
- **Mobile**: Capacitor 8 Android (iOS preparado)
- **Backup**: Script SQL manual

### 8.2 Gaps de Infraestrutura

| Gap | Prioridade | Descrição |
|---|---|---|
| **Domínio próprio municipal** | Alta | Sair de subdomínio Vercel para `educacao.<municipio>.gov.br` |
| **Backup automatizado** | Alta | Atualmente manual; configurar dump diário com retenção (Supabase Pro inclui) |
| **Multi-region failover** | Média | Supabase é single-region; avaliar replica em outra AZ |
| **Disaster recovery plan** | Alta | Documentar RTO/RPO, playbook de restauração, drills periódicos |
| **Monitoramento (APM)** | Alta | Sem Sentry, Datadog ou similar — bugs em produção viram suporte por telefone |
| **Status page** | Média | Sem `status.educacao.municipio.gov.br` para transparência de uptime |
| **SLA documentado** | Média | Estabelecer SLA (ex: 99.5% uptime escolar, 99.9% críticos) |
| **Modo manutenção formal** | Baixa | Flag existe, falta página `/maintenance` bonita e cron de aviso |
| **Healthcheck público** | Baixa | `/api/health` existe; expor versão simplificada `/status` |
| **Rolling Releases** | Baixa | Vercel suporta canary — usar para reduzir risco de release |

### 8.3 CI/CD

**Atual:**
- ✅ GitHub Actions com Node 20
- ✅ `tsc --noEmit` antes do build
- ✅ Lint roda mas não bloqueia (warnings only)
- ✅ Testes rodam
- ✅ Build verifica `.next` foi gerado

**Faltam:**
- Coverage report (`--coverage` + threshold)
- E2E em CI (Playwright)
- Análise de bundle size (bundlephobia / next-bundle-analyzer)
- Security audit (`npm audit` ou Snyk)
- Lint bloqueante (após limpar warnings residuais)
- Lighthouse CI para verificar performance/a11y
- Preview deploys com label automática no PR
- Smoke test pós-deploy de produção
- Notificação de falha (Slack/email)

---

## 9. Observabilidade

### 9.1 Estado Atual

- ✅ Logger estruturado (`lib/logger.ts`)
- ✅ Request ID em todas as requests (middleware)
- ✅ `app/api/health` com métricas básicas
- ✅ Tabelas `logs_acesso`, `logs_auditoria`, `logs_dispositivos`, `logs_backup`
- ✅ Página `/admin/monitoramento`
- ✅ Auditoria de mutações (CRUD)

### 9.2 Gaps de Observabilidade

| Gap | Prioridade | Descrição |
|---|---|---|
| **APM (Sentry)** | Alta | Erros de produção não capturados centralmente |
| **Source maps em produção** | Alta | Necessário para Sentry decodificar stack traces |
| **Métricas persistentes** | Alta | Latência por endpoint, taxa de erro, p95/p99 |
| **Logs estruturados em destino externo** | Média | Logtail/Axiom para busca histórica |
| **Distributed tracing** | Baixa | OpenTelemetry para correlacionar APIs ↔ DB ↔ cache |
| **Alertas** | Alta | PagerDuty/Slack para erros > N/min, latência > p95 |
| **Dashboard ops** | Média | Grafana/Datadog para visualizar saúde geral |
| **Real User Monitoring (RUM)** | Baixa | Vercel Speed Insights ou Sentry RUM |
| **Audit trail consultável** | Média | UI rica para `logs_auditoria` com filtros |
| **Anonimização de logs** | Alta | Mascarar PII (CPF, email parcial) |
| **Retenção configurável** | Média | Política: 90 dias produção, 1 ano para auditoria |

---

## 10. Testes

### 10.1 Estado Atual

- **23 arquivos de teste** no total
- **12 testes unitários** em `__tests__/unit/`
- **10 testes de integração** em `__tests__/integration/`
- **1 teste E2E** em `e2e/` (apenas site público)
- Frameworks: Vitest 4 + Playwright

### 10.2 Cobertura

- Estimativa: < 20% das rotas têm teste
- 167 endpoints REST com apenas 10 testes de integração
- 50+ páginas com 1 teste E2E

### 10.3 Gaps de Testes

| Área | Cobertura Atual | Meta | Prioridade |
|---|---|---|---|
| **Auth (login, logout, refresh)** | ✅ Parcial | 100% | Alta |
| **CRUD alunos/escolas/turmas** | ❌ | 80% | Alta |
| **Notas e boletim** | ❌ | 80% | Alta |
| **Frequência (todos modos)** | ✅ Parcial | 80% | Alta |
| **Matrículas e fila de espera** | ❌ | 80% | Alta |
| **Transferências** | ❌ | 80% | Média |
| **Importação em lote** | ❌ | 70% | Alta |
| **Cartão-resposta OMR** | ❌ | 60% | Média |
| **Reconhecimento facial** | ❌ | 60% | Média |
| **E2E: fluxo professor** | ❌ | crítico | Alta |
| **E2E: fluxo responsável** | ❌ | crítico | Alta |
| **E2E: fluxo matrícula online** | ❌ | crítico | Alta |
| **E2E: admin dashboard** | ❌ | crítico | Alta |
| **Carga (k6/Artillery)** | ⚠️ Scripts existem | regular | Média |

### 10.4 Recomendação

- Meta de cobertura geral: **70% para unit/integration, 100% das jornadas críticas em E2E**
- CI deve falhar se cobertura < 60% (após atingir baseline)
- Adicionar smoke test pós-deploy

---

## 11. Documentação

### 11.1 Estado Atual

- ✅ `CLAUDE.md` detalhado (padrões, stack, arquitetura)
- ✅ `README.md` completo
- ✅ `docs/openapi.yaml` com 214 endpoints
- ✅ 70+ arquivos `.md` em `docs/`
- ✅ JSDoc em services e tipos públicos
- ✅ `docs/HORAS-DESENVOLVIMENTO.md` (histórico)

### 11.2 Gaps de Documentação

| Item | Prioridade |
|---|---|
| **Manual do usuário (por perfil)** | Alta — admin, escola, professor, responsável |
| **Guia de instalação produção** | Alta — passo-a-passo para SEMED implantar |
| **Diagrama de arquitetura** | Média — C4 model ou similar |
| **Diagrama ER do banco** | Alta — 51 tabelas precisam visualização |
| **Runbook operacional** | Alta — playbooks para incidentes comuns |
| **Política de segurança** | Alta — para certificação ISO/LGPD |
| **Termo de uso / Política privacidade** | Alta — LGPD obriga |
| **Changelog versionado** | Média — releases com semver |
| **Vídeo tutoriais** | Baixa — onboarding rápido |
| **API reference navegável** | Baixa — gerar HTML do OpenAPI (Swagger UI / Redoc) |

---

## 12. Roadmap Proposto

### 12.1 Fase 1 — Hardening e LGPD (4 semanas)

**Objetivo:** Sistema pronto para compliance e operação profissional.

1. Limpeza: remover 42 `tmpclaude-*`, `nul`, `image.png`; atualizar `.gitignore`
2. LGPD: 3 endpoints (export, portabilidade, delete) + página no portal responsável
3. LGPD: banner de cookies + Política de Privacidade + Termos de Uso
4. 2FA TOTP para `administrador` e `tecnico`
5. Recovery de senha por email + política de força
6. Rate limit por usuário no login (anti brute-force)
7. Mascarar PII em logs (CPF/email)
8. Sentry integrado + source maps em produção
9. Backup automatizado (Supabase Pro)
10. Decompor services > 400 linhas
11. Organizar `scripts/` em subpastas

### 12.2 Fase 2 — Completar Gestão Pedagógica (8 semanas)

**Objetivo:** Cobrir 90% do que LDB e BNCC exigem.

1. **BNCC**: tabelas de habilidades/competências; vinculação em questões, planos, tarefas
2. **Diário de classe completo**: conteúdo ministrado, atividades, observações
3. **Avaliação descritiva**: para anos iniciais e Ed. Infantil (sem nota numérica)
4. **EJA**: modalidade com séries próprias, períodos diferenciados
5. **Educação Infantil**: berçário, creche, pré-escola; portfólio do aluno
6. **AEE/PNE**: PAEE (Plano de Atendimento Educacional Especializado), laudos, sala de recursos
7. **Carga horária mínima**: validação automática 200 dias / 800h (LDB Art. 24)
8. **Histórico escolar formal** com assinatura digital ICP-Brasil
9. **Guia de transferência formal** com código de validação
10. **Atestados e declarações** automáticos (matrícula, frequência, conclusão)
11. **FICAI**: fluxo busca ativa escolar

### 12.3 Fase 3 — Programas Federais e Administrativo (10 semanas)

**Objetivo:** SEMED completa com integração de programas.

1. **PNAE**: cardápio, nutricionista, alunos atendidos, estoque
2. **PNATE**: rotas, paradas, veículos, motoristas, alunos por rota
3. **PNLD**: distribuição, inventário, devolução
4. **PDDE**: orçamento por escola, despesas, prestação de contas
5. **Bolsa Família**: mapa de frequência para condicionalidades
6. **Censo Escolar (INEP)**: exportação XML/CSV no formato Educacenso
7. **RH escolar**: lotação de servidores, frequência ponto, formação continuada
8. **Patrimônio**: inventário de bens, manutenção, baixa
9. **Biblioteca**: acervo, empréstimos, reservas
10. **Ordens de serviço**: manutenção predial, TI, demandas SEMED

### 12.4 Fase 4 — Escala e Inteligência (6 semanas)

**Objetivo:** Suportar 10k+ alunos e adicionar valor preditivo.

1. **APM completo** (Sentry + Vercel Analytics + Logtail)
2. **Read-replica** Supabase para dashboards
3. **Vercel Queues** para importações longas
4. **Dashboard estratégico SEMED**: KPIs municipais, IDEB projetado, evasão, gasto/aluno
5. **Analytics preditiva**: ML simples para risco de evasão e baixo desempenho
6. **Notificações push completas**: eventos do sistema (nota, falta, comunicado)
7. **App iOS** (Capacitor já preparado)
8. **Chatbot WhatsApp** (consulta de notas/frequência)
9. **Portal de transparência cidadão** com dados abertos
10. **Status page** pública
11. **Lighthouse CI + E2E em CI**

### 12.5 Fase 5 — Qualidade Sustentada (contínuo)

1. Meta de cobertura de testes: 70% unit/integration, 100% jornadas críticas E2E
2. Documentação: manual por perfil, diagrama ER, runbooks
3. Smoke test pós-deploy
4. Lint bloqueante após limpar warnings
5. Security audit periódico
6. Drills de disaster recovery trimestrais
7. Atualização de dependências (Renovate/Dependabot)

---

## 13. Estimativa de Esforço (alto nível)

| Fase | Duração | Devs simultâneos sugeridos |
|---|---|---|
| Fase 1 — Hardening + LGPD | 4 semanas | 1-2 |
| Fase 2 — Pedagógico completo | 8 semanas | 2-3 |
| Fase 3 — Programas federais | 10 semanas | 2-3 |
| Fase 4 — Escala + IA | 6 semanas | 2 |
| **Total** | **~28 semanas (~7 meses)** | — |

Fase 5 (qualidade) corre em paralelo a todas.

---

## 14. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **LGPD não compliant em produção** | Multas, suspensão | Fase 1 prioritária |
| **Bug crítico sem APM** | Suporte saturado | Sentry em Fase 1 |
| **Pico de uso (boletim final)** | Sistema indisponível | Cache agressivo + read-replica em Fase 4 |
| **Importação corrompe dados** | Restauração manual | Backup automatizado + testes em ambiente staging |
| **Falta de testes em refactor** | Regressão silenciosa | Cobertura mínima antes de Fase 2 |
| **Dependência única (Vercel)** | Vendor lock-in | Arquitetura permite migração; documentar processo |
| **Reconhecimento facial: falsos positivos** | Frequência incorreta | Threshold ajustável + auditoria humana |
| **Dados de menores expostos** | Crime LGPD/ECA | RLS no Supabase + revisão de acesso por escola |

---

## 15. Conclusão

O SISAM/Educatec é uma **base técnica madura e segura**, com arquitetura moderna (Next.js 14, App Router, Supabase, Vercel) e padrões de código bem estabelecidos via `CLAUDE.md`. Os pontos fortes superam significativamente os fracos.

**Para virar uma plataforma SEMED completa** existem três frentes principais de trabalho:

1. **Compliance e hardening** (Fase 1, urgente): LGPD, 2FA, observabilidade, backup automatizado.
2. **Funcionalidades pedagógicas e administrativas** (Fases 2 e 3): BNCC, EJA, Educação Infantil, AEE, PNAE, PNATE, PDDE, Censo Escolar, RH escolar.
3. **Escala e diferenciação** (Fase 4): suporte a 10k+ alunos, APM completo, analytics preditiva, app iOS, transparência cidadã.

Com **~7 meses de trabalho** focado, o sistema estará pronto para atender uma SEMED de porte médio (até 20 escolas, 10.000 alunos) com qualidade comercial, e com fundação para escalar para grandes municípios.

---

**Próximo passo recomendado:** validar este diagnóstico, priorizar Fase 1 e abrir tickets/issues por item para começar a execução.
