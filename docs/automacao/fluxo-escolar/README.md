# FlowSchoolAgent — Governança e Consistência do Fluxo Escolar

Automação que garante que o **Gestor Escolar seja o coração do sistema** (fonte única das
informações mestras) e que os dados migrem automaticamente para os demais módulos
(Sisam / Avaliação Municipal, Semed, Financeiro, Portal do Aluno, etc.).

Roda **5 ciclos** e para. Retoma sozinha após reset de créditos.

## O que cada ciclo faz

1. **Extrair fluxo atual** (read-only, paralelo)
   - `especialista-banco-sisam`: mapeia tabelas mestras e relacionamentos (Escola → Ano
     Letivo → Série → Turma → Disciplina → Professor → Aluno) no `educanet-demo`.
   - `arquiteto-sisam`: mapeia no código os fluxos de migração/sincronização entre módulos.
   - `especialista-banco-sisam`: checagens de consistência (órfãos, não-migrados, duplicados).
2. **Comparar com o modelo ideal** → tabela de gaps (integração | status | gap | prioridade)
   + recomendações priorizadas. Cada gap é classificado em `codigo`, `banco-naodestrutivo`,
   `banco-destrutivo` ou `dados`.
3. **Correções** (sequencial)
   - `codigo` → aplica + `tsc`+`vitest` → commit (verde) / revert (vermelho).
   - `banco-naodestrutivo` → escreve migration idempotente em `database/migrations/`,
     commita, e aplica **só no `educanet-demo`**.
   - `banco-destrutivo` e `dados` → **não aplica**; vira proposta no relatório.
4. **Relatório** → `docs/automacao/fluxo-escolar/relatorio-ciclo-N.md` no formato oficial
   do agente (📊 RELATÓRIO DO AGENTE).

## Regras de segurança (inegociáveis)

| Aspecto | Regra (atualizada — demo-only) |
|---|---|
| Banco único | **`educanet-demo`** (`tbbnswuqsqhulserwtcc`) — leitura **e** escrita. |
| Produção | **DESVINCULADA**: a automação não lê nem escreve em produção. |
| Migrations | Versionadas + commit **antes** de aplicar; idempotentes quando possível. |
| Destrutivo / dados | **Aplicados no demo** (DROP de índice/FK duplicado, backfills) — é sandbox. |
| Bloqueio externo | Backfill que depende de dado externo (CPF/INEP) **não** é inventado → `bloqueado-dados`. |
| Código | Só entra se passar `tsc` + `vitest`; senão revert. |
| Push | **Nunca** (tudo na branch `auto/fluxo-escolar`). |

> ⚠️ Importante: a safety net "revert no vermelho" cobre **código** (git desfaz). Mudanças
> aplicadas no banco (mesmo no demo) **não** são revertidas pelo git — por isso a escrita é
> restrita ao demo e só a operações idempotentes/não-destrutivas.

## Retomada após reset de créditos

Igual à revisão noturna v2: ao bater o limite, o driver calcula o tempo até *reset + 2 min*
(`scripts/automacao/calc-retomada.js`), grava a pausa no `estado.json` e dorme em background
até lá, retomando o ciclo pendente quando os créditos voltam.

## Acompanhar / revisar

```bash
cat docs/automacao/fluxo-escolar/relatorio-ciclo-1.md   # relatório do ciclo
git log --oneline auto/fluxo-escolar ^main              # o que foi feito
git diff main..auto/fluxo-escolar                        # diff de código/migrations
```
O push (deploy) e a aplicação em produção continuam 100% sua decisão.
