export const meta = {
  name: 'adr-implementacao',
  description: 'Implementa os 4 ADRs aceitos (fonte unica do Gestor Escolar), em ordem de dependencia, no banco educanet-demo. Por ADR: implementador (migration idempotente no demo + codigo, tsc+vitest, commit/revert) -> qa (testes). Producao desvinculada. NUNCA faz push. Sempre deixa a arvore verde.',
  phases: [
    { title: 'ADR-004 series' },
    { title: 'ADR-002 matriculas' },
    { title: 'ADR-001 match-only' },
    { title: 'ADR-003 boletim' },
    { title: 'Verificacao final' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const BRANCH = 'auto/adr-implementacao'
const DEMO_REF = 'tbbnswuqsqhulserwtcc'
const COAUTHOR = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

const REGRAS = [
  `REGRAS (inegociaveis):`,
  `- Branch ${BRANCH}. NUNCA git push.`,
  `- Banco: APENAS o educanet-demo (project_id="${DEMO_REF}"). Producao desvinculada (nao tocar).`,
  `- Migrations: idempotentes (IF EXISTS/IF NOT EXISTS), escritas em database/migrations/ com cabecalho (objetivo+rollback) e COMMITADAS antes de aplicar (apply_migration no demo).`,
  `- Mudancas de modelo devem ser ADITIVAS primeiro (nova coluna/tabela + backfill), sem dropar o que esta em uso.`,
  `- Codigo so e commitado se "npx tsc --noEmit" e "npx vitest run" passarem; se quebrar, REVERTA o codigo (git restore) e marque status "revertido"/"parcial" com explicacao. SEMPRE deixe a arvore verde.`,
  `- Siga os padroes do CLAUDE.md (Zod, withAuth, queries parametrizadas, alias @/, limite 400 linhas).`,
]

const ADRS = [
  { key: 'ADR-004 series', arquivo: 'docs/adr/ADR-004-fonte-canonica-series.md', phase: 'ADR-004 series',
    foco: 'series_escolares como fonte canonica: escritas (ETL + cadastros) passam a preencher serie_id/serie_escolar_id referenciando series_escolares.id; consultas-chave passam a usar serie_id. NAO dropar a coluna textual `serie` ainda (aditivo). Garantir backfill/consistencia no demo.' },
  { key: 'ADR-002 matriculas', arquivo: 'docs/adr/ADR-002-tabela-matriculas.md', phase: 'ADR-002 matriculas',
    foco: 'Criar tabela `matriculas` (aluno_id, turma_id, ano_letivo_id, serie_id, situacao, data_matricula, UNIQUE(aluno_id, ano_letivo_id)) aditiva; backfill a partir de alunos + historico_situacao no demo; service/leitura derivando o ano corrente. NAO remover alunos.turma_id (vira atalho derivado).' },
  { key: 'ADR-001 match-only', arquivo: 'docs/adr/ADR-001-etl-match-only.md', phase: 'ADR-001 match-only',
    foco: 'ETL Sisam em modo match-only por padrao: quando nao encontra mestre por chave, registra em tabela `importacao_divergencias` (criar, aditiva) em vez de criar mestre. Usar as chaves disponiveis (codigo/nome+escola+turma); a chave forte CPF/INEP fica como refinamento futuro (dados externos). Expor as divergencias no resultado.' },
  { key: 'ADR-003 boletim', arquivo: 'docs/adr/ADR-003-bidirecionalidade-sisam-boletim.md', phase: 'ADR-003 boletim',
    foco: 'Resultado do Sisam como SECAO COMPLEMENTAR no boletim (nao nota derivada): ligar via avaliacao_id (adicionar coluna/tabela aditiva conforme o ADR) e expor a secao na leitura do boletim. Sem misturar com a nota escolar regular.' },
]

const RES_SCHEMA = {
  type: 'object',
  properties: {
    adr: { type: 'string' },
    status: { type: 'string', enum: ['implementado', 'parcial', 'revertido', 'erro'] },
    migrationsAplicadas: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
    tscOk: { type: 'boolean' },
    vitestOk: { type: 'boolean' },
    detalhe: { type: 'string' },
    pendencias: { type: 'array', items: { type: 'string' } },
  },
  required: ['adr', 'status', 'detalhe'],
}

const QA_SCHEMA = {
  type: 'object',
  properties: {
    adr: { type: 'string' },
    testesAdicionados: { type: 'number' },
    vitestOk: { type: 'boolean' },
    commit: { type: 'string' },
    detalhe: { type: 'string' },
  },
  required: ['adr', 'vitestOk', 'detalhe'],
}

const resultados = []

for (let i = 0; i < ADRS.length; i++) {
  const adr = ADRS[i]
  phase(adr.phase)
  log(`Implementando ${adr.key}...`)

  const impl = await agent(
    [
      `Implemente o ${adr.key}. LEIA o ADR completo em ${adr.arquivo} (contexto, decisao, plano de migracao) antes de mexer.`,
      `Foco desta etapa: ${adr.foco}`,
      ``,
      REGRAS.join('\n'),
      ``,
      `PASSOS:`,
      `1. Leia o ADR e o codigo/schema atuais relevantes (use list_tables/execute_sql no demo para o schema real).`,
      `2. Migration aditiva idempotente em database/migrations/ -> commit -> apply_migration no demo -> verifique por consulta.`,
      `3. Ajuste o codigo (services/APIs) para usar a nova estrutura, mantendo compatibilidade (aditivo).`,
      `4. "npx tsc --noEmit" + "npx vitest run". Verde -> commit do codigo. Vermelho -> git restore do codigo (mantém a migration ja aplicada, que e idempotente) e status "parcial".`,
      `5. Liste pendencias que ficaram para depois (ex.: refinamento por CPF/INEP, corte de coluna textual).`,
      `Retorne o resultado estruturado.`,
    ].join('\n'),
    { agentType: 'implementador-sisam', phase: adr.phase, label: `impl:${adr.key}`.slice(0, 38), schema: RES_SCHEMA }
  ).catch((e) => ({ adr: adr.key, status: 'erro', detalhe: String(e && e.message || e) }))

  let qa = null
  if (impl && (impl.status === 'implementado' || impl.status === 'parcial')) {
    qa = await agent(
      [
        `Escreva testes para o que foi implementado no ${adr.key} (veja ${adr.arquivo} e os commits recentes na branch ${BRANCH}).`,
        `Cubra: caminho feliz, autorizacao/escopo quando aplicavel, e regressao do comportamento novo (migration/aditivo).`,
        `Vitest em __tests__/unit ou __tests__/integration/api com mocks de @/database/connection e @/lib/cache.`,
        `Rode "npx vitest run" — precisa ficar verde. Depois git add + commit "test(adr): ${adr.key}" + "${COAUTHOR}". NUNCA push.`,
        `Se nao houver superficie testavel util, retorne testesAdicionados=0 e explique.`,
      ].join('\n'),
      { agentType: 'qa-sisam', phase: adr.phase, label: `qa:${adr.key}`.slice(0, 38), schema: QA_SCHEMA }
    ).catch((e) => ({ adr: adr.key, vitestOk: false, detalhe: 'qa falhou: ' + (e && e.message) }))
  }

  resultados.push({ adr: adr.key, impl, qa })
  log(`${adr.key}: ${impl ? impl.status : 'erro'}${qa ? ' | qa:' + (qa.vitestOk ? 'ok' : 'fail') : ''}`)
}

// ============================================================
// Verificacao final
// ============================================================
phase('Verificacao final')

const verif = await agent(
  [
    `Verificacao final da implementacao dos 4 ADRs na branch ${BRANCH}.`,
    `1. Rode "npx tsc --noEmit" e "npx vitest run" e reporte os numeros exatos.`,
    `2. Liste as migrations novas (git log --oneline ^main) e confirme (list_migrations no demo project_id="${DEMO_REF}") que as aditivas estao aplicadas no demo, sem orfaos.`,
    `3. Se algo estiver vermelho, identifique o arquivo e a causa (nao tente um refator grande agora; so reporte).`,
    `NUNCA push.`,
  ].join('\n'),
  { agentType: 'qa-sisam', phase: 'Verificacao final', label: 'verif-final' }
).catch((e) => ('falha verificacao: ' + (e && e.message)))

const implementados = resultados.filter((r) => r.impl && r.impl.status === 'implementado')
const parciais = resultados.filter((r) => r.impl && r.impl.status === 'parcial')
const falhas = resultados.filter((r) => r.impl && (r.impl.status === 'revertido' || r.impl.status === 'erro'))

log(`ADRs -> implementados:${implementados.length} | parciais:${parciais.length} | falhas:${falhas.length}`)

return {
  banco: 'educanet-demo',
  producao: 'desvinculada',
  resultados: resultados.map((r) => ({
    adr: r.adr,
    status: r.impl ? r.impl.status : 'erro',
    migrations: r.impl && r.impl.migrationsAplicadas,
    pendencias: r.impl && r.impl.pendencias,
    qa: r.qa ? { testes: r.qa.testesAdicionados, ok: r.qa.vitestOk } : null,
  })),
  verificacaoFinal: verif,
}
