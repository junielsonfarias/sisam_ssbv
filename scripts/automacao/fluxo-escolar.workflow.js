export const meta = {
  name: 'fluxo-escolar',
  description: 'FlowSchoolAgent (demo-only): garante que o Gestor Escolar seja a fonte unica de verdade. Banco PRINCIPAL e UNICO = educanet-demo. Producao DESVINCULADA (nao le nem escreve). Aplica TODAS as correcoes encontradas (codigo com tsc+vitest+revert; migrations no demo, incluindo destrutivas e backfills de dados, sempre versionadas+commit antes). Valida todas as migrations. NUNCA faz push.',
  phases: [
    { title: 'Extrair fluxo' },
    { title: 'Comparar e gaps' },
    { title: 'Correcoes' },
    { title: 'Validar migrations' },
    { title: 'Relatorio' },
  ],
}

// ---- args (objeto OU string JSON) ----
let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const CICLO = ARGS.ciclo || 1
const BRANCH = 'auto/fluxo-escolar'
const COAUTHOR = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

// Banco UNICO = educanet-demo. Producao DESVINCULADA.
const DEMO_REF = 'tbbnswuqsqhulserwtcc'

const REGRA_BANCO = [
  `REGRA DE BANCO (demo-only):`,
  `- O banco PRINCIPAL e UNICO e o educanet-demo (project_id="${DEMO_REF}"). Toda leitura e escrita acontecem aqui.`,
  `- PRODUCAO ESTA DESVINCULADA: NAO leia, NAO escreva e NAO mencione nenhum outro project_id.`,
  `- Pode aplicar TODAS as correcoes de banco no demo, INCLUSIVE destrutivas (DROP de indice/constraint duplicado) e backfills de dados.`,
  `- SEMPRE escreva a mudanca como arquivo em database/migrations/ (cabecalho com objetivo + rollback) e COMMITE antes de aplicar (apply_migration / execute_sql no demo).`,
  `- Migrations idempotentes sempre que possivel (IF EXISTS / IF NOT EXISTS).`,
  `- EXCECAO: backfill que dependa de dado externo inexistente (ex.: CPF/INEP dos alunos) NAO pode ser inventado -> marque status "bloqueado-dados" e explique o que falta.`,
].join('\n')

// ============================================================
// FASE 1 — Extrair o fluxo atual (SOMENTE LEITURA, paralelo) — só demo
// ============================================================
phase('Extrair fluxo')
log(`Ciclo ${CICLO}: extraindo fluxo atual no educanet-demo (producao desvinculada)`)

const EXTRACAO_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    resumo: { type: 'string' },
    itens: { type: 'array', items: { type: 'string' } },
  },
  required: ['area', 'resumo', 'itens'],
}

const [banco, integracoes, consistencia] = await parallel([
  () => agent(
    [
      `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase EXTRACAO (somente leitura).`,
      `Banco unico: educanet-demo (project_id="${DEMO_REF}"). Producao desvinculada — nao acesse outro projeto.`,
      `Mapeie a ESTRUTURA do Gestor Escolar como fonte central: tabelas mestras (aluno, escola, ano letivo, serie, turma, disciplina, professor, matricula, frequencia, notas) e o encadeamento Escola -> Ano Letivo -> Serie -> Turma -> Disciplina -> Professor -> Aluno.`,
      `Aponte FKs, unicidade e onde dados mestres sao criados/mantidos. NAO altere nada.`,
    ].join('\n'),
    { agentType: 'especialista-banco-sisam', phase: 'Extrair fluxo', label: 'extrai:banco', schema: EXTRACAO_SCHEMA }
  ).catch(() => null),

  () => agent(
    [
      `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase EXTRACAO (somente leitura).`,
      `Mapeie no CODIGO os fluxos de migracao/sincronizacao entre o Gestor Escolar e os demais modulos (Sisam/Avaliacao Municipal, Semed, Financeiro, Portal). Mecanismo, arquivos, uni/bidirecional, e se algum modulo externo cria/altera mestre (anti-padrao). NAO altere nada.`,
    ].join('\n'),
    { agentType: 'arquiteto-sisam', phase: 'Extrair fluxo', label: 'extrai:integracoes', schema: EXTRACAO_SCHEMA }
  ).catch(() => null),

  () => agent(
    [
      `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase EXTRACAO (somente leitura).`,
      `Rode checagens de CONSISTENCIA no educanet-demo (project_id="${DEMO_REF}"): alunos sem matricula/turma; matriculas para turma/serie inexistente; turmas sem escola/ano; dados nao migrados; duplicidades; divergencias. Reporte contagens e exemplos. NAO corrija agora.`,
    ].join('\n'),
    { agentType: 'especialista-banco-sisam', phase: 'Extrair fluxo', label: 'extrai:consistencia', schema: EXTRACAO_SCHEMA }
  ).catch(() => null),
])

// ============================================================
// FASE 2 — Comparar com o modelo ideal + gerar gaps
// ============================================================
phase('Comparar e gaps')

const GAPS_SCHEMA = {
  type: 'object',
  properties: {
    statusGeral: { type: 'string', enum: ['Saudavel', 'Parcial', 'Critico'] },
    coracao: { type: 'string', enum: ['Forte', 'Medio', 'Fraco'] },
    fluxoResumo: { type: 'string' },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          integracao: { type: 'string' },
          statusAtual: { type: 'string' },
          gap: { type: 'string' },
          prioridade: { type: 'string', enum: ['Alta', 'Media', 'Baixa'] },
          impacto: { type: 'string' },
          sugestaoTecnica: { type: 'string' },
          tempoEstimado: { type: 'string' },
          tipo: { type: 'string', enum: ['codigo', 'banco-naodestrutivo', 'banco-destrutivo', 'dados'] },
          autoaplicavel: { type: 'boolean' },
          bloqueioExterno: { type: 'string' },
        },
        required: ['integracao', 'statusAtual', 'gap', 'prioridade', 'sugestaoTecnica', 'tipo', 'autoaplicavel'],
      },
    },
    recomendacoes: { type: 'array', items: { type: 'string' } },
  },
  required: ['statusGeral', 'coracao', 'fluxoResumo', 'gaps', 'recomendacoes'],
}

const sintese = await agent(
  [
    `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase COMPARACAO.`,
    `Modelo ideal: Gestor Escolar = fonte unica das informacoes mestras; migracao automatica aos demais modulos; modulos externos so CONSOMEM/COMPLEMENTAM; impedir duplicacao; historico de migracoes; bidirecional so quando necessario.`,
    ``,
    `Use as extracoes para comparar ATUAL x IDEAL e listar GAPS.`,
    `--- BANCO ---\n${JSON.stringify(banco)}`,
    `--- INTEGRACOES ---\n${JSON.stringify(integracoes)}`,
    `--- CONSISTENCIA ---\n${JSON.stringify(consistencia)}`,
    ``,
    `Para cada gap: integracao, statusAtual, gap, prioridade, impacto, sugestaoTecnica, tempoEstimado, tipo (codigo|banco-naodestrutivo|banco-destrutivo|dados), autoaplicavel, bloqueioExterno.`,
    `NOVA POLITICA (demo-only, aplicar tudo): autoaplicavel = TRUE para TODOS os tipos (inclusive banco-destrutivo e dados), porque a escrita e no demo (sandbox).`,
    `EXCECAO: se o gap depende de dado externo inexistente (ex.: backfill de CPF/INEP), use autoaplicavel = FALSE e preencha bloqueioExterno com o que falta.`,
    `Se ciclo > 1, verifique tambem se gaps anteriores foram resolvidos e se restou divida.`,
  ].join('\n'),
  { agentType: 'arquiteto-sisam', phase: 'Comparar e gaps', label: 'sintese:gaps', schema: GAPS_SCHEMA }
).catch((e) => ({ statusGeral: 'Critico', coracao: 'Fraco', fluxoResumo: 'falha na sintese: ' + (e && e.message), gaps: [], recomendacoes: [] }))

const gaps = (sintese && Array.isArray(sintese.gaps)) ? sintese.gaps : []
const aplicaveis = gaps
  .filter((g) => g.autoaplicavel === true)
  .sort((a, b) => prio(b.prioridade) - prio(a.prioridade))

function prio(p) { return p === 'Alta' ? 3 : p === 'Media' ? 2 : 1 }

log(`Ciclo ${CICLO}: ${gaps.length} gaps (status ${sintese.statusGeral}); ${aplicaveis.length} auto-aplicaveis (demo)`)

// ============================================================
// FASE 3 — Correcoes (sequencial; evita corrida de git) — aplica tudo no demo
// ============================================================
phase('Correcoes')

const RESULTADO_SCHEMA = {
  type: 'object',
  properties: {
    integracao: { type: 'string' },
    status: { type: 'string', enum: ['aplicado', 'revertido', 'bloqueado-dados', 'sem-mudanca', 'erro'] },
    tipo: { type: 'string' },
    commitHash: { type: 'string' },
    detalhe: { type: 'string' },
  },
  required: ['integracao', 'status', 'detalhe'],
}

const resultados = []
for (let i = 0; i < aplicaveis.length; i++) {
  const g = aplicaveis[i]
  const ehBanco = (g.tipo === 'banco-naodestrutivo' || g.tipo === 'banco-destrutivo' || g.tipo === 'dados')

  const protocoloBanco = [
    `1. Escreva a migration em database/migrations/ (cabecalho: objetivo + rollback). Para destrutivo, garanta guarda idempotente (IF EXISTS) e descreva como reverter.`,
    `2. git add + commit "feat(fluxo): ciclo ${CICLO} ${g.tipo} ${g.integracao}" + "${COAUTHOR}".`,
    `3. Aplique no educanet-demo (project_id="${DEMO_REF}") via apply_migration/execute_sql. Confirme com consulta de verificacao.`,
    `4. Se mexeu em codigo/tipos, rode "npx tsc --noEmit"; se quebrar codigo, reverta o codigo (git restore) — a migration ja aplicada fica registrada.`,
    `   -> status "aplicado" (commitHash) ou "bloqueado-dados" (se faltar dado externo) ou "erro".`,
  ].join('\n')

  const protocoloCodigo = [
    `1. Edite os arquivos de codigo necessarios (padroes do CLAUDE.md).`,
    `2. "npx tsc --noEmit" e "npx vitest run".`,
    `3. Verde -> git add -A && git commit "feat(fluxo): ciclo ${CICLO} ${g.integracao}" + "${COAUTHOR}" -> status "aplicado".`,
    `4. Vermelho -> git restore --source=HEAD --staged --worktree -- <arquivos> -> status "revertido".`,
  ].join('\n')

  const tarefa = [
    `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase CORRECAO. Branch ${BRANCH}. NUNCA push. Producao desvinculada.`,
    `Gap (${g.prioridade}, tipo ${g.tipo}): ${g.integracao}`,
    `Problema: ${g.gap}`,
    `Sugestao: ${g.sugestaoTecnica}`,
    ``,
    ehBanco ? REGRA_BANCO : `Correcao de CODIGO seguindo CLAUDE.md.`,
    ``,
    `PROTOCOLO:`,
    ehBanco ? protocoloBanco : protocoloCodigo,
    `Acrescente 1 linha a docs/automacao/fluxo-escolar/log.md: "- ciclo ${CICLO} | ${g.integracao} | <status> | ${g.tipo}".`,
    `Retorne o resultado estruturado.`,
  ].join('\n')

  const res = await agent(tarefa, {
    agentType: ehBanco ? 'especialista-banco-sisam' : 'implementador-sisam',
    phase: 'Correcoes',
    label: `fix:${g.integracao}`.slice(0, 40),
    schema: RESULTADO_SCHEMA,
  }).catch((e) => ({ integracao: g.integracao, status: 'erro', detalhe: String(e && e.message || e) }))

  resultados.push(res || { integracao: g.integracao, status: 'erro', detalhe: 'agent null' })
  log(`Ciclo ${CICLO} | ${g.integracao}: ${res ? res.status : 'erro'}`)
}

// ============================================================
// FASE 4 — Validar TODAS as migrations (no demo)
// ============================================================
phase('Validar migrations')

const VALID_SCHEMA = {
  type: 'object',
  properties: {
    totalArquivos: { type: 'number' },
    aplicadasNoDemo: { type: 'number' },
    naoAplicadas: { type: 'array', items: { type: 'string' } },
    inconsistencias: { type: 'array', items: { type: 'string' } },
    resumo: { type: 'string' },
  },
  required: ['resumo'],
}

const validacao = await agent(
  [
    `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase VALIDAR MIGRATIONS.`,
    `No educanet-demo (project_id="${DEMO_REF}"):`,
    `1. Liste as migrations aplicadas (list_migrations) e o schema relevante.`,
    `2. Confronte com os arquivos em database/migrations/ criados nesta branch (${BRANCH}) — especialmente os de origem/serie_id/identidade/ano-letivo.`,
    `3. Para cada migration deste fluxo NAO aplicada no demo, APLIQUE agora (apply_migration) — sao idempotentes. Para destrutivas, confirme a guarda IF EXISTS antes.`,
    `4. Rode checagens finais de consistencia (0 orfaos, FKs e unicidades coerentes) e reporte.`,
    `Producao desvinculada: nao toque em outro projeto.`,
  ].join('\n'),
  { agentType: 'especialista-banco-sisam', phase: 'Validar migrations', label: 'validar:migrations', schema: VALID_SCHEMA }
).catch((e) => ({ resumo: 'falha na validacao: ' + (e && e.message), naoAplicadas: [], inconsistencias: [] }))

// ============================================================
// FASE 5 — Relatorio
// ============================================================
phase('Relatorio')

const bloqueados = resultados.filter((r) => r && r.status === 'bloqueado-dados')

await agent(
  [
    `CICLO ${CICLO} — FlowSchoolAgent (demo-only), fase RELATORIO.`,
    `Escreva docs/automacao/fluxo-escolar/relatorio-ciclo-${CICLO}.md no formato oficial (📊 RELATÓRIO DO AGENTE: 1 Status Geral/Coracao, 2 Fluxo Atual, 3 Tabela de comparacao, 4 Recomendacoes priorizadas, 5 Acoes Executadas/Sugeridas).`,
    `Deixe claro: banco unico = educanet-demo; producao DESVINCULADA; o que foi aplicado (incl. destrutivo/dados no demo) e o que ficou BLOQUEADO por dado externo.`,
    `--- SINTESE ---\n${JSON.stringify(sintese)}`,
    `--- CORRECOES ---\n${JSON.stringify(resultados)}`,
    `--- VALIDACAO MIGRATIONS ---\n${JSON.stringify(validacao)}`,
    `Depois faca git add + commit "docs(fluxo): relatorio ciclo ${CICLO}" + "${COAUTHOR}". NAO push. Retorne o caminho.`,
  ].join('\n'),
  { agentType: 'documentador-sisam', phase: 'Relatorio', label: 'relatorio' }
).catch(() => null)

const aplicados = resultados.filter((r) => r && r.status === 'aplicado')
const revertidos = resultados.filter((r) => r && r.status === 'revertido')
const erros = resultados.filter((r) => r && r.status === 'erro')

log(`Ciclo ${CICLO} CONCLUIDO -> status:${sintese.statusGeral} | aplicados:${aplicados.length} | revertidos:${revertidos.length} | bloqueados:${bloqueados.length} | migrations:${validacao.resumo}`)

return {
  ciclo: CICLO,
  bancoUnico: 'educanet-demo',
  producao: 'desvinculada',
  statusGeral: sintese.statusGeral,
  coracao: sintese.coracao,
  totalGaps: gaps.length,
  aplicados: aplicados.map((r) => ({ integracao: r.integracao, tipo: r.tipo, commit: r.commitHash })),
  revertidos: revertidos.map((r) => ({ integracao: r.integracao, motivo: r.detalhe })),
  bloqueadosDados: bloqueados.map((r) => ({ integracao: r.integracao, motivo: r.detalhe })),
  erros: erros.map((r) => ({ integracao: r.integracao, motivo: r.detalhe })),
  validacaoMigrations: validacao,
}
