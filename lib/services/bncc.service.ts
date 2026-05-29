/**
 * Service BNCC — Base Nacional Comum Curricular.
 *
 * Funções de consulta para:
 *  - Listar habilidades por filtros (etapa, ano, componente, busca por texto)
 *  - Vincular habilidades a questões, planos, tarefas
 *  - Consultar estrutura curricular (etapas, áreas, componentes, competências)
 *
 * @module services/bncc
 */

import pool from '@/database/connection'

export interface Habilidade {
  codigo: string
  descricao: string
  componente_id: string | null
  etapa_id: string | null
  ano: number | null
  campo_experiencia: string | null
  faixa_etaria: string | null
}

export interface Componente {
  id: string
  nome: string
  abreviatura: string | null
  area_id: string | null
}

export interface FiltrosBncc {
  etapa?: string | null
  ano?: number | null
  componenteId?: string | null
  busca?: string | null
  campoExperiencia?: string | null
  faixaEtaria?: string | null
  /** Default 100, máx 500 */
  limite?: number
  offset?: number
}

/**
 * Lista habilidades aplicando filtros opcionais.
 * Texto livre é buscado em `descricao` via full-text search portuguesa.
 */
export async function listarHabilidades(filtros: FiltrosBncc = {}): Promise<Habilidade[]> {
  const conditions: string[] = ['ativa = TRUE']
  const params: unknown[] = []

  if (filtros.etapa) {
    params.push(filtros.etapa)
    conditions.push(`etapa_id = $${params.length}`)
  }
  if (filtros.ano != null) {
    params.push(filtros.ano)
    conditions.push(`ano = $${params.length}`)
  }
  if (filtros.componenteId) {
    params.push(filtros.componenteId)
    conditions.push(`componente_id = $${params.length}`)
  }
  if (filtros.campoExperiencia) {
    params.push(filtros.campoExperiencia)
    conditions.push(`campo_experiencia = $${params.length}`)
  }
  if (filtros.faixaEtaria) {
    params.push(filtros.faixaEtaria)
    conditions.push(`faixa_etaria = $${params.length}`)
  }
  if (filtros.busca && filtros.busca.trim().length > 2) {
    params.push(filtros.busca.trim())
    conditions.push(`(descricao ILIKE '%' || $${params.length} || '%' OR codigo ILIKE '%' || $${params.length} || '%')`)
  }

  const limite = Math.min(filtros.limite ?? 100, 500)
  const offset = Math.max(filtros.offset ?? 0, 0)
  params.push(limite, offset)

  const sql = `
    SELECT codigo, descricao, componente_id, etapa_id, ano, campo_experiencia, faixa_etaria
      FROM bncc_habilidades
      WHERE ${conditions.join(' AND ')}
      ORDER BY etapa_id, ano NULLS LAST, componente_id, codigo
      LIMIT $${params.length - 1} OFFSET $${params.length}
  `
  const r = await pool.query(sql, params)
  return r.rows
}

/** Busca habilidade por código. */
export async function buscarHabilidadePorCodigo(codigo: string): Promise<Habilidade | null> {
  const r = await pool.query(
    `SELECT codigo, descricao, componente_id, etapa_id, ano, campo_experiencia, faixa_etaria
       FROM bncc_habilidades WHERE codigo = $1 AND ativa = TRUE LIMIT 1`,
    [codigo]
  )
  return r.rows[0] || null
}

/** Estrutura completa de componentes (com area). */
export async function listarComponentes(etapa?: string): Promise<Componente[]> {
  if (etapa) {
    const r = await pool.query(
      `SELECT c.id, c.nome, c.abreviatura, c.area_id
         FROM bncc_componentes_curriculares c
         LEFT JOIN bncc_areas_conhecimento a ON a.id = c.area_id
        WHERE (a.etapa_id = $1) OR (c.area_id IS NULL AND $1 = 'EI')
        ORDER BY c.ordem, c.nome`,
      [etapa]
    )
    return r.rows
  }
  const r = await pool.query(
    `SELECT id, nome, abreviatura, area_id
       FROM bncc_componentes_curriculares ORDER BY id`
  )
  return r.rows
}

/** Etapas disponíveis. */
export async function listarEtapas() {
  const r = await pool.query(`SELECT id, nome, ordem FROM bncc_etapas ORDER BY ordem`)
  return r.rows
}

/**
 * Mapeia o codigo de uma disciplina_escolar (LP, MAT, CIE...) para o id do
 * componente BNCC correspondente (LP_AI, LP_AF, MA_AI, MA_AF...) com base
 * na serie da turma. Anos 1-5 -> _AI, anos 6-9 -> _AF, sem serie -> AF.
 *
 * Retorna null quando o codigo nao e mapeavel (ex: disciplina customizada).
 */
export function mapearDisciplinaParaComponenteBncc(
  codigoDisciplina: string | null | undefined,
  serie: string | number | null | undefined,
): string | null {
  if (!codigoDisciplina) return null
  const codigo = codigoDisciplina.toUpperCase().trim()

  const numeroSerie = typeof serie === 'number'
    ? serie
    : parseInt(String(serie || '').replace(/[^0-9]/g, ''), 10)
  const isAI = Number.isFinite(numeroSerie) && numeroSerie >= 1 && numeroSerie <= 5
  const sufixo = isAI ? '_AI' : '_AF'

  // Mapeamento codigo disciplina_escolar -> prefixo componente BNCC
  const prefixoMap: Record<string, string> = {
    LP: 'LP',
    PORT: 'LP',
    MAT: 'MA',
    CIE: 'CI',
    HIS: 'HI',
    GEO: 'GE',
    ART: 'AR',
    EDF: 'EF',
    REL: 'ER',
    ING: 'LI', // so existe LI_AF na BNCC
  }
  const prefixo = prefixoMap[codigo]
  if (!prefixo) return null
  if (prefixo === 'LI') return 'LI_AF' // Lingua Inglesa: oficial somente AF
  return `${prefixo}${sufixo}`
}

/** Competências gerais (10). */
export async function listarCompetenciasGerais() {
  const r = await pool.query(
    `SELECT id, titulo, descricao FROM bncc_competencias_gerais ORDER BY id`
  )
  return r.rows
}

// ============================================================================
// VINCULAÇÃO
// ============================================================================

type Vinculo = 'questoes' | 'planos_aula' | 'tarefas_turma'

const TABELAS_VINCULO: Record<Vinculo, { tabela: string; coluna: string }> = {
  questoes: { tabela: 'questoes_bncc_habilidades', coluna: 'questao_id' },
  planos_aula: { tabela: 'planos_aula_bncc_habilidades', coluna: 'plano_id' },
  tarefas_turma: { tabela: 'tarefas_turma_bncc_habilidades', coluna: 'tarefa_id' },
}

export async function vincularHabilidades(
  tipo: Vinculo,
  entidadeId: string,
  codigosHabilidades: string[]
): Promise<void> {
  const { tabela, coluna } = TABELAS_VINCULO[tipo]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Remove vínculos atuais para esta entidade
    await client.query(`DELETE FROM ${tabela} WHERE ${coluna} = $1`, [entidadeId])
    // Insere os novos
    for (const codigo of codigosHabilidades) {
      await client.query(
        `INSERT INTO ${tabela} (${coluna}, habilidade_codigo) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [entidadeId, codigo]
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function listarHabilidadesVinculadas(
  tipo: Vinculo,
  entidadeId: string
): Promise<Habilidade[]> {
  const { tabela, coluna } = TABELAS_VINCULO[tipo]
  const r = await pool.query(
    `SELECT h.codigo, h.descricao, h.componente_id, h.etapa_id, h.ano,
            h.campo_experiencia, h.faixa_etaria
       FROM ${tabela} v
       INNER JOIN bncc_habilidades h ON h.codigo = v.habilidade_codigo
      WHERE v.${coluna} = $1
      ORDER BY h.codigo`,
    [entidadeId]
  )
  return r.rows
}
