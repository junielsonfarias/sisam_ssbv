# Revisão Noturna Automatizada — SISAM

Automação que revisa, corrige e verifica **o sistema inteiro** em ciclos, aceitando as
correções automaticamente, até **09:00 de 21/06/2026**.

## O que ela faz (por ciclo)

1. **Revisão (paralela, read-only)** — o agente `revisor-sisam` analisa cada um dos 16
   módulos (API, services, pages/components, database) e produz um pacote de correções
   por severidade.
2. **Correção (sequencial)** — o agente `implementador-sisam` aplica as correções de cada
   módulo, **uma de cada vez** (sequencial para não haver corrida de `git` na mesma branch).
3. **Verificação automática** — após cada módulo: `npx tsc --noEmit` + `npx vitest run`.
   - ✅ Verde → `git commit` por módulo (`fix(modulo): ciclo N - ...`). **Sem push.**
   - ❌ Vermelho → **revert automático** daquele módulo + anotação no log.
4. **Consolidação** — resumo do ciclo (aprovados / revertidos / erros) gravado no log.

A cada novo ciclo o `revisor-sisam` **re-revisa** os módulos, confirmando se o que foi
corrigido ficou adequado e pegando regressões — é o "loop das revisões" pedido.

## Arquitetura (3 camadas)

| Camada | Ferramenta | Papel |
|--------|-----------|-------|
| Motor | `scripts/automacao/revisao-noturna.workflow.js` (Workflow) | Executa **1 ciclo** completo. As edições dos subagentes são aplicadas automaticamente (auto-aceitação). |
| Driver | Skill `/loop` (modo dinâmico, `ScheduleWakeup`) | Dispara o motor repetidamente, conta os ciclos (5 completos, depois segue revisando), checa o horário e **sobrevive ao reset de créditos** re-agendando o próximo disparo. |
| Estado | `docs/automacao/estado.json` + `log.md` | Persistem ciclo atual e histórico — sobrevivem a reinícios. |

## Retomada após reset de créditos (v2 — corrigido)

Quando um ciclo falha por limite de sessão, o driver agora:

1. **Lê o horário de reset** da mensagem de falha (ex.: `resets 1:10am America/Fortaleza`).
2. Calcula o tempo até **reset + 2 min** com `scripts/automacao/calc-retomada.js`.
3. Grava o estado de pausa em `estado.json` (`retomadaPosCreditos.status = "pausado"`,
   `resetEm`, `retomarEm`, `cicloPendente`).
4. **Inicia um `sleep` em background** com a duração exata até *reset + 2 min*. Esse timer:
   - roda no nível do SO, **independe de créditos**;
   - aguenta esperas **> 1 h** num disparo só (sem o teto de 1 h do ScheduleWakeup);
   - **não dispara na "zona morta"** (sem fires intermediários que morreriam sem crédito);
   - ao terminar, **reinvoca o agente** — e nesse momento os créditos já voltaram.
5. Ao acordar, o driver limpa a pausa e **re-dispara o ciclo pendente** do ponto salvo
   (módulos já corrigidos estão commitados; o novo ciclo re-revisa tudo, nada se perde).

> Por que mudou: na 1ª versão a rede de segurança era um `ScheduleWakeup` cego de 30 min.
> Quando o limite caiu às 23:15 (reset 01:10), os fires de 30 min caíam dentro da janela
> sem crédito, a corrente quebrava e a retomada só ocorreu às 07:47. O `sleep` até
> *reset + 2 min* elimina exatamente esse buraco.

## Limites honestos (leia)

- **A sessão/terminal precisa ficar aberta.** O loop roda *dentro desta sessão* do Claude
  Code. Se a janela for fechada, a automação para.
- **Reset de créditos (v2):** ao bater o limite, o driver agenda um `sleep` em background
  até *reset + 2 min* e retoma sozinho nesse instante (ver seção "Retomada após reset de
  créditos"). Requisito: a **sessão precisa ficar aberta** e o PC **não pode suspender**
  (o `sleep` é pausado se o SO hibernar).
- **Auto-aceitação:** dentro do Workflow os subagentes editam arquivos sem prompt. Para o
  driver lançar os workflows sem pedir confirmação a cada ciclo, rode o Claude Code em modo
  de permissões que aceite a ferramenta `Workflow` (ex.: aceitar/bypass de permissões).
- **Segurança:** nada é commitado quebrado (revert automático) e **nunca há push** — tudo
  fica na branch `auto/revisao-noturna` para você revisar de manhã com
  `git log auto/revisao-noturna` e `git diff main..auto/revisao-noturna`.

## Como acompanhar / parar

- Acompanhar: `docs/automacao/log.md` e `/workflows` (progresso ao vivo do ciclo atual).
- Parar: interrompa o loop (Esc / encerrar a sessão) — nenhum trabalho fica pela metade
  commitado (o módulo em andamento só commita se passar na verificação).

## De manhã (revisão dos resultados)

```bash
git log --oneline auto/revisao-noturna ^main      # o que foi feito
git diff main..auto/revisao-noturna               # diff completo
# se aprovar:  git checkout main && git merge auto/revisao-noturna
# push é decisão sua (dispara deploy no Vercel)
```
