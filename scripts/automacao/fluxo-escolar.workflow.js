export const meta = {
  name: 'fluxo-escolar',
  description: 'FlowSchoolAgent: garante que o Gestor Escolar seja a fonte unica de verdade e que os dados migrem aos demais modulos. Um ciclo: extrai fluxo atual (read-only) -> compara com modelo ideal e gera gaps -> aplica correcoes (codigo com tsc+vitest+revert; migrations NAO-destrutivas SO no educanet-demo) -> escreve o relatorio. NUNCA faz push. NUNCA escreve em producao.',
  phases: [
    { title: 'Extrair fluxo' },
    { title: 'Comparar e gaps' },
    { title: 'Correcoes' },
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

// Projetos Supabase
const PROD_REF = 'umtfcjxytmrybwlcqzdq'   // leitura PERMITIDA · escrita PROIBIDA
const DEMO_REF = 'tbbnswuqsqhulserwtcc'   // leitura e ESCRITA permitidas (sandbox)

const REGRA_BANCO = [
  `REGRA DE BANCO (inegociavel):`,
  `- ESCRITA (apply_migration / execute_sql que altera) SOMENTE no projeto educanet-demo (project_id="${DEMO_REF}").`,
  `- NUNCA escreva no projeto de producao (project_id="${PROD_REF}"). Leitura nele e permitida.`,
  `- Apenas migrations IDEMPOTENTES e NAO-DESTRUTIVAS (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE FUNCTION/TRIGGER).`,
  `- PROIBIDO aplicar DROP, DELETE, TRUNCATE ou UPDATE em massa automaticamente -> isso vira PROPOSTA no relatorio, nao acao.`,
  `- Toda migration deve ser escrita como arquivo em database/migrations/ e COMMITADA antes de aplicar (rastro + rollback documentado no cabecalho).`,
].join('\n')

// ============================================================
// FASE 1 — Extrair o fluxo atual (SOMENTE LEITURA, paralelo)
// ============================================================
phase('Extrair fluxo')
log(`Ciclo ${CICLO}: extraindo fluxo atual (banco + integracoes + consistencia)`)

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
      `CICLO ${CICLO} — FlowSchoolAgent, fase EXTRACAO (somente leitura).`,
      `Mapeie a ESTRUTURA do Gestor Escolar como fonte central. Use Supabase (list_tables/execute_sql) lendo o projeto educanet-demo (project_id="${DEMO_REF}") e, se util, comparando com producao (project_id="${PROD_REF}", SO LEITURA).`,
      `Liste tabelas mestras (aluno, escola, ano letivo, serie, turma, disciplina, professor, matricula, frequencia, notas/avaliacoes) e o encadeamento de relacionamentos (Escola -> Ano Letivo -> Serie -> Turma -> Disciplina -> Professor -> Aluno).`,
      `Aponte chaves estrangeiras, unicidade e onde dados mestres sao realmente criados/mantidos. NAO altere nada.`,
    ].join('\n'),
    { agentType: 'especialista-banco-sisam', phase: 'Extrair fluxo', label: 'extrai:banco', schema: EXTRACAO_SCHEMA }
  ).catch(() => null),

  () => agent(
    [
      `CICLO ${CICLO} — FlowSchoolAgent, fase EXTRACAO (somente leitura).`,
      `Mapeie no CODIGO os fluxos de migracao/sincronizacao entre o Gestor Escolar e os demais modulos: Sisam (Avaliacao Municipal / importacao de resultados), Semed (kpis-semed), Financeiro, Portal do Aluno/Responsavel, etc.`,
      `Para cada integracao diga: mecanismo (import/export/job/trigger/webhook/ETL), arquivos envolvidos, se e uni ou bidirecional, e se algum modulo externo CRIA/ALTERA dados mestres (anti-padrao).`,
      `Busque em lib/services, app/api e database/migrations. NAO altere nada.`,
    ].join('\n'),
    { agentType: 'arquiteto-sisam', phase: 'Extrair fluxo', label: 'extrai:integracoes', schema: EXTRACAO_SCHEMA }
  ).catch(() => null),

  () => agent(
    [
      `CICLO ${CICLO} — FlowSchoolAgent, fase EXTRACAO (somente leitura).`,
      `Rode checagens de CONSISTENCIA no projeto educanet-demo (project_id="${DEMO_REF}", leitura via execute_sql):`,
      `- alunos sem matricula/turma; matriculas apontando turma/serie inexistente; turmas sem escola/ano letivo;`,
      `- dados que deveriam ter migrado mas nao migraram (ex.: aluno no Gestor sem correspondente nos dados consumidos pelo Sisam/Semed);`,
      `- duplicidades de cadastro (aluno duplicado) e divergencias entre tabelas.`,
      `Reporte contagens e exemplos. NAO corrija agora (so leitura).`,
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
    `CICLO ${CICLO} — FlowSchoolAgent, fase COMPARACAO.`,
    `Modelo ideal: Gestor Escolar = fonte unica das informacoes mestras; migracao automatica para os demais modulos; modulos externos (Sisam/Semed) apenas CONSOMEM e COMPLEMENTAM, nunca criam/alteram dados mestres; impedir duplicacao; manter historico de migracoes; bidirecional so quando necessario (ex.: resultado do Sisam volta ao boletim).`,
    ``,
    `Use as extracoes abaixo para comparar o fluxo ATUAL com o IDEAL e listar os GAPS.`,
    `--- EXTRACAO BANCO ---\n${JSON.stringify(banco)}`,
    `--- EXTRACAO INTEGRACOES ---\n${JSON.stringify(integracoes)}`,
    `--- EXTRACAO CONSISTENCIA ---\n${JSON.stringify(consistencia)}`,
    ``,
    `Para cada gap defina: integracao (ex.: "Gestor Escolar -> Sisam"), statusAtual, gap, prioridade (Alta/Media/Baixa), impacto, sugestaoTecnica (API/Webhook/Job/Trigger/ETL), tempoEstimado, tipo e autoaplicavel.`,
    `tipo: "codigo" (API/service/job em codigo), "banco-naodestrutivo" (migration idempotente segura), "banco-destrutivo" (DROP/DELETE/UPDATE massa), "dados" (backfill/correcao de dados em massa).`,
    `autoaplicavel = true SOMENTE para "codigo" e "banco-naodestrutivo". Para "banco-destrutivo" e "dados" use autoaplicavel=false (vira proposta).`,
    `Se for ciclo > 1, verifique tambem se os gaps dos ciclos anteriores foram resolvidos.`,
  ].join('\n'),
  { agentType: 'arquiteto-sisam', phase: 'Comparar e gaps', label: 'sintese:gaps', schema: GAPS_SCHEMA }
).catch((e) => ({ statusGeral: 'Critico', coracao: 'Fraco', fluxoResumo: 'falha na sintese: ' + (e && e.message), gaps: [], recomendacoes: [] }))

const gaps = (sintese && Array.isArray(sintese.gaps)) ? sintese.gaps : []
const aplicaveis = gaps
  .filter((g) => g.autoaplicavel === true && (g.tipo === 'codigo' || g.tipo === 'banco-naodestrutivo'))
  .sort((a, b) => prio(b.prioridade) - prio(a.prioridade))

function prio(p) { return p === 'Alta' ? 3 : p === 'Media' ? 2 : 1 }

log(`Ciclo ${CICLO}: ${gaps.length} gaps (status ${sintese.statusGeral}); ${aplicaveis.length} auto-aplicaveis`)

// ============================================================
// FASE 3 — Correcoes (sequencial; evita corrida de git)
// ============================================================
phase('Correcoes')

const RESULTADO_SCHEMA = {
  type: 'object',
  properties: {
    integracao: { type: 'string' },
    status: { type: 'string', enum: ['aplicado', 'revertido', 'proposto', 'sem-mudanca', 'erro'] },
    tipo: { type: 'string' },
    commitHash: { type: 'string' },
    detalhe: { type: 'string' },
  },
  required: ['integracao', 'status', 'detalhe'],
}

const resultados = []
for (let i = 0; i < aplicaveis.length; i++) {
  const g = aplicaveis[i]
  const ehBanco = g.tipo === 'banco-naodestrutivo'

  const tarefa = [
    `CICLO ${CICLO} — FlowSchoolAgent, fase CORRECAO. Branch ${BRANCH}. NUNCA faca push.`,
    `Gap a corrigir (${g.prioridade}): ${g.integracao}`,
    `Problema: ${g.gap}`,
    `Sugestao tecnica: ${g.sugestaoTecnica}`,
    ``,
    ehBanco ? REGRA_BANCO : `Aplique a correcao em CODIGO seguindo os padroes do CLAUDE.md (Zod, withAuth, queries parametrizadas, alias @/, limite 400 linhas).`,
    ``,
    `PROTOCOLO (sem supervisao humana):`,
    ehBanco
      ? [
          `1. Escreva a migration idempotente/nao-destrutiva em database/migrations/ (cabecalho com objetivo + rollback).`,
          `2. git add + commit "feat(fluxo): ciclo ${CICLO} migration ${g.integracao}" + "${COAUTHOR}".`,
          `3. Aplique via apply_migration SOMENTE no project_id="${DEMO_REF}". Confirme com uma consulta de verificacao.`,
          `4. Rode "npx tsc --noEmit" (caso tenha mexido em tipos/codigo). Se quebrar codigo, reverta o codigo (git restore) — a migration ja aplicada no demo fica registrada no relatorio.`,
          `   -> status "aplicado" (preencha commitHash) ou "erro".`,
        ].join('\n')
      : [
          `1. Edite os arquivos de codigo necessarios.`,
          `2. Rode "npx tsc --noEmit" e "npx vitest run".`,
          `3. Verde -> git add -A && git commit "feat(fluxo): ciclo ${CICLO} ${g.integracao}" + "${COAUTHOR}" -> status "aplicado" (commitHash).`,
          `4. Vermelho -> git restore --source=HEAD --staged --worktree -- <arquivos> (deixe git status limpo) -> status "revertido" (explique em detalhe).`,
        ].join('\n'),
    `Se nada for seguro, status "sem-mudanca". Acrescente 1 linha a docs/automacao/fluxo-escolar/log.md: "- ciclo ${CICLO} | ${g.integracao} | <status> | ${g.tipo}".`,
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
// FASE 4 — Relatorio (formato obrigatorio)
// ============================================================
phase('Relatorio')

const propostas = gaps.filter((g) => g.autoaplicavel === false)

await agent(
  [
    `CICLO ${CICLO} — FlowSchoolAgent, fase RELATORIO.`,
    `Escreva o relatorio do ciclo em docs/automacao/fluxo-escolar/relatorio-ciclo-${CICLO}.md EXATAMENTE no formato abaixo (markdown), preenchido com os dados reais.`,
    ``,
    `Formato:`,
    `# 📊 RELATÓRIO DO AGENTE - <data e hora>`,
    `## 1. Status Geral do Sistema: ${sintese.statusGeral}`,
    `Coração do Sistema (Gestor Escolar): ${sintese.coracao}`,
    `## 2. Fluxo Atual Extraído`,
    `## 3. Comparação com o Modelo Ideal  (tabela: Módulo/Integração | Status Atual | Gap | Prioridade)`,
    `## 4. Recomendações de Melhoria (Priorizadas)`,
    `## 5. Ações Executadas / Sugeridas`,
    ``,
    `Dados estruturados para preencher:`,
    `--- SINTESE ---\n${JSON.stringify(sintese)}`,
    `--- CORRECOES APLICADAS ---\n${JSON.stringify(resultados)}`,
    `--- PROPOSTAS (nao aplicadas: banco-destrutivo/dados) ---\n${JSON.stringify(propostas)}`,
    `--- EXTRACOES ---\nbanco: ${JSON.stringify(banco)}\nintegracoes: ${JSON.stringify(integracoes)}\nconsistencia: ${JSON.stringify(consistencia)}`,
    ``,
    `Na secao 5, deixe claro o que foi APLICADO automaticamente (codigo/migration no demo) e o que ficou como SUGESTAO (destrutivo/dados/producao).`,
    `Depois de escrever o arquivo, faca git add + commit "docs(fluxo): relatorio ciclo ${CICLO}" + "${COAUTHOR}". NAO faca push.`,
    `Retorne apenas o caminho do arquivo criado.`,
  ].join('\n'),
  { agentType: 'documentador-sisam', phase: 'Relatorio', label: 'relatorio' }
).catch(() => null)

const aplicados = resultados.filter((r) => r && r.status === 'aplicado')
const revertidos = resultados.filter((r) => r && r.status === 'revertido')
const erros = resultados.filter((r) => r && r.status === 'erro')

log(`Ciclo ${CICLO} CONCLUIDO -> status:${sintese.statusGeral} | gaps:${gaps.length} | aplicados:${aplicados.length} | revertidos:${revertidos.length} | propostas:${propostas.length}`)

return {
  ciclo: CICLO,
  statusGeral: sintese.statusGeral,
  coracao: sintese.coracao,
  totalGaps: gaps.length,
  aplicados: aplicados.map((r) => ({ integracao: r.integracao, tipo: r.tipo, commit: r.commitHash })),
  revertidos: revertidos.map((r) => ({ integracao: r.integracao, motivo: r.detalhe })),
  propostas: propostas.map((g) => ({ integracao: g.integracao, tipo: g.tipo, prioridade: g.prioridade })),
  erros: erros.map((r) => ({ integracao: r.integracao, motivo: r.detalhe })),
}
