export const meta = {
  name: 'adr-005-impl',
  description: 'Implementa o ADR-005 (recuperacao flexivel por escola) passos 2-7: schema aditivo + backfill, resolver de config (escola_regras_avaliacao), dual-write, dual-read com fallback, testes dos esquemas (a)-(d), verificacao. Demo-only, gated por tsc+vitest, sem DROP (passo 8 fica para decisao humana). NUNCA push.',
  phases: [
    { title: 'Schema + backfill' },
    { title: 'Resolver config' },
    { title: 'Dual-write' },
    { title: 'Dual-read calculo' },
    { title: 'Testes esquemas' },
    { title: 'Verificacao final' },
  ],
}

let ARGS = args
if (typeof ARGS === 'string') { try { ARGS = JSON.parse(ARGS) } catch (e) { ARGS = {} } }
if (!ARGS || typeof ARGS !== 'object') ARGS = {}

const BRANCH = 'auto/adr-005-impl'
const DEMO_REF = 'tbbnswuqsqhulserwtcc'
const CO = 'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>'
const ADR = 'docs/adr/ADR-005-recuperacao-flexivel-por-escola.md'

const REGRAS = [
  `LEIA ${ADR} (decisao + consequencias + plano de migracao) antes de mexer.`,
  `REGRAS: branch ${BRANCH}; NUNCA git push; banco APENAS educanet-demo (project_id="${DEMO_REF}"), producao desvinculada.`,
  `ADITIVO: nada de DROP de coluna/tabela, nada de NOT NULL novo em coluna existente, nada de DELETE em massa. O campo legado notas_escolares.nota_recuperacao PERMANECE (sem DROP — passo 8 e decisao humana).`,
  `Migrations idempotentes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS): arquivo em database/migrations/ com cabecalho (objetivo+rollback) + commit ANTES de aplicar via apply_migration no demo.`,
  `Codigo so commita se "npx tsc --noEmit" e "npx vitest run" passarem; se quebrar, git restore e status "parcial". SEMPRE deixe a arvore verde. Padroes do CLAUDE.md.`,
].join('\n')

const RES = {
  type: 'object',
  properties: {
    etapa: { type: 'string' },
    status: { type: 'string', enum: ['implementado', 'parcial', 'revertido', 'erro'] },
    arquivos: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
    detalhe: { type: 'string' },
    pendencias: { type: 'array', items: { type: 'string' } },
  },
  required: ['etapa', 'status', 'detalhe'],
}

const out = {}

// Passo 2+3 — Schema aditivo + backfill -----------------------------------
phase('Schema + backfill')
out.schema = await agent([
  `ADR-005 passos 2 e 3 (schema aditivo + backfill). ${REGRAS}`,
  `PASSO 2 — migration aditiva no demo, exatamente como na secao "Consequencias > Schema" do ADR:`,
  `  - ALTER TABLE escola_regras_avaliacao ADD COLUMN IF NOT EXISTS esquema_recuperacao VARCHAR(30) NOT NULL DEFAULT 'por_periodo' CHECK (esquema_recuperacao IN ('por_periodo','por_bloco_periodos','semestral','final')).`,
  `  - CREATE TABLE IF NOT EXISTS recuperacoes_escolares (id, aluno_id, disciplina_id, escola_id, ano_letivo, esquema, nota_recuperacao, nota_final_calc, registrado_por, criado_em, atualizado_em) com as FKs/CHECK do ADR.`,
  `  - CREATE TABLE IF NOT EXISTS recuperacoes_periodos (recuperacao_id, periodo_id, PK composta) — tabela ponte (decisao A4).`,
  `  - indices idx_rec_esc_aluno_disc_ano e idx_rec_esc_escola_ano.`,
  `  - HABILITE RLS nas 2 tabelas novas (ENABLE ROW LEVEL SECURITY sem policy — padrao do projeto).`,
  `  Escreva o arquivo em database/migrations/, commit, e aplique no demo. Confirme por consulta que as tabelas/colunas existem e rowsecurity=true.`,
  `PASSO 3 — backfill (no demo): para cada notas_escolares com nota_recuperacao NOT NULL, criar 1 linha em recuperacoes_escolares (esquema='por_periodo', copiando aluno/disciplina/escola/ano/nota) + 1 linha em recuperacoes_periodos (o periodo_id daquela nota). Idempotente (NOT EXISTS guard). Faca como migration de dados versionada+commit, aplique no demo, e reporte quantas linhas migrou + confirme contagem == nº de notas com recuperacao.`,
  `Retorne resultado.`,
].join('\n'), { agentType: 'especialista-banco-sisam', phase: 'Schema + backfill', label: 'schema+backfill', schema: RES }).catch((e) => ({ etapa: 'schema', status: 'erro', detalhe: String(e && e.message) }))
log(`schema+backfill: ${out.schema && out.schema.status}`)

// Passo 1 — Resolver de config honra escola_regras_avaliacao + expoe esquema
phase('Resolver config')
out.config = await agent([
  `ADR-005 passo 1 (fonte canonica de regra) + expor esquema_recuperacao. ${REGRAS}`,
  `Garanta que a resolucao de config de notas honre escola_regras_avaliacao com prioridade escola+serie > global. Verifique lib/services/notas/config.ts (buscarConfigNotas): se ainda NAO consulta escola_regras_avaliacao, adicione o lookup por escola_id+serie_escolar_id (ativo) com COALESCE sobre regras_avaliacao/configuracao_notas_escola, SEM falhar quando a escola nao tiver linha (fallback global). Inclua o campo esquema_recuperacao no ConfigNotas (lib/services/notas/types.ts) com default 'por_periodo'.`,
  `Exponha esquema_recuperacao na API de configuracao por escola/serie (ex.: app/api/admin/escolas/[id]/regras-avaliacao/route.ts) — leitura e escrita, Zod, queries parametrizadas.`,
  `Se o Fix2/Fix3 do lote anterior ja resolveu parte disso, apenas complemente o que faltar (nao duplique). Verifique tsc+vitest. Commit "feat(adr-005): resolver de config honra escola_regras_avaliacao + esquema_recuperacao" + "${CO}".`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Resolver config', label: 'resolver-config', schema: RES }).catch((e) => ({ etapa: 'config', status: 'erro', detalhe: String(e && e.message) }))
log(`resolver-config: ${out.config && out.config.status}`)

// Passo 4 — Dual-write no lancamento --------------------------------------
phase('Dual-write')
out.write = await agent([
  `ADR-005 passo 4 (dual-write). ${REGRAS}`,
  `No service de lancamento de notas (lib/services/notas/lancamento.ts), ao lancar/atualizar recuperacao: ALEM de gravar o legado notas_escolares.nota_recuperacao (mantido), faca UPSERT em recuperacoes_escolares (+ recuperacoes_periodos com o periodo correspondente) com o esquema vindo da config resolvida (default 'por_periodo'). Rode na mesma transacao/client quando houver. Aditivo: nao remova a escrita legada.`,
  `Verifique tsc+vitest. Commit "feat(adr-005): dual-write de recuperacao (recuperacoes_escolares + ponte)" + "${CO}".`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Dual-write', label: 'dual-write', schema: RES }).catch((e) => ({ etapa: 'write', status: 'erro', detalhe: String(e && e.message) }))
log(`dual-write: ${out.write && out.write.status}`)

// Passo 5 — Dual-read no calculo, por esquema, com fallback ----------------
phase('Dual-read calculo')
out.read = await agent([
  `ADR-005 passo 5 (dual-read + esquemas). ${REGRAS}`,
  `Adapte a leitura/calculo da recuperacao para resolver de recuperacoes_escolares conforme o ESQUEMA, com FALLBACK para notas_escolares.nota_recuperacao quando nao houver entrada nova:`,
  `  - 'por_periodo' (default): paridade EXATA com hoje (recuperacao por periodo; sem regressao).`,
  `  - 'por_bloco_periodos' / 'semestral': a recuperacao cobre N periodos; aplique-a sobre a MEDIA dos periodos cobertos (substituicao quando maior, respeitando regra_recuperacao 'substituicao'|'ponderada' do Fix3).`,
  `  - 'final': recuperacao anual; aplique sobre a media anual (mesma semantica de substituicao/ponderada).`,
  `Documente a semantica escolhida no codigo. Onde a media anual e composta (lib/services/media-anual.ts) e onde calcularNotaFinal e chamado (lib/services/notas/calculo.ts/lancamento.ts), garanta que 'por_periodo' nao muda nada. Use a tabela ponte para saber os periodos cobertos.`,
  `Verifique tsc+vitest (suites de boletim/frequencia/notas verdes). Commit "feat(adr-005): dual-read de recuperacao por esquema com fallback" + "${CO}". Se algum esquema ficar so parcial, marque status parcial e explique.`,
].join('\n'), { agentType: 'implementador-sisam', phase: 'Dual-read calculo', label: 'dual-read', schema: RES }).catch((e) => ({ etapa: 'read', status: 'erro', detalhe: String(e && e.message) }))
log(`dual-read: ${out.read && out.read.status}`)

// Passo 6 — Testes dos esquemas (a)-(d) ------------------------------------
phase('Testes esquemas')
out.testes = await agent([
  `ADR-005 passo 6 (testes). Escreva testes Vitest cobrindo os 4 esquemas de recuperacao (por_periodo, por_bloco_periodos, semestral, final), verificando que nota_final/media saem corretas e que o FALLBACK para nota_recuperacao legado funciona quando nao ha entrada nova. Mock de @/database/connection. Regra default 'substituicao'. Rode vitest verde. Commit "test(adr-005): esquemas de recuperacao (a-d) + fallback" + "${CO}". NUNCA push.`,
], { agentType: 'qa-sisam', phase: 'Testes esquemas', label: 'qa:esquemas', schema: RES }).catch((e) => ({ etapa: 'testes', status: 'erro', detalhe: String(e && e.message) }))
log(`testes: ${out.testes && out.testes.status}`)

// Passo 7 — Verificacao final ---------------------------------------------
phase('Verificacao final')
out.verif = await agent([
  `ADR-005 passo 7 (verificacao). Rode "npx tsc --noEmit" e "npx vitest run" e reporte numeros exatos. Liste commits e migrations novas (^main). Confirme no demo (project_id="${DEMO_REF}"): tabelas recuperacoes_escolares/recuperacoes_periodos existem com RLS, coluna esquema_recuperacao em escola_regras_avaliacao, e que o backfill bateu (recuperacoes_escolares == notas_escolares com nota_recuperacao NOT NULL). So reporte; NUNCA push.`,
], { agentType: 'qa-sisam', phase: 'Verificacao final', label: 'verif-final' }).catch((e) => ('falha: ' + (e && e.message)))

const etapasOk = ['schema', 'config', 'write', 'read', 'testes'].filter((k) => out[k] && out[k].status === 'implementado')

return {
  banco: 'educanet-demo',
  producao: 'desvinculada',
  passo8_drop: 'NAO executado (decisao humana): manter notas_escolares.nota_recuperacao ate corte validado',
  etapasImplementadas: etapasOk,
  schema: out.schema, config: out.config, write: out.write, read: out.read, testes: out.testes,
  verificacaoFinal: out.verif,
}
