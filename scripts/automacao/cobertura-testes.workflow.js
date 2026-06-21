export const meta = {
  name: 'cobertura-testes',
  description: 'Onda paralela de aumento de cobertura de testes: mede baseline, dispara agentes cobertura-sisam por area (services + rotas de API + helpers) escrevendo testes significativos, e consolida medindo a cobertura final. Agentes NAO commitam (o orquestrador commita). NUNCA push. Sempre deixa a suite verde.',
  phases: [
    { title: 'Baseline' },
    { title: 'Onda de cobertura' },
    { title: 'Consolidacao' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const REGRAS = [
  `REGRAS: NUNCA git push; NAO faca git add/commit (o orquestrador commita no fim).`,
  `Banco: nao precisa tocar; testes de integracao MOCKAM @/database/connection (pool.query) e @/lib/cache.`,
  `Escreva testes que PROVAM comportamento (caminho feliz + bordas + autorizacao/escopo + erros + branches). PROIBIDO teste vazio/sem assercao so para subir numero.`,
  `Rode SOMENTE os testes que voce criou (npx vitest run <seus arquivos>) e deixe-os 100% VERDES. Se um teste revelar bug, NAO mascare: reporte; se nao conseguir deixar verde de forma honesta, remova o arquivo e relate (nunca deixe teste vermelho na arvore).`,
  `Crie arquivos NOVOS com nomes claros por area (evite editar arquivos de teste de outras areas). pt-BR nas descricoes. Siga .claude/contexto-sisam.md e os padroes do projeto.`,
].join('\n')

// Buckets disjuntos por area (evita 2 agentes no mesmo arquivo)
const BUCKETS = [
  { key: 'services-academico', escopo: 'lib/services/{alunos,matriculas,turmas,escolas,professores,responsaveis}.service.ts + lib/services/matriculas/** + lib/services/professores/** + lib/services/{notas,media-anual,frequencia}.ts + lib/services/notas/**' },
  { key: 'services-dados', escopo: 'lib/services/{dashboard,graficos,estatisticas,comparativos,kpis-semed,analytics-preditiva,monitoramento}.service.ts e suas subpastas (dashboard/**, graficos/**, estatisticas/**, comparativos/**, kpis-semed/**)' },
  { key: 'services-dominios-1', escopo: 'lib/services/{pnae,pnld,pdde,pnate,aee,ficai,bolsa-familia,censo-escolar,carga-horaria,bncc,periodos-letivos,modalidades}.service.ts (+ subpastas ficai/**, aee-relatorio-horas.ts)' },
  { key: 'services-dominios-2', escopo: 'lib/services/importacao/** + lib/services/facial/** + lib/services/{lgpd,auditoria,declaracoes,documentos,biblioteca,vagas,transparencia,rh,patrimonio,ordens-servico,diario-classe}.service.ts' },
  { key: 'api-admin', escopo: 'app/api/admin/**/route.ts — priorize os handlers de menor cobertura (matriculas, turmas, series, estatisticas, graficos, comparativos, divergencias, importacoes). Mock de pool.query + cache; cubra status, Zod, withAuth/escopo (IDOR), erros.' },
  { key: 'api-roles-helpers', escopo: 'app/api/{professor,escola,polo,tecnico,offline,perfil,transparencia,publicacoes,eventos,comunicados,publicador}/**/route.ts + helpers puros em lib/ (ex.: format, normalizar-serie, config-series, e utilitarios sem I/O)' },
]
const ALVOS = (ARGS.buckets || BUCKETS)

const COBERTURA_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    arquivosTeste: { type: 'array', items: { type: 'string' } },
    testesAdicionados: { type: 'number' },
    alvosCobertos: { type: 'array', items: { type: 'string' } },
    coberturaAntes: { type: 'string' },
    coberturaDepois: { type: 'string' },
    bugsRevelados: { type: 'array', items: { type: 'string' } },
    detalhe: { type: 'string' },
  },
  required: ['area', 'testesAdicionados', 'detalhe'],
}

// ============================================================
// FASE 1 — Baseline
// ============================================================
phase('Baseline')
log('Medindo cobertura baseline...')
const baseline = await agent(
  [
    `Meca a cobertura ATUAL do projeto: rode "npx vitest run --coverage" (script npm run test:coverage).`,
    `Reporte os percentuais GLOBAIS (lines, branches, functions, statements) e, se possivel, as 10 areas/arquivos de MENOR cobertura e MAIOR risco (services e rotas).`,
    `So medicao — NAO escreva testes nem commite.`,
  ].join('\n'),
  { agentType: 'cobertura-sisam', phase: 'Baseline', label: 'baseline' }
).catch((e) => ('falha baseline: ' + (e && e.message)))

// ============================================================
// FASE 2 — Onda paralela por area
// ============================================================
phase('Onda de cobertura')
log(`Disparando ${ALVOS.length} agentes de cobertura em paralelo...`)

const ondas = await parallel(ALVOS.map((b) => () =>
  agent(
    [
      `AUMENTE A COBERTURA DE TESTES da area "${b.key}".`,
      `Escopo (foque nos arquivos de MENOR cobertura e MAIOR risco dentro dele): ${b.escopo}`,
      ``,
      REGRAS,
      ``,
      `Passos: (1) meca a cobertura da sua area (npx vitest run <area> --coverage) e anote o antes; (2) escreva testes significativos para os arquivos mais carentes; (3) rode npx vitest run nos SEUS arquivos ate verde; (4) confirme que a cobertura da area subiu.`,
      `Retorne: arquivos de teste criados, nº de testes, alvos cobertos, cobertura antes/depois (da area), bugs revelados (se houver) e detalhe.`,
    ].join('\n'),
    { agentType: 'cobertura-sisam', phase: 'Onda de cobertura', label: `cob:${b.key}`.slice(0, 38), schema: COBERTURA_SCHEMA }
  ).catch((e) => ({ area: b.key, testesAdicionados: 0, detalhe: 'erro: ' + (e && e.message) }))
))

const okOndas = ondas.filter(Boolean)
const totalTestes = okOndas.reduce((s, o) => s + (o.testesAdicionados || 0), 0)
log(`Onda concluida: ${totalTestes} testes adicionados em ${okOndas.length} areas`)

// ============================================================
// FASE 3 — Consolidacao (suite inteira verde + cobertura final)
// ============================================================
phase('Consolidacao')
const final = await agent(
  [
    `Consolidacao da onda de cobertura. Rode a SUITE COMPLETA: "npx tsc --noEmit" e "npx vitest run --coverage".`,
    `Reporte: tsc (limpo?), total de testes (passando/total), e os percentuais GLOBAIS de cobertura (lines/branches/functions) — para comparar com o baseline.`,
    `Se houver QUALQUER teste vermelho, identifique o arquivo e a causa; se for um teste novo da onda que ficou ruim, REMOVA-o (a arvore precisa ficar verde) e liste o que removeu. NAO commite, NAO push.`,
  ].join('\n'),
  { agentType: 'cobertura-sisam', phase: 'Consolidacao', label: 'consolidacao' }
).catch((e) => ('falha consolidacao: ' + (e && e.message)))

return {
  baseline,
  areas: okOndas.map((o) => ({ area: o.area, testes: o.testesAdicionados, antes: o.coberturaAntes, depois: o.coberturaDepois, arquivos: o.arquivosTeste, bugs: o.bugsRevelados })),
  totalTestesAdicionados: totalTestes,
  consolidacao: final,
}
