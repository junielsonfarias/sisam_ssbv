export const meta = {
  name: 'adr-followup',
  description: 'Follow-ups SEGUROS/aditivos dos ADRs no banco educanet-demo: label boletim, dual-write de matriculas, migrar leituras com fallback, API+UI de divergencias, qualidade de dados. NAO executa cortes destrutivos (NOT NULL / drop de colunas textuais) — esses aguardam validacao end-to-end. NUNCA push.',
  phases: [
    { title: 'Boletim label' },
    { title: 'Matriculas dual-write' },
    { title: 'Migrar leituras' },
    { title: 'Divergencias API+UI' },
    { title: 'Qualidade de dados' },
    { title: 'Verificacao final' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const BRANCH = 'auto/adr-followup'
const DEMO_REF = 'tbbnswuqsqhulserwtcc'
const COAUTHOR = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

const REGRAS = [
  `REGRAS (inegociaveis): branch ${BRANCH}; NUNCA git push; banco APENAS educanet-demo (project_id="${DEMO_REF}"), producao desvinculada.`,
  `Mudancas ADITIVAS (nada destrutivo: sem DROP de coluna, sem NOT NULL novo, sem DELETE em massa sem confirmacao).`,
  `Codigo so commita se "npx tsc --noEmit" e "npx vitest run" passarem; se quebrar, git restore e status "parcial". SEMPRE deixe a arvore verde.`,
  `Padroes do CLAUDE.md (Zod, withAuth, queries parametrizadas, alias @/, dark mode, limite 400 linhas).`,
].join('\n')

const RES = {
  type: 'object',
  properties: {
    tarefa: { type: 'string' },
    status: { type: 'string', enum: ['implementado', 'parcial', 'revertido', 'erro', 'so-analise'] },
    arquivos: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
    detalhe: { type: 'string' },
    pendencias: { type: 'array', items: { type: 'string' } },
  },
  required: ['tarefa', 'status', 'detalhe'],
}

const out = {}

// 1) Boletim: label "Avaliacao Municipal" no frontend ----------------------
phase('Boletim label')
out.label = await agent([
  `Follow-up ADR-003. ${REGRAS}`,
  `O backend ja expoe a secao complementar do SISAM no boletim (view vw_boletim_resultados_sisam / campo avaliacoes_sisam). Garanta no FRONTEND que essa secao apareca com label claro "Avaliacao Municipal", visualmente DISTINTA da nota escolar regular, nas telas que consomem o boletim (responsavel e/ou aluno).`,
  `Localize os componentes do boletim (ex.: app/responsavel/**, app/boletim/**, components/**) e adicione a secao/label, com dark mode. Verifique tsc+vitest. Commit "feat(adr-003): label Avaliacao Municipal no boletim" + "${COAUTHOR}".`,
].join('\n'), { agentType: 'frontend-sisam', phase: 'Boletim label', label: 'boletim-label', schema: RES }).catch((e) => ({ tarefa: 'boletim-label', status: 'erro', detalhe: String(e && e.message) }))
log(`boletim-label: ${out.label && out.label.status}`)

// 2) Matriculas dual-write no ETL ------------------------------------------
phase('Matriculas dual-write')
out.dualwrite = await agent([
  `Follow-up ADR-002 (fase 3 — dual-write). ${REGRAS}`,
  `Hoje o ETL e o service de matricula gravam apenas alunos.turma_id. Adicione ESCRITA PARALELA (dual-write) na tabela matriculas (aluno_id, turma_id, ano_letivo_id, serie_id, situacao, data_matricula) sempre que alunos.turma_id e definido/alterado — usando UPSERT por UNIQUE(aluno_id, ano_letivo_id). Aditivo: NAO remova nem pare de escrever alunos.turma_id.`,
  `Arquivos provaveis: lib/services/importacao/batch/alunos.ts e lib/services/matriculas/matricula.ts. Reuse helpers existentes (resolverAnoLetivoId/resolverSerieId).`,
  `Verifique tsc+vitest. Commit "feat(adr-002): dual-write em matriculas no ETL e service" + "${COAUTHOR}".`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Matriculas dual-write', label: 'dual-write', schema: RES }).catch((e) => ({ tarefa: 'dual-write', status: 'erro', detalhe: String(e && e.message) }))
if (out.dualwrite && (out.dualwrite.status === 'implementado' || out.dualwrite.status === 'parcial')) {
  await agent([`Escreva testes para o dual-write de matriculas (ver commits recentes em ${BRANCH}). Vitest com mock de @/database/connection; cubra UPSERT por (aluno_id, ano_letivo_id) e que alunos.turma_id continua sendo escrito. Rode vitest verde. Commit "test(adr-002): dual-write matriculas" + "${COAUTHOR}". NUNCA push.`], { agentType: 'qa-sisam', phase: 'Matriculas dual-write', label: 'qa:dual-write' }).catch(() => null)
}
log(`dual-write: ${out.dualwrite && out.dualwrite.status}`)

// 3) Migrar leituras de boletim/frequencia para matriculas (com fallback) ---
phase('Migrar leituras')
out.leituras = await agent([
  `Follow-up ADR-002 (fase 4 — migrar leituras). ${REGRAS}`,
  `Migre as LEITURAS de boletim e frequencia para usar a tabela matriculas como fonte do vinculo aluno-turma-ano, COM FALLBACK para alunos.turma_id quando nao houver matricula (aditivo, sem regressao). O objetivo e nao quebrar nada: se matriculas nao tiver a linha, cair no comportamento atual.`,
  `Identifique os pontos de leitura (services de boletim/frequencia, ex.: lib/services/media-anual.ts, frequencia.ts, boletim e responsavel). Faca a mudanca minima e segura.`,
  `Verifique tsc+vitest (a suite de boletim/frequencia precisa continuar verde). Commit "feat(adr-002): leituras de boletim/frequencia via matriculas com fallback" + "${COAUTHOR}". Se houver risco de regressao que os testes nao cubram, prefira status "parcial" e documente.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Migrar leituras', label: 'migrar-leituras', schema: RES }).catch((e) => ({ tarefa: 'migrar-leituras', status: 'erro', detalhe: String(e && e.message) }))
if (out.leituras && (out.leituras.status === 'implementado' || out.leituras.status === 'parcial')) {
  await agent([`Escreva/ajuste testes de integracao garantindo que boletim e frequencia funcionam lendo de matriculas E no fallback por alunos.turma_id (ver ${BRANCH}). Vitest verde. Commit "test(adr-002): leituras boletim/frequencia com fallback" + "${COAUTHOR}". NUNCA push.`], { agentType: 'qa-sisam', phase: 'Migrar leituras', label: 'qa:leituras' }).catch(() => null)
}
log(`migrar-leituras: ${out.leituras && out.leituras.status}`)

// 4) Divergencias: API de resolucao + UI de triagem ------------------------
phase('Divergencias API+UI')
out.divApi = await agent([
  `Follow-up ADR-001 (API de triagem). ${REGRAS}`,
  `A tabela importacao_divergencias ja existe. Crie a API de resolucao das divergencias: endpoints (withAuth admin/tecnico) para LISTAR divergencias de uma importacao e RESOLVER cada uma com acoes "cadastrar_no_gestor" e "vincular_a_existente" (atualizando status, vinculado_a_id, resolvido_por, resolvido_em). Zod, queries parametrizadas, force-dynamic.`,
  `Verifique tsc+vitest. Commit "feat(adr-001): API de triagem de divergencias de importacao" + "${COAUTHOR}".`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Divergencias API+UI', label: 'div-api', schema: RES }).catch((e) => ({ tarefa: 'div-api', status: 'erro', detalhe: String(e && e.message) }))
if (out.divApi && (out.divApi.status === 'implementado' || out.divApi.status === 'parcial')) {
  out.divUi = await agent([
    `Follow-up ADR-001 (UI de triagem). ${REGRAS}`,
    `Crie a pagina admin de triagem de divergencias (ex.: app/admin/importacoes/[id]/divergencias) que consome a API criada: lista as divergencias com filtro por status e botoes de acao (Cadastrar no Gestor / Vincular a existente). ProtectedRoute, dark mode, tabela desktop + cards mobile, useToast, LoadingSpinner.`,
    `Verifique tsc+vitest. Commit "feat(adr-001): UI de triagem de divergencias" + "${COAUTHOR}".`,
  ].join('\n'), { agentType: 'frontend-sisam', phase: 'Divergencias API+UI', label: 'div-ui', schema: RES }).catch((e) => ({ tarefa: 'div-ui', status: 'erro', detalhe: String(e && e.message) }))
}
log(`divergencias: api=${out.divApi && out.divApi.status} ui=${out.divUi && out.divUi.status}`)

// 5) Qualidade de dados: 48 consolidados orfaos + 353 sem resultados --------
phase('Qualidade de dados')
out.dados = await agent([
  `Follow-up ADR-003 (qualidade de dados) — banco educanet-demo (project_id="${DEMO_REF}"). ${REGRAS}`,
  `Investigue no demo: (a) 48 resultados_consolidados ORFAOS (sem resultados_provas correspondentes); (b) 353 alunos em series participantes do SISAM sem nenhum resultados_provas.`,
  `Diagnostique a causa (provavel falha residual no pipeline app/api/admin/importar-resultados/batch-inserts.ts). Para a limpeza dos orfaos: se for claramente lixo de seed/importacao e a remocao for segura, escreva uma migration de saneamento (com WHERE preciso, idempotente) versionada+commit e aplique no demo; se houver QUALQUER duvida ou for DELETE de volume/risco, NAO apague — apenas relate com a query de diagnostico e a recomendacao.`,
  `Retorne diagnostico + o que fez (ou recomendou). status "implementado" se saneou com seguranca, "so-analise" se apenas diagnosticou.`,
].join('\n'), { agentType: 'especialista-banco-sisam', phase: 'Qualidade de dados', label: 'qualidade-dados', schema: RES }).catch((e) => ({ tarefa: 'qualidade-dados', status: 'erro', detalhe: String(e && e.message) }))
log(`qualidade-dados: ${out.dados && out.dados.status}`)

// 6) Verificacao final -----------------------------------------------------
phase('Verificacao final')
out.verif = await agent([
  `Verificacao final da branch ${BRANCH}: rode "npx tsc --noEmit" e "npx vitest run" e reporte os numeros exatos. Liste migrations novas (^main) e confirme aplicacao no demo (project_id="${DEMO_REF}") sem orfaos. So reporte; nao faca refator grande. NUNCA push.`,
].join('\n'), { agentType: 'qa-sisam', phase: 'Verificacao final', label: 'verif-final' }).catch((e) => ('falha: ' + (e && e.message)))

return {
  banco: 'educanet-demo',
  producao: 'desvinculada',
  cortesDestrutivos: 'NAO executados (aguardam validacao end-to-end do ETL) — ver ADR-002/ADR-004',
  cpfInep: 'bloqueado (planilha externa) — ingestor pronto em scripts/backfill-cpf-inep.js',
  resultados: out,
}
