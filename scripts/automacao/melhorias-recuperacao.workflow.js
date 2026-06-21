export const meta = {
  name: 'melhorias-recuperacao',
  description: 'Re-implementa REVISADO e gated as melhorias barradas da onda de cobertura: (A) dual-write de recuperacao idempotente (UPSERT ON CONFLICT nota_id_origem) + migration do indice unico; (B) UPSERT de notas_escolares com parecer/disciplina null + saneamento de indices/FKs; (C) ajustar callers (rotas) afetados. Demo-only, migrations versionadas+aplicadas, tsc+vitest com revert. NUNCA push.',
  phases: [
    { title: 'A: dual-write idempotente' },
    { title: 'B: notas UPSERT + indices' },
    { title: 'C: callers + verificacao' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const BRANCH = 'auto/melhorias-recuperacao'
const DEMO_REF = 'tbbnswuqsqhulserwtcc'
const CO = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

const REGRAS = [
  `REGRAS: branch ${BRANCH}; NUNCA git push; banco APENAS educanet-demo (project_id="${DEMO_REF}"), producao desvinculada.`,
  `Migrations idempotentes: arquivo em database/migrations/ com cabecalho (objetivo+rollback) + commit ANTES de aplicar via apply_migration no demo. Para operacao destrutiva (DROP de indice/constraint duplicado) use guarda IF EXISTS e confirme que e seguro no demo.`,
  `Codigo so commita se "npx tsc --noEmit" e "npx vitest run" passarem; se quebrar, git restore e status "parcial". SEMPRE deixe a arvore verde. Padroes do CLAUDE.md.`,
  `Ao ajustar um teste para refletir codigo novo, NAO afrouxe assercao para mascarar bug — o teste deve provar o comportamento novo correto.`,
].join('\n')

const RES = {
  type: 'object',
  properties: {
    etapa: { type: 'string' },
    status: { type: 'string', enum: ['implementado', 'parcial', 'revertido', 'erro'] },
    arquivos: { type: 'array', items: { type: 'string' } },
    migrationsAplicadas: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
    detalhe: { type: 'string' },
    pendencias: { type: 'array', items: { type: 'string' } },
  },
  required: ['etapa', 'status', 'detalhe'],
}

const out = {}

// A — Dual-write idempotente -------------------------------------------------
phase('A: dual-write idempotente')
out.A = await agent([
  `MELHORIA A — Dual-write de recuperacao IDEMPOTENTE. ${REGRAS}`,
  `Hoje lib/services/notas/recuperacao-dual-write.ts faz DELETE por nota_id_origem + INSERT (3 queries: DELETE + INSERT + ponte). Troque para UPSERT idempotente:`,
  `  INSERT INTO recuperacoes_escolares (...) VALUES (...) ON CONFLICT (nota_id_origem) WHERE nota_id_origem IS NOT NULL DO UPDATE SET <colunas nao-chave> ... RETURNING id; + INSERT na ponte recuperacoes_periodos com ON CONFLICT DO NOTHING. (2 queries no caminho "tem recuperacao").`,
  `  Mantenha o caminho de nota_recuperacao NULL (remover a recuperacao espelhada via DELETE) e disciplina null (ignorar) como hoje.`,
  `PRE-REQUISITO de banco: o ON CONFLICT (nota_id_origem) exige UNIQUE INDEX PARCIAL. Escreva migration idempotente "recuperacoes-nota-origem-unique.sql": antes de criar, faca uma checagem de duplicatas (RAISE EXCEPTION se houver) e entao CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_esc_nota_origem ON recuperacoes_escolares(nota_id_origem) WHERE nota_id_origem IS NOT NULL. Commit a migration, aplique no demo (apply_migration) e confirme via pg_indexes que o indice unico existe (no demo provavelmente JA existe — a migration deve ser no-op idempotente).`,
  `Atualize __tests__/unit/recuperacao-esquemas-adr005.test.ts para refletir o UPSERT (2 queries: 1 INSERT...ON CONFLICT + 1 ponte; verificar 'ON CONFLICT (nota_id_origem)' e o esquema nos params). Isso e legitimo (prova o comportamento novo), nao mascaramento.`,
  `Rode tsc+vitest. Commits: "fix(notas): dual-write de recuperacao idempotente (UPSERT ON CONFLICT)" e a migration. Retorne resultado.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'A: dual-write idempotente', label: 'A:dual-write', schema: RES }).catch((e) => ({ etapa: 'A', status: 'erro', detalhe: String(e && e.message) }))
log(`A dual-write: ${out.A && out.A.status}`)

// B — notas_escolares UPSERT (parecer/disciplina null) + indices/FKs ---------
phase('B: notas UPSERT + indices')
out.B = await agent([
  `MELHORIA B — UPSERT de notas_escolares com parecer/disciplina null + saneamento de indices/FKs. ${REGRAS}`,
  `PARTE 1 (analise + fix de codigo): investigue o UPSERT de notas_escolares no lancamento (lib/services/notas/lancamento.ts). A UNIQUE e (aluno_id, disciplina_id, periodo_id); quando disciplina_id e NULL (ex.: parecer descritivo sem disciplina) o NULL nao deduplica no UNIQUE padrao, podendo gerar duplicatas / ON CONFLICT que nao casa. Diagnostique o comportamento real (leia o codigo e, se preciso, consulte o schema no demo) e aplique a correcao MAIS SEGURA e ADITIVA possivel (ex.: indice unico parcial para o caso disciplina_id IS NULL, e/ou ajustar o conflict target/where do UPSERT). Se a correcao exigir decisao de produto ou risco alto, faca o minimo seguro e marque o resto como pendencia.`,
  `PARTE 2 (higiene de banco): crie migration idempotente para remover indices duplicados e adicionar indices faltantes em FKs (saneamento). Use DROP INDEX IF EXISTS para os comprovadamente redundantes (confirme no demo via pg_indexes que sao duplicatas exatas antes) e CREATE INDEX IF NOT EXISTS para FKs sem indice. Nao toque em indices que dao suporte a ON CONFLICT.`,
  `Commit as migrations ANTES de aplicar; aplique no demo; confirme efeito. Rode tsc+vitest. Commits com prefixo fix/chore. Retorne resultado + pendencias.`,
].join('\n'), { agentType: 'especialista-banco-sisam', phase: 'B: notas UPSERT + indices', label: 'B:notas+indices', schema: RES }).catch((e) => ({ etapa: 'B', status: 'erro', detalhe: String(e && e.message) }))
log(`B notas+indices: ${out.B && out.B.status}`)

// C — callers afetados + verificacao final -----------------------------------
phase('C: callers + verificacao')
out.C = await agent([
  `MELHORIA C — ajustar callers afetados por A/B + verificacao final. ${REGRAS}`,
  `1. Rode "npx tsc --noEmit". Se A/B mudaram assinaturas/comportamento que quebrem chamadores, conserte os afetados — priorize as rotas relacionadas a notas/recuperacao: app/api/admin/{conselho-classe,notas-escolares,recalcular-niveis}/route.ts, app/api/admin/escolas/[id]/regras-avaliacao/route.ts, app/api/professor/notas/route.ts. Faca a MUDANCA MINIMA necessaria para compilar/funcionar.`,
  `2. NAO reproduza mudancas avulsas de paginas/UI (charts, personalizacao, etc.) — nao ha spec; se o tsc nao acusar, nao mexa. Liste o que NAO reproduziu.`,
  `3. Rode a suite completa: "npx tsc --noEmit" e "npx vitest run". Reporte os numeros exatos. Confirme no demo (project_id="${DEMO_REF}") que as migrations de A/B estao aplicadas (pg_indexes).`,
  `Se algo ficar vermelho, conserte ou reverta a parte problematica (a arvore precisa ficar verde). Commit "fix(notas): ajusta callers do dual-write/UPSERT" se houver mudanca. Retorne resultado + numeros finais + lista do que nao foi reproduzido.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'C: callers + verificacao', label: 'C:callers+verif', schema: RES }).catch((e) => ({ etapa: 'C', status: 'erro', detalhe: String(e && e.message) }))
log(`C callers+verif: ${out.C && out.C.status}`)

return {
  banco: 'educanet-demo',
  producao: 'desvinculada',
  A: out.A, B: out.B, C: out.C,
  naoReproduzido: 'Mudancas avulsas de 6 paginas (charts/personalizacao/etc.) da onda de cobertura — sem spec; reproduzidas apenas se o tsc exigisse.',
}
