export const meta = {
  name: 'adr-fixes',
  description: 'Correcoes pos-analise: (1) bug de persistencia de divergencias do ETL, (2) fechamento-ano respeitar override por escola, (3) regra de recuperacao explicita, (4) ADR-005 recuperacao flexivel por escola. Demo-only, gated por tsc+vitest, sem cortes destrutivos, NUNCA push.',
  phases: [
    { title: 'Fix1 divergencias ETL' },
    { title: 'Fix2 fechamento override' },
    { title: 'Fix3 recuperacao explicita' },
    { title: 'ADR-005 recuperacao flexivel' },
    { title: 'Verificacao final' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const BRANCH = 'auto/adr-fixes'
const DEMO_REF = 'tbbnswuqsqhulserwtcc'
const CO = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'

const REGRAS = [
  `REGRAS: branch ${BRANCH}; NUNCA git push; banco APENAS educanet-demo (project_id="${DEMO_REF}"), producao desvinculada.`,
  `Migrations idempotentes/ADITIVAS (sem DROP de coluna, sem NOT NULL novo): arquivo em database/migrations/ + commit antes de aplicar no demo.`,
  `Codigo so commita se "npx tsc --noEmit" e "npx vitest run" passarem; se quebrar, git restore e status "parcial". SEMPRE deixe a arvore verde. Padroes do CLAUDE.md.`,
].join('\n')

const RES = {
  type: 'object',
  properties: {
    tarefa: { type: 'string' },
    status: { type: 'string', enum: ['implementado', 'parcial', 'revertido', 'erro'] },
    arquivos: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
    tscOk: { type: 'boolean' },
    vitestOk: { type: 'boolean' },
    detalhe: { type: 'string' },
    pendencias: { type: 'array', items: { type: 'string' } },
  },
  required: ['tarefa', 'status', 'detalhe'],
}

const out = {}

// FIX 1 — persistencia de divergencias do ETL ------------------------------
phase('Fix1 divergencias ETL')
out.fix1 = await agent([
  `FIX 1 (🟠 bloqueador do gate estrito do ETL). ${REGRAS}`,
  `Bug confirmado: no modo estrito, divergencias de aluno/turma NAO persistem. Causa: registrarMestreAusente (lib/services/importacao/governanca.ts) grava em divergencias_historico.acao_realizada (coluna varchar(100)) uma frase de ~103 chars; o INSERT falha com "value too long" e o erro e ENGOLIDO pelo try/catch em lib/divergencias/corretores.ts (~linha 57-59). registrarMestreCriado tem o mesmo bug latente para nomes longos.`,
  `CORRECAO (3 partes):`,
  `1. Migration idempotente no demo: ALTER TABLE divergencias_historico ALTER COLUMN acao_realizada TYPE text; (nao-destrutivo). Arquivo + commit antes de aplicar via apply_migration.`,
  `2. Defensivo no codigo: truncar a string de acao_realizada (ex.: .slice(0,255)) em registrarMestreAusente e registrarMestreCriado antes do INSERT.`,
  `3. Parar de mascarar: em registrarHistorico (corretores.ts) NAO engolir o erro silenciosamente — logar com severidade alta (log.error) e/ou propagar de forma controlada, sem derrubar a importacao.`,
  `Adicione teste: aluno/turma fantasma no gate estrito -> 1 registro persistido (em importacao_divergencias e/ou divergencias_historico). Rode tsc+vitest. Commit "fix(etl): persistencia de divergencias no gate estrito (coluna text + truncate + unmask)" + "${CO}".`,
  `Se possivel, confirme no demo (execute_sql) que a coluna virou text. Retorne resultado.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Fix1 divergencias ETL', label: 'fix1-divergencias', schema: RES }).catch((e) => ({ tarefa: 'fix1', status: 'erro', detalhe: String(e && e.message) }))
log(`fix1: ${out.fix1 && out.fix1.status}`)

// FIX 2 — fechamento-ano respeitar override por escola ---------------------
phase('Fix2 fechamento override')
out.fix2 = await agent([
  `FIX 2 (🔴 decisao de aprovacao usando regra errada). ${REGRAS}`,
  `Bug: app/api/admin/fechamento-ano/route.ts (query regrasResult ~linhas 166-181 e uso ~262-304) busca a regra SO por series_escolares.regra_avaliacao_id (JOIN regras_avaliacao), IGNORANDO o override por escola em escola_regras_avaliacao. A tela app/api/admin/turmas/[id]/avaliacao/route.ts (~linhas 91-163) JA resolve o override corretamente — espelhe essa logica.`,
  `CORRECAO: adicionar LEFT JOIN escola_regras_avaliacao (por escola_id + serie_escolar_id + ativo) e resolver cada campo com COALESCE(override, regra_global) no fechamento, reaproveitando a precedencia ja validada no endpoint de exibicao. Queries parametrizadas.`,
  `Teste de integracao: criar (mock) override com media_aprovacao diferente da global e confirmar que o preview/POST do fechamento usa o valor do override. Rode tsc+vitest. Commit "fix(fechamento): respeitar override de regra por escola (escola_regras_avaliacao)" + "${CO}".`,
  `Retorne resultado.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Fix2 fechamento override', label: 'fix2-fechamento', schema: RES }).catch((e) => ({ tarefa: 'fix2', status: 'erro', detalhe: String(e && e.message) }))
log(`fix2: ${out.fix2 && out.fix2.status}`)

// FIX 3 — regra de recuperacao explicita -----------------------------------
phase('Fix3 recuperacao explicita')
out.fix3 = await agent([
  `FIX 3 (🟠 substituicao silenciosa). ${REGRAS}`,
  `Hoje lib/services/notas/calculo.ts (~11-45) decide entre MEDIA PONDERADA e SUBSTITUICAO(MAX) inferindo por "pesos somam ~1". Isso e fragil: o default de schema de configuracao_notas_escola (peso 0.60/0.40) desliga a substituicao sem aviso.`,
  `CORRECAO: tornar a regra EXPLICITA. Adicione um campo em ConfigNotas (lib/services/notas/types.ts) e em lib/services/notas/config.ts: regra_recuperacao: 'substituicao' | 'ponderada' (enum as const), DEFAULT 'substituicao'. Em calculo.ts, so aplicar ponderada quando regra_recuperacao === 'ponderada' (e os pesos existirem); caso contrario, substituicao = MAX(nota, recuperacao). Mantenha a funcao pura/testavel.`,
  `Se for trivial e seguro, exponha o campo na API/migration de configuracao_notas_escola (aditivo, default 'substituicao'); se exigir mudanca de schema maior, deixe como pendencia e mantenha o default no codigo.`,
  `Atualize/adicione testes unitarios em __tests__/unit (rec>nota com default => substitui; ponderada so quando explicito). Rode tsc+vitest. Commit "fix(notas): regra de recuperacao explicita (substituicao|ponderada, default substituicao)" + "${CO}".`,
  `Retorne resultado.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Fix3 recuperacao explicita', label: 'fix3-recuperacao', schema: RES }).catch((e) => ({ tarefa: 'fix3', status: 'erro', detalhe: String(e && e.message) }))
log(`fix3: ${out.fix3 && out.fix3.status}`)

// ADR-005 — recuperacao flexivel por escola --------------------------------
phase('ADR-005 recuperacao flexivel')
out.adr = await agent([
  `Escreva o ADR-005 em docs/adr/ADR-005-recuperacao-flexivel-por-escola.md (status: Proposta, data 2026-06-21), seguindo o template dos ADR-001..004 e atualizando docs/adr/README.md (indice).`,
  `Contexto real: a recuperacao hoje e a coluna notas_escolares.nota_recuperacao na MESMA linha do periodo (UNIQUE aluno+disciplina+periodo) — ou seja, hardcoded "1 recuperacao por bimestre". Nao ha entidade de recuperacao com FK a avaliacao. Nao da para modelar esquemas diferentes por escola: (a) 1 recuperacao por avaliacao, (b) 1 recuperacao a cada 2 avaliacoes (entre 1a e 2a), (c) recuperacao semestral, (d) recuperacao final/anual. Tambem ha fragmentacao: regras_avaliacao (global, sem escola_id), escola_regras_avaliacao (override, hoje ignorado pelo calculo — sera corrigido), configuracao_notas_escola, configuracao_series.`,
  `Decisao proposta (recomendacao): modelar a recuperacao como esquema PARAMETRIZAVEL por escola+serie+ano — ex.: uma config de "esquema de recuperacao" (por_periodo | por_bloco_de_periodos | semestral | final) + uma entidade/tabela de recuperacao vinculada ao(s) periodo(s)/avaliacao(oes) que recupera. Consolidar a fonte de verdade da regra (resolver unico escola>serie>global). Alternativas: manter 1:1 por periodo / coluna extra / nova entidade. Consequencias e plano de migracao ADITIVO (nova tabela + dual-read com fallback para nota_recuperacao), riscos, e relacao com ADR-002/ADR-004 e com os Fix2/Fix3 deste lote.`,
  `Referencias: lib/services/notas/calculo.ts, media-anual.ts, add-tipos-avaliacao.sql, add-escola-regras-avaliacao.sql, fix-regras-media-ponderada.sql.`,
  `Apenas crie/edite os arquivos do ADR. Commit "docs(adr): ADR-005 recuperacao flexivel por escola (Proposta)" + "${CO}". NUNCA push.`,
], { agentType: 'documentador-sisam', phase: 'ADR-005 recuperacao flexivel', label: 'adr-005' }).catch((e) => ('falha adr: ' + (e && e.message)))
log(`adr-005 escrito`)

// Verificacao final --------------------------------------------------------
phase('Verificacao final')
out.verif = await agent([
  `Verificacao final da branch ${BRANCH}: rode "npx tsc --noEmit" e "npx vitest run" e reporte os numeros exatos. Liste commits e migrations novas (^main). Confirme no demo (project_id="${DEMO_REF}") que divergencias_historico.acao_realizada agora e text. So reporte; NUNCA push.`,
], { agentType: 'qa-sisam', phase: 'Verificacao final', label: 'verif-final' }).catch((e) => ('falha verif: ' + (e && e.message)))

const oks = ['fix1', 'fix2', 'fix3'].filter((k) => out[k] && out[k].status === 'implementado')

return {
  banco: 'educanet-demo',
  producao: 'desvinculada',
  cortesDestrutivos: 'NAO aplicados: DROP das colunas textuais `serie` ainda quebraria leituras (codigo le serie textual). Pre-requisito: migrar todas as leituras para serie_id (fase do ADR-004) + NOT NULL guardado. Bug de divergencias do gate corrigido neste lote.',
  cpfInep: 'bloqueado (planilha externa) — ingestor pronto',
  implementados: oks,
  fix1: out.fix1, fix2: out.fix2, fix3: out.fix3,
  adr005: 'docs/adr/ADR-005-recuperacao-flexivel-por-escola.md',
  verificacaoFinal: out.verif,
}
