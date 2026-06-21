export const meta = {
  name: 'revisao-noturna',
  description: 'Um ciclo completo de revisao+correcao+verificacao de TODOS os modulos do SISAM. Revisao paralela (read-only) -> correcao sequencial com tsc+vitest -> commit por modulo aprovado ou revert automatico em caso de falha. NUNCA faz push.',
  phases: [
    { title: 'Revisao' },
    { title: 'Correcao e verificacao' },
    { title: 'Consolidacao' },
  ],
}

// ============================================================
// Parametros do ciclo (vindos do driver /loop via args)
// ============================================================
// args pode chegar como objeto OU como string JSON — normaliza
let ARGS = args
if (typeof ARGS === 'string') {
  try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} }
}
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const CICLO = ARGS.ciclo || 1
const BRANCH = 'auto/revisao-noturna'
const COAUTHOR = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

// ============================================================
// Modulos do sistema (escopo: SISTEMA INTEIRO)
// Granularidade por dominio para permitir paralelizar a revisao.
// ============================================================
const MODULOS_DEFAULT = [
  // ----- API -----
  { key: 'api-admin-academico', alvo: 'app/api/admin/{matriculas,turmas,series-escolares,disciplinas-escolares,configuracao-series,regras-avaliacao,tipos-avaliacao,niveis-aprendizagem,historico-escolar,recalcular-niveis,questoes,itens-producao,cartao-resposta}/**' },
  { key: 'api-admin-gestao', alvo: 'app/api/admin/{polos,escolas,professores,eventos,horarios-aula,personalizacao,anos-letivos,metas-escola,sisam-series-participantes,ouvidoria}/** + app/api/comunicados' },
  { key: 'api-admin-dados', alvo: 'app/api/admin/{estatisticas,estatisticas-serie,graficos,executivo,comparativos,comparativos-polos,comparativo-notas,evolucao,evolucao-escolas,resultados-consolidados,relatorios,divergencias}/**' },
  { key: 'api-admin-importacao', alvo: 'app/api/admin/{importar-completo,importacoes,infrequencia,frequencia-diaria}/**' },
  { key: 'api-facial', alvo: 'app/api/facial/** + app/api/admin/{dispositivos-faciais,facial}/**' },
  { key: 'api-professor', alvo: 'app/api/professor/**' },
  { key: 'api-escola-polo-tecnico', alvo: 'app/api/{escola,polo,tecnico}/**' },
  { key: 'api-publico', alvo: 'app/api/{transparencia,publicacoes,eventos,publicador,docs,health,personalizacao}/route.ts' },
  { key: 'api-offline-perfil', alvo: 'app/api/offline/** + app/api/perfil/**' },
  // ----- SERVICES -----
  { key: 'services-core', alvo: 'lib/services/{alunos,matriculas,turmas,escolas,professores,responsaveis}.service.ts + lib/services/matriculas/** + lib/services/{notas,frequencia,media-anual}.ts' },
  { key: 'services-dados', alvo: 'lib/services/{dashboard,graficos,estatisticas,comparativos,kpis-semed,analytics-preditiva,monitoramento}.service.ts + suas subpastas' },
  { key: 'services-dominios', alvo: 'lib/services/{importacao,facial,lgpd,auditoria,censo-escolar,pnae,pnld,pdde,pnate,aee,ficai,bolsa-familia,rh,patrimonio,biblioteca,documentos,declaracoes}.service.ts + lib/services/importacao/**' },
  // ----- PAGES + COMPONENTS -----
  { key: 'pages-admin', alvo: 'app/admin/**/page.tsx + app/admin/**/components/**' },
  { key: 'pages-roles', alvo: 'app/{professor,escola,polo,tecnico,editor,publicador,responsavel}/**/page.tsx' },
  { key: 'pages-publicas-components', alvo: 'app/{login,matricula,boletim,presenca,transparencia,dados-abertos,eventos,publicacoes,ouvidoria,perfil,meus-dados,status,cadastro-professor,cadastro-responsavel}/page.tsx + components/**' },
  // ----- DATABASE -----
  { key: 'database', alvo: 'database/migrations/** + database/connection.ts' },
]

const MODULOS = ARGS.modulos || MODULOS_DEFAULT

// ============================================================
// Schemas de saida estruturada
// ============================================================
const PACOTE_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    resumo: { type: 'string' },
    tarefas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severidade: { type: 'string', enum: ['critica', 'alta', 'media', 'baixa'] },
          arquivo: { type: 'string' },
          problema: { type: 'string' },
          correcao: { type: 'string' },
        },
        required: ['severidade', 'arquivo', 'problema', 'correcao'],
      },
    },
  },
  required: ['modulo', 'resumo', 'tarefas'],
}

const RESULTADO_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    status: { type: 'string', enum: ['aprovado', 'revertido', 'sem-mudanca', 'erro'] },
    tarefasAplicadas: { type: 'number' },
    commitHash: { type: 'string' },
    tscOk: { type: 'boolean' },
    vitestOk: { type: 'boolean' },
    observacao: { type: 'string' },
  },
  required: ['modulo', 'status', 'observacao'],
}

// ============================================================
// FASE 1 — Revisao paralela (SOMENTE LEITURA, seguro paralelizar)
// ============================================================
phase('Revisao')
log(`Ciclo ${CICLO}: revisando ${MODULOS.length} modulos (read-only, em paralelo)`)

const revisoes = await parallel(MODULOS.map((m) => () =>
  agent(
    [
      `Voce esta no CICLO ${CICLO} de uma revisao noturna automatizada do SISAM.`,
      `Revise SOMENTE o modulo "${m.key}" cujo escopo de arquivos e: ${m.alvo}`,
      ``,
      `Encontre problemas REAIS (nao estilisticos triviais) por severidade, seguindo os padroes do CLAUDE.md:`,
      `- Correcao/bugs, seguranca (withAuth, IDOR, SQLi, controle por polo/escola), validacao Zod ausente,`,
      `  queries nao parametrizadas, cache nao invalidado, falta de dynamic='force-dynamic', dark mode,`,
      `  responsividade, a11y, arquivos > 400 linhas, integridade de dados/migrations.`,
      `Se for o CICLO 2 ou maior, foque tambem em VERIFICAR se correcoes anteriores ficaram adequadas e em regressoes.`,
      ``,
      `Produza um pacote de implementacao: para cada problema, diga arquivo exato, o problema e a correcao concreta.`,
      `Cada tarefa deve ser pequena, segura e auto-contida. Se o modulo estiver bom, retorne tarefas: [].`,
      `Inclua APENAS problemas que valem ser corrigidos sem supervisao humana (baixo risco de regressao).`,
    ].join('\n'),
    { agentType: 'revisor-sisam', phase: 'Revisao', label: `rev:${m.key}`, schema: PACOTE_SCHEMA }
  ).then((pacote) => ({ modulo: m, pacote })).catch(() => null)
))

const comAchados = revisoes
  .filter(Boolean)
  .filter((r) => r.pacote && Array.isArray(r.pacote.tarefas) && r.pacote.tarefas.length > 0)
  // prioriza modulos com mais severidade critica/alta primeiro
  .sort((a, b) => severidadeScore(b.pacote) - severidadeScore(a.pacote))

log(`Ciclo ${CICLO}: ${comAchados.length}/${MODULOS.length} modulos com achados a corrigir`)

function severidadeScore(p) {
  const peso = { critica: 4, alta: 3, media: 2, baixa: 1 }
  return p.tarefas.reduce((s, t) => s + (peso[t.severidade] || 0), 0)
}

// ============================================================
// FASE 2 — Correcao SEQUENCIAL (evita corrida de git na mesma branch)
// Cada modulo: aplica -> tsc + vitest -> commit (verde) ou revert (vermelho)
// ============================================================
phase('Correcao e verificacao')

const resultados = []
for (let i = 0; i < comAchados.length; i++) {
  const { modulo, pacote } = comAchados[i]
  const tarefasTxt = pacote.tarefas
    .map((t, idx) => `  ${idx + 1}. [${t.severidade}] ${t.arquivo}\n     problema: ${t.problema}\n     correcao: ${t.correcao}`)
    .join('\n')

  const res = await agent(
    [
      `CICLO ${CICLO} — modulo "${modulo.key}". Voce esta na branch ${BRANCH}. NUNCA faca push.`,
      `Aplique as correcoes abaixo, uma a uma, seguindo os padroes do CLAUDE.md (Zod, withAuth, queries parametrizadas, dark mode, alias @/, limite 400 linhas):`,
      ``,
      tarefasTxt,
      ``,
      `PROTOCOLO DE SEGURANCA (obrigatorio, sem supervisao humana):`,
      `1. Antes de comecar, rode "git stash list" e garanta working tree desta branch.`,
      `2. Aplique as correcoes editando os arquivos.`,
      `3. Rode verificacao: "npx tsc --noEmit" e depois "npx vitest run".`,
      `4. SE ambos passarem (sem erros de tipo e testes verdes):`,
      `     git add -A`,
      `     git commit com mensagem: "fix(${modulo.key}): ciclo ${CICLO} - <resumo curto>" seguida de linha em branco e "${COAUTHOR}"`,
      `   -> status "aprovado", preencha commitHash (git rev-parse --short HEAD).`,
      `5. SE tsc OU vitest falharem:`,
      `     REVERTA tudo que voce mudou: "git restore --source=HEAD --staged --worktree -- <arquivos alterados>" (ou "git checkout -- <arquivos>").`,
      `     Garanta que "git status" volte limpo. NAO comite codigo quebrado.`,
      `   -> status "revertido", explique em observacao o que quebrou.`,
      `6. Se ao revisar voce concluir que nenhuma mudanca e segura, nao altere nada -> status "sem-mudanca".`,
      ``,
      `Acrescente UMA linha ao final de docs/automacao/log.md no formato:`,
      `"- ciclo ${CICLO} | ${modulo.key} | <status> | <n> tarefas | tsc:<ok|fail> vitest:<ok|fail> | <hash ou ->"`,
      `(esse log nao precisa ir no mesmo commit das correcoes; pode ser um commit separado "chore(log): ...").`,
      `Retorne o resultado estruturado.`,
    ].join('\n'),
    { agentType: 'implementador-sisam', phase: 'Correcao e verificacao', label: `fix:${modulo.key}`, schema: RESULTADO_SCHEMA }
  ).catch((e) => ({ modulo: modulo.key, status: 'erro', observacao: String(e && e.message || e) }))

  resultados.push(res || { modulo: modulo.key, status: 'erro', observacao: 'agent retornou null' })
  log(`Ciclo ${CICLO} | ${modulo.key}: ${res ? res.status : 'erro'}`)
}

// ============================================================
// FASE 3 — Consolidacao
// ============================================================
phase('Consolidacao')

const aprovados = resultados.filter((r) => r && r.status === 'aprovado')
const revertidos = resultados.filter((r) => r && r.status === 'revertido')
const erros = resultados.filter((r) => r && r.status === 'erro')

log(`Ciclo ${CICLO} CONCLUIDO -> aprovados: ${aprovados.length} | revertidos: ${revertidos.length} | erros: ${erros.length}`)

return {
  ciclo: CICLO,
  modulosRevisados: MODULOS.length,
  modulosComAchados: comAchados.length,
  aprovados: aprovados.map((r) => ({ modulo: r.modulo, commit: r.commitHash, tarefas: r.tarefasAplicadas })),
  revertidos: revertidos.map((r) => ({ modulo: r.modulo, motivo: r.observacao })),
  erros: erros.map((r) => ({ modulo: r.modulo, motivo: r.observacao })),
}
