# ADR-003 — Bidirecionalidade Sisam → boletim (resultados da Avaliação Municipal)

**Status:** Proposta (aguardando decisão do time)
**Data:** 2026-06-21
**Autores:** FlowSchoolAgent (ciclos 1–6) · documentador-sisam

---

## Contexto

O Sisam (Sistema de Avaliação Municipal) produz dois tipos de resultado por aluno:

- `resultados_provas` — respostas por questão (aluno × questão × avaliação)
- `resultados_consolidados` — média/nível por aluno e avaliação

Esses resultados são gravados pelo ETL de importação e consumidos de forma
**estritamente read-only** pelo portal do responsável e pelo boletim. O
boletim atual faz um JOIN em `resultados_consolidados` para exibir o
desempenho na Avaliação Municipal como informação paralela — nunca misturada
com a nota escolar regular.

O que **não existe** hoje:

- Qualquer coluna `avaliacao_id` em `notas_escolares`.
- Qualquer mecanismo de write-back de resultado Sisam para `notas_escolares`.
- Qualquer definição de requisito pedagógico sobre se o resultado da avaliação
  externa deve ou não compor a nota escolar.

Nos ciclos de auditoria, a recomendação explícita foi **não implementar
write-back automático** sem decisão de produto documentada
(`relatorio-ciclo-4.md` §[S3]; `relatorio-ciclo-5.md` §[S3];
`relatorio-ciclo-6.md` §[S5]).

### Situação observada no banco demo (2026-06-21)

- 353 alunos ativos em séries participantes do Sisam sem nenhum
  `resultados_provas` (`relatorio-ciclo-5.md` §2).
- 48 `resultados_consolidados` sem `resultados_provas` correspondentes
  (consolidado órfão — pipeline de consolidação com falha residual).
- `notas_escolares` não possui `avaliacao_id`; nenhum JOIN entre
  `notas_escolares` e `resultados_consolidados` existe no código hoje.

---

## Decisão proposta

**Tratar o resultado do Sisam como seção complementar no boletim**, vinculada
por `avaliacao_id`, sem interferir na nota escolar regular (notas de bimestre,
médias, conceitos).

Concretamente:

1. **Não adicionar `avaliacao_id` em `notas_escolares`**. Avaliação Municipal e
   nota escolar são registros independentes com semântica distinta.
2. Criar (ou formalizar) uma **seção "Avaliação Municipal" no boletim**, lendo
   diretamente de `resultados_consolidados WHERE avaliacao_id = ?`.
3. Caso o time defina, no futuro, que o resultado Sisam deve compor a nota,
   implementar via ação deliberada no Gestor (campo `origem='sisam'` em
   `notas_escolares`, nunca pelo ETL silenciosamente), com trilha de auditoria
   e reversão possível.

A recomendação clara é: **não implementar write-back** neste momento; formalizar
a seção complementar no boletim como entrega autônoma.

---

## Alternativas consideradas

### A1 — Nota derivada no boletim (write-back em `notas_escolares`)

Adicionar `avaliacao_id` em `notas_escolares` e gravar o resultado Sisam como
nota de componente avaliativo.

**Prós:** nota Sisam aparece no boletim junto com as demais; professores e
responsáveis veem tudo em um lugar.

**Contras:** mistura avaliação externa (Sisam) com nota escolar interna
(professor); viola o princípio de que módulo externo não altera dado mestre do
Gestor; cria dependência de dado: boletim passa a depender de importação do
Sisam para estar completo; reversão requer DELETE de notas (destrutivo);
exige decisão pedagógica formal (peso, componente, bimestre) que ainda não
existe.

### A2 — Seção complementar no boletim (proposta)

Exibir resultado Sisam em seção separada no boletim, sem tocar `notas_escolares`.

**Prós:** separação clara de responsabilidades; zero impacto em nota oficial;
implementação aditiva (nenhum DROP ou migração de dado); reversível.

**Contras:** o resultado Sisam não aparece no mesmo "bloco" que as notas
escolares — pode causar confusão para responsáveis.

### A3 — Não integrar (manter status quo)

Manter o `resultados_consolidados` apenas no portal do responsável, sem
qualquer exibição no boletim.

**Prós:** zero risco; nenhuma mudança.

**Contras:** desperdiça dado avaliativo relevante; responsável precisa acessar
dois lugares para ver o desempenho completo do aluno.

A proposta adotada é A2, que é a mais segura e a única implementável sem
decisão pedagógica formal.

---

## Consequências

### Schema

Nenhuma alteração em `notas_escolares`. Nenhum `avaliacao_id` adicionado.

Se o time quiser enriquecer a seção complementar com metadados por aluno/prova,
pode-se criar uma tabela `resultados_externos` ou formalizar o JOIN já
existente entre boletim e `resultados_consolidados`, sem tocar o schema de
notas.

### Migração necessária

- Confirmar que o boletim (componente frontend) já lê `resultados_consolidados`
  por aluno+ano — foi indicado como "conforme" no ciclo 5 (`relatorio-ciclo-5.md` §2).
- Garantir que a seção complementar fica visualmente distinta da nota escolar
  (label "Avaliação Municipal" ou similar).
- Corrigir os 48 consolidados órfãos (sem `resultados_provas` correspondentes)
  antes de exibir no boletim — risco de dado inconsistente.

### Requisitos pendentes de decisão do time

Antes de qualquer write-back (A1), o time precisa definir:

1. O resultado Sisam compõe a nota final? Em qual bimestre? Com qual peso?
2. O que acontece com o boletim se a importação Sisam não for realizada?
3. A inversão é possível (Gestor cancela write-back)? Como?

Sem essas respostas, a alternativa A1 não deve ser implementada.

### Riscos do status quo

- Os 353 alunos sem `resultados_provas` e os 48 consolidados órfãos
  (`relatorio-ciclo-5.md` §2) podem gerar seção complementar incompleta ou
  vazia no boletim. Recomendar resolução do pipeline de consolidação antes da
  exibição (`app/api/admin/importar-resultados/batch-inserts.ts`).

---

## Plano de migração (aditivo)

| Passo | Ação | Quem | Observação |
|-------|------|------|------------|
| 1 | Confirmar JOIN atual boletim → `resultados_consolidados` no código (ler `app/api/professor/boletim` ou equivalente) | implementador-sisam | Pode ser no-op se já estiver feito |
| 2 | Corrigir 48 consolidados órfãos (sem `resultados_provas`) | especialista-banco-sisam | Decisão: expurgar ou gerar provas detalhadas |
| 3 | Garantir label visual "Avaliação Municipal" distinto de nota escolar no boletim | frontend-sisam | Sem alterar `notas_escolares` |
| 4 | Documentar formalmente a decisão do time sobre write-back (reunião de produto) | time | Resultado desse ADR |
| 5 | Se aprovado write-back no futuro: implementar via ação deliberada no Gestor, com `origem='sisam'` em `notas_escolares`, somente após ADR revisado | implementador-sisam | Fora do escopo atual |

---

## Referências

- `docs/automacao/fluxo-escolar/relatorio-ciclo-1.md` §3 ("Sisam -> Boletim: `notas_escolares` não tem `avaliacao_id`")
- `docs/automacao/fluxo-escolar/relatorio-ciclo-4.md` §2 ("Retorno Sisam → Gestor: conforme — read-only") e §[S3]
- `docs/automacao/fluxo-escolar/relatorio-ciclo-5.md` §2 (353 alunos sem `resultados_provas`; 48 consolidados órfãos) e §[S3]
- `docs/automacao/fluxo-escolar/relatorio-ciclo-6.md` §[S5] ("não implementar write-back sem decisão de produto explícita")
- `lib/services/importacao/batch/resultados.ts` — pipeline de importação de resultados
- `app/api/admin/importar-resultados/` — rota de importação de resultados
