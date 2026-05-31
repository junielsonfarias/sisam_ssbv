/**
 * Pré-carrega caches em paralelo para evitar N+1 queries durante o
 * processamento de cada linha da planilha.
 */
import pool from '@/database/connection'
import { ConfigSerieRow, DisciplinaConfig, normalizarSerie } from './helpers-serie'
import { createLogger } from '@/lib/logger'

const log = createLogger('ImportarResultados:Caches')

export interface CachesImportacao {
  cacheQuestoes: Map<string, string>
  cacheEscolas: Map<string, string>
  cacheAlunos: Map<string, string>
  cacheTurmas: Map<string, string>
  configSeriesMap: Map<string, ConfigSerieRow>
}

export async function carregarCaches(anoLetivo: string): Promise<CachesImportacao> {
  const [questoesResult, escolasResult, alunosResult, turmasResult, configSeriesResult, disciplinasResult] =
    await Promise.all([
      pool.query('SELECT id, codigo FROM questoes'),
      pool.query('SELECT id, UPPER(TRIM(nome)) as nome_norm FROM escolas WHERE ativo = true'),
      pool.query(
        `SELECT id, UPPER(TRIM(nome)) as nome_norm, escola_id
           FROM alunos WHERE ano_letivo = $1`,
        [anoLetivo]
      ),
      pool.query(
        'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
        [anoLetivo]
      ),
      pool.query(`
        SELECT cs.id, cs.serie, cs.tipo_ensino, cs.qtd_itens_producao,
               cs.avalia_lp, cs.avalia_mat, cs.avalia_ch, cs.avalia_cn,
               cs.qtd_questoes_lp, cs.qtd_questoes_mat, cs.qtd_questoes_ch, cs.qtd_questoes_cn
          FROM configuracao_series cs
      `),
      pool.query(`
        SELECT csd.serie_id, csd.disciplina, csd.sigla, csd.ordem,
               csd.questao_inicio, csd.questao_fim, csd.qtd_questoes, csd.valor_questao
          FROM configuracao_series_disciplinas csd
         WHERE csd.ativo = true
         ORDER BY csd.serie_id, csd.ordem
      `),
    ])

  const cacheQuestoes = new Map<string, string>()
  for (const q of questoesResult.rows) cacheQuestoes.set(q.codigo, q.id)

  const cacheEscolas = new Map<string, string>()
  for (const e of escolasResult.rows) cacheEscolas.set(e.nome_norm, e.id)

  const cacheAlunos = new Map<string, string>()
  for (const a of alunosResult.rows) {
    cacheAlunos.set(`${a.nome_norm}_${a.escola_id}`, a.id)
  }

  const cacheTurmas = new Map<string, string>()
  for (const t of turmasResult.rows) {
    cacheTurmas.set(`${t.codigo}_${t.escola_id}`, t.id)
  }

  // Indexar config_series + disciplinas por série normalizada
  const configSeriesMap = new Map<string, ConfigSerieRow>()
  for (const config of configSeriesResult.rows) {
    const serieNormalizada = normalizarSerie(config.serie)
    const disciplinasDaSerie: DisciplinaConfig[] = disciplinasResult.rows.filter(
      (d: DisciplinaConfig) => d.serie_id === config.id
    )

    log.info(`Série ${config.serie} (normalizada: ${serieNormalizada}) - ${disciplinasDaSerie.length} disciplinas`)
    for (const d of disciplinasDaSerie) {
      log.info(`  - ${d.sigla}: Q${d.questao_inicio}-Q${d.questao_fim}`)
    }

    configSeriesMap.set(serieNormalizada, {
      ...config,
      disciplinas: disciplinasDaSerie,
    })
  }

  return { cacheQuestoes, cacheEscolas, cacheAlunos, cacheTurmas, configSeriesMap }
}
