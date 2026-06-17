# ✅ Checklist de Produção — SISAM

> **Gerado em:** 2026-06-17
> **Base:** auditoria de release (código + docs) + validação manual.
> **Status geral:** sistema funcionalmente ~98% pronto (774 commits, 761 testes verdes, 114 tabelas). Os pendentes são majoritariamente **configuração de terceiros + segurança operacional**, não bugs de código.

Este documento é a **fonte única e acionável** para o go-live. Complementa (não substitui):
- `docs/PREPARACAO_PRODUCAO.md` — passos detalhados de setup (JWT, backup, headers).
- `docs/DEPLOY.md` — processo de deploy.
- `docs/RUNBOOKS.md` — procedimentos operacionais.
- `docs/FASE5-VALIDACAO.md` — estado do RLS.
- `docs/DIVIDA-TECNICA.md` — débito técnico detalhado.

**Legenda:** 🔴 Bloqueador (impede go-live) · 🟡 Importante (antes do lançamento) · 🟢 Pós-lançamento.

---

## 🔴 Bloqueadores — resolver ANTES do go-live

### 1. Configurar variáveis de ambiente em produção
- [ ] **DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD / DB_SSL** — credenciais reais do Supabase (porta 6543, Transaction Mode).
- [ ] **JWT_SECRET** — gerar segredo forte e exclusivo de produção (ver `PREPARACAO_PRODUCAO.md` → Passo 2: `openssl rand -base64 48`). **Nunca** reutilizar o de dev.
- [ ] **NODE_ENV=production** e **NEXT_PUBLIC_APP_URL** com o domínio final.
- [ ] **UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN** — cache + rate limit.

> ⚠️ Sem essas, o build de produção **falha por design** — `next.config.js` valida `missingEnvVars` e lança erro em `NODE_ENV === 'production'`.
>
> ✅ **Boa notícia (validado):** `.env` / `.env.local` **nunca foram commitados** no histórico do git (`git log --all -- .env` vazio). Só `.env.example` é rastreado. **Não há vazamento de credenciais** — este item é apenas configuração, não remediação.

### 2. Configurar e-mail transacional (RESEND)
- [ ] **RESEND_API_KEY** + **EMAIL_FROM** (domínio verificado em resend.com).
- [ ] Validar envio real de: recuperação de senha, confirmação de troca, notificações LGPD.

> Sem `RESEND_API_KEY`, `lib/email/sender.ts` roda em **dry-run** (só loga no console). Recuperação de senha e 2FA por e-mail **não funcionam**.

### 3. Configurar observabilidade de erros (Sentry)
- [ ] **SENTRY_DSN** + **NEXT_PUBLIC_SENTRY_DSN**.
- [ ] **SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT** (upload de source maps).
- [ ] Disparar um erro de teste e confirmar captura no painel.

> Sem Sentry (`next.config.js:238`), erros de produção são **silenciosos** — descobertos só por reclamação de usuário.

### 4. Aplicar RLS em produção (cobertura total)
- [ ] **1º** rodar `database/migrations/verificar-rls-estado.sql` (passo 1) e confirmar `bypassa_rls = true` para `postgres`/`service_role`. *(Validado como padrão do Supabase em 17/06.)*
- [ ] Aplicar `database/migrations/enable-rls-cobertura-total.sql` no banco de produção (tem **gate** que aborta sozinha se a premissa do bypass não valer).
- [ ] Rodar `verificar-rls-estado.sql` de novo: `pct_cobertura` deve ser **100.0** e "tabela_sem_rls" vazio.

> A migration SEMED (`add-rls-tabelas-semed.sql`, 49 tabelas) e a legada (`enable-rls-tabelas-legadas.sql`, ~50) já existem. A nova `enable-rls-cobertura-total.sql` fecha os **gaps remanescentes** — em especial a tabela **`usuarios`** (que só tinha `COMMENT`, nunca `ENABLE RLS`!), `usuarios_2fa`, `refresh_tokens`, `responsaveis_alunos` — e qualquer tabela criada via MCP fora dos arquivos locais. Não quebra o app: acesso é 100% via `service_role` (bypassa RLS) e o projeto não usa `supabase-js`/anon (validado: `@supabase` ausente do package.json).

### 4b. Aplicar migration de correção da view SISAM (`serie_numero`)
- [x] Aplicar `database/migrations/corrigir-view-add-serie-numero.sql` no banco. ✅ *(aplicada em 17/06/2026)*
- [x] Validar: `/admin/sisam/dashboard` preenche média geral / aprovação / por tipo de ensino; log sem `column rc.serie_numero does not exist`. ✅ *(17/06/2026)*

> **Bug pré-existente (regressão), descoberto em 17/06.** A view `resultados_consolidados_unificada` não expunha `serie_numero`, embora a tabela base a possua → ~50 queries do módulo SISAM (dashboard, gráficos, comparativos, resultados) falhavam, **mascaradas** por `executarQuerySegura` (painel carregava com seções vazias). A migration recria a view com a definição **atual exata** (obtida via `pg_get_viewdef`) + a coluna, e adiciona `serie_numero` em `resultados_provas` (corrige o `rp.serie_numero` dos gráficos). Risco baixo/reversível. **Não** relacionada à reorganização de rotas.

### 5. Configurar Firebase para push notifications
- [ ] Criar projeto Firebase, baixar **`google-services.json`** → `android/app/`.
- [ ] Variáveis FCM no servidor (chave de serviço).
- [ ] Enviar push de teste para um device real.

> `android/app/build.gradle:55-61` faz `continue-on-error` se o arquivo faltar → push **não funciona** (avisos de notas/faltas/comunicados não saem).

### 6. Smoke test end-to-end em staging
- [ ] Login de cada perfil (administrador, escola, professor, responsável).
- [ ] Jornada crítica: matrícula → lançamento de nota/frequência → boletim/PDF.
- [ ] Recuperação de senha (e-mail real chega).
- [ ] Terminal facial (entrada/saída) em device.

---

## 🟡 Importantes — recomendado antes do lançamento

### 7. iOS (Capacitor) — decisão consciente
- [ ] **Decidir:** aceitar PWA como fallback para iOS no go-live **OU** compilar via Xcode (requer conta Apple Developer).

> Android está pronto (`versionCode 260402`). iOS nunca foi compilado — `docs/DIAGNOSTICO-ADAPTACAO-SEMED.md`. PWA é um fallback funcional.

### 8. Completar LGPD (risco legal)
- [ ] Finalizar `GET /api/lgpd/exportar-dados` (Art. 18/20) em formato interoperável (JSON/CSV).
- [ ] Implementar o job `executarExclusoesPendentes` (Art. 17) — hoje **não implementado** (`docs/FASE1-CONCLUSAO.md`).
- [ ] Agendar o cron de exclusão (Vercel Cron) com **CRON_SECRET** configurado.

### 9. ~~RLS das tabelas legadas~~ → coberto pelo item 4
- [x] Estratégia definida e migration entregue (`enable-rls-cobertura-total.sql`). ✅ *(17/06/2026)*

> **Correção de premissa:** a auditoria sugeria "helpers `SECURITY DEFINER` + `auth.uid()`" (padrão KontrolReq/KontrolMed). **Isso NÃO se aplica ao SISAM** — ele usa JWT próprio e `pg` pool como `service_role`, não Supabase Auth; `auth.uid()` seria sempre `NULL`. A multi-tenancy fina fica na camada de app (`withAuth` + WHERE builder). No banco, RLS aqui é **defesa em profundidade binária por role** (bloqueia anon/PostgREST), não autorização por linha. Por isso a solução correta é apenas habilitar RLS (item 4), não escrever policies por `auth.uid()`.

### 10. Endurecer fluxo de senha
- [x] **HIBP (senha vazada)** — implementado em `lib/utils/senha-vazada.ts`, plugado em 5 rotas de senha escolhida (falha-aberto). ✅ *(17/06/2026)*
- [x] **Gerador de senha forte** — `lib/utils/gerar-senha.ts` (isomórfico, Web Crypto), botão "Gerar" no modal de usuário + usado em `criar-admin`/`init`. ✅ *(17/06/2026)*
- [x] **Rate limit por usuário** nos pontos de credencial. ✅ *(17/06/2026)* — Correção de premissa: `login` e `2fa/verify` **já tinham** camada por usuário em Redis (não só por IP). O gap real era `2fa/ativar-prelogin` (validava código TOTP de 6 dígitos no setup pré-login sem rate limit → brute-forceável); corrigido espelhando o padrão do `2fa/verify` (5 tentativas/15min → 30min).

### 11. Qualidade de CI/testes
- [ ] Endurecer lint no CI: `--max-warnings 0` (hoje `100` em `.github/workflows/ci.yml:39`).
- [ ] Adicionar E2E Playwright para a jornada crítica (hoje há ~1 E2E; cobertura de rotas < 30%).
- [ ] Confirmar GitHub Actions **verde** no commit de release (Node 20).

### 12. Higiene de repositório
- [ ] `git worktree prune` + remover worktrees Claude temporárias.
- [ ] **Atualizar `.env.example`** — hoje lista só DB/JWT; faltam RESEND, SENTRY, UPSTASH, CRON_SECRET, FCM, LOG_*.

---

## 🟢 Pós-lançamento (dívida técnica)

- [ ] Decompor 5 arquivos > 700 linhas (ex.: `lib/relatorios/gerador-pdf.tsx` 1008 linhas) — `docs/DIVIDA-TECNICA.md`.
- [ ] Investigar N+1 suspeitas em dashboards (`DEBUG=pool:queries` em staging).
- [ ] Read-replica Supabase se pico de acessos saturar conexões (>100 simultâneos).
- [ ] Diário de classe: conteúdo ministrado + atividades por aula.
- [ ] Assinatura digital ICP-Brasil no histórico escolar.
- [ ] Verificação automatizada de backup (alertar se > 24h sem sucesso).
- [ ] Avaliar upgrade Capacitor e revisão de índices órfãos/redundantes.

### Reorganização de rotas por módulo (concluída 17/06/2026)

Todas as páginas migraram de `/admin/<pagina>` para `/admin/<modulo>/<pagina>`
(sisam/gestor/semed/transparencia/admin), com redirects de compatibilidade e
validação de módulo por layout (`ModuloGuard`). **Pendência única:**

- [ ] **Promover redirects 307 → 308** (permanente) — **somente após** o deploy
      rodar estável em produção por alguns dias **sem nenhum 404 ou redirect
      torto reportado** (todos os perfis, bookmarks reais).
  - **Por quê esperar:** 308 é cacheado **permanentemente** pelos navegadores —
    se uma rota estiver mal mapeada, fica quase impossível reverter (cada
    navegador que recebeu o 308 não consulta mais o servidor). 307 não cacheia.
  - **Como promover (mudança de 1 linha):** em `next.config.js`, no helper
    `gerarRedirects`, trocar `permanent: false` → `permanent: true` nas duas
    entradas (rota base e `:path*`) e nos 2 redirects de dashboard renomeado
    (`dashboard-gestor`, `dashboard-semed`). Rodar `npm run build` e revalidar.
  - **Antes de promover:** confirmar no log de produção que não há
    `404` recorrente em `/admin/*` nem loops de redirect.

---

## 🔧 Verificação pré-deploy (rodar localmente)

```bash
# Tipos
npx tsc --noEmit

# Testes (deve dar 761+ verdes)
npx vitest run

# Lint
npm run lint

# Build de produção (valida env vars obrigatórias)
NODE_ENV=production npm run build
```

| Checagem | Comando | Estado em 17/06/2026 |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ exit 0 |
| Testes | `npx vitest run` | ✅ 761/761 |
| Migrations RLS aplicadas em prod | Supabase MCP / Dashboard | ⏳ pendente (item 4) |
| Env vars de produção | Painel Vercel | ⏳ pendente (itens 1–3, 5) |

---

## 📌 Resumo

| Categoria | Qtd | O que falta, em uma linha |
|---|---|---|
| 🔴 Bloqueadores | 6 | Configurar env (DB/JWT/Resend/Sentry/Firebase) + aplicar RLS SEMED + smoke test |
| 🟡 Importantes | 6 | iOS, LGPD, RLS legado, senha, CI/E2E, higiene |
| 🟢 Pós-lançamento | 7 | Refactors, performance, features incrementais |

**Conclusão:** não há bugs críticos de código. O caminho para produção é principalmente **operacional** (credenciais de terceiros + aplicação de migrations). Estimativa para fechar os 🔴: **1–2 dias**, sendo a maior parte espera de provisionamento (Resend, Sentry, Firebase, Supabase).
