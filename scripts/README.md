# Scripts de Manutenção do SISAM

Este diretório contém scripts utilitários para administração, migração, seed e manutenção do sistema SISAM.

A partir da Fase 1 da adaptação SEMED, a pasta foi reorganizada por categoria.

---

## Estrutura

```
scripts/
├── migrations/   # Migrações de schema (versionadas, tracked no git)
├── seed/         # Setup inicial, seed e aplicação de schema
├── backup/       # Backup e restore do banco
├── build/        # Geração de assets (ícones PWA, etc.)
├── local/        # (vazia) reservada para scripts locais futuros
└── README.md
```

> **Importante:** os 159+ scripts locais (prefixos `testar-`, `verificar-`, `corrigir-`, `limpar-`, `analisar-`, `diagnostico-`, `configurar-`, `unificar-`, `listar-`, etc.) estão no `.gitignore` e permanecem na raiz de `scripts/`. Eles não são versionados, mas continuam funcionando normalmente.

---

## `scripts/migrations/` — Migrações de Banco

Scripts versionados que aplicam alterações de schema ao banco. Idempotentes quando possível.

| Script | npm | Descrição |
|--------|-----|-----------|
| `migrate-add-tables.js` | `npm run migrate` | Tabelas auxiliares iniciais |
| `migrate-add-presenca.js` | `npm run migrate-presenca` | Tabela de frequência diária |
| `migrate-add-consolidados.js` | `npm run migrate-consolidados` | Resultados consolidados |
| `migrate-add-alternativa-marcada.js` | `npm run migrate-alternativa` | Campo alternativa marcada |
| `migrate-personalizacao.js` | `npm run migrate-personalizacao` | Personalização visual |
| `migrate-pausar-cancelar.js` | `npm run migrate-pausar-cancelar` | Pausar/cancelar importação |
| `migrate-otimizar-importacao.js` | `npm run migrate-otimizar-importacao` | Otimização da importação |
| `migrate-questoes-melhorias.js` | `npm run migrate-questoes` | Melhorias no banco de questões |
| `migrate-estrutura-series.js` | `npm run migrate-estrutura-series` | Estrutura de séries |
| `migrate-corrigir-cascade-divergencias.js` | `npm run migrate-cascade-divergencias` | Cascade de divergências |
| `migrate-corrigir-view-nota-producao.js` | — | View de nota de produção |
| `migrate-divergencias-historico.js` | — | Histórico de divergências |
| `migrate-media-producao-obrigatoria.js` | — | Média de produção obrigatória |
| `migracao-unificar-tabelas.js` | — | Unificação de tabelas |
| `aplicar-migracao-unificar-tabelas.js` | — | Aplica migração de unificação |

---

## `scripts/seed/` — Setup e Seed

Scripts para configuração inicial e popular dados.

| Script | npm | Descrição |
|--------|-----|-----------|
| `setup-database.js` | `npm run setup-db` | Cria schema do banco |
| `seed.js` | `npm run seed` | Popula dados iniciais (PostgreSQL local) |
| `seed-supabase.js` | `npm run seed-supabase` | Popula dados iniciais (Supabase) |
| `aplicar-schema-supabase.js` | `npm run aplicar-schema-supabase` | Aplica schema completo no Supabase |
| `aplicar-ano-letivo-importacoes.js` | `npm run aplicar-ano-letivo` | Aplica ano letivo em importações |
| `init-production.js` | — | Inicialização do ambiente de produção |

---

## `scripts/backup/` — Backup e Restore

| Script | npm | Descrição |
|--------|-----|-----------|
| `backup-database.sh` | `npm run backup` | Dump completo do banco (pg_dump) |
| `restore-database.sh` | `npm run restore` | Restaura backup |

> A Fase 1 da adaptação SEMED inclui melhoria desses scripts (rotação automática, validação de integridade, README operacional).

---

## `scripts/build/` — Geração de Assets

| Script | Descrição |
|--------|-----------|
| `generate-pwa-icons.js` | Gera ícones PWA em múltiplos tamanhos a partir do logo |

---

## Scripts Locais (não versionados)

Permanecem na raiz de `scripts/` mas estão no `.gitignore`. São scripts de diagnóstico, teste e correção pontual usados durante desenvolvimento.

Padrões cobertos pelo `.gitignore`:

```
scripts/testar-*       scripts/verificar-*    scripts/diagnostico-*
scripts/corrigir-*     scripts/limpar-*       scripts/analisar-*
scripts/unificar-*     scripts/popular-*      scripts/vincular-*
scripts/listar-*       scripts/encontrar-*    scripts/buscar-*
scripts/check-*        scripts/fix-*          scripts/atualizar-*
scripts/calcular-*     scripts/recalcular-*   scripts/monitorar-*
scripts/adicionar-*    scripts/remover-*      scripts/cancelar-*
scripts/manter-*       scripts/forcar-*       scripts/otimizar-*
scripts/configurar-*   scripts/mostrar-*      scripts/vercel-*
scripts/find-*         scripts/test-*         scripts/teste-*
scripts/executar-*     scripts/excluir-*      scripts/investigar-*
scripts/analise-*      scripts/revisao-*      scripts/list-*
scripts/prepare-*
```

A subpasta `scripts/local/` foi criada como sugestão para organizá-los manualmente no futuro, mas movê-los exige atualizar workflows locais — preferi não fazer agora para não quebrar processos do dia a dia.

---

## Como Executar

```bash
# Via npm (preferido — já aponta para subpasta correta)
npm run migrate
npm run seed-supabase

# Direto via node (sempre informe o caminho completo a partir da raiz)
node scripts/migrations/migrate-add-tables.js
node scripts/seed/seed.js

# Backup/Restore
npm run backup
npm run restore
```

## Variáveis de Ambiente Necessárias

A maioria dos scripts requer:

- `DB_HOST` — Host do banco
- `DB_PORT` — Porta (5432 ou 6543 para Supabase Transaction Mode)
- `DB_NAME` — Nome do banco
- `DB_USER` — Usuário
- `DB_PASSWORD` — Senha
- `DB_SSL` — `true` em produção

Para integrações:

- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` — scripts de deploy Vercel
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — scripts Supabase

## Observações Importantes

1. **Backup primeiro**: sempre faça backup antes de executar scripts de correção, limpeza ou migration em produção
2. **Ambiente**: confira `.env.local` antes de rodar — fácil esquecer e atingir produção
3. **Logs**: scripts geram logs no console; redirecione com `> log.txt` se necessário
4. **Transações**: scripts de migration usam transações sempre que possível
5. **Idempotência**: migrations bem escritas podem ser executadas mais de uma vez sem efeito colateral

---

## Histórico

- **2026-05-25** — Reorganização em subpastas (`migrations/`, `seed/`, `backup/`, `build/`) durante Fase 1 da adaptação SEMED. Scripts locais mantidos na raiz.
