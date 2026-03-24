import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'

// ============================================================================
// Service de Escolas — logica compartilhada entre admin, polo e escola
// ============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface EscolaDetalhada {
  id: string
  nome: string
  codigo: string | null
  polo_id: string | null
  polo_nome: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
  total_turmas: number
  total_alunos: number
  total_pcd: number
  [key: string]: unknown // demais campos INEP
}

export interface VinculosEscola {
  totalAlunos: number
  totalTurmas: number
  totalResultados: number
  totalConsolidados: number
  totalUsuarios: number
  temVinculos: boolean
}

export interface ResultadoExclusao {
  sucesso: boolean
  mensagem: string
  vinculos?: Omit<VinculosEscola, 'temVinculos'>
}

// ---------------------------------------------------------------------------
// buscarEscolaDetalhada
// ---------------------------------------------------------------------------

/**
 * Busca escola com dados completos (polo nome, estatisticas por ano letivo).
 * Retorna null se a escola nao existir.
 */
export async function buscarEscolaDetalhada(
  escolaId: string,
  anoLetivo?: string
): Promise<EscolaDetalhada | null> {
  const ano = anoLetivo || new Date().getFullYear().toString()

  const result = await pool.query(
    `SELECT e.*,
      (SELECT COUNT(*) FROM turmas t WHERE t.escola_id = e.id AND t.ano_letivo = $2 AND t.ativo = true) as total_turmas,
      (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ano_letivo = $2 AND a.ativo = true) as total_alunos,
      (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ano_letivo = $2 AND a.pcd = true) as total_pcd,
      p.nome as polo_nome
    FROM escolas e
    LEFT JOIN polos p ON e.polo_id = p.id
    WHERE e.id = $1`,
    [escolaId, ano]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    ...row,
    total_turmas: parseInt(row.total_turmas) || 0,
    total_alunos: parseInt(row.total_alunos) || 0,
    total_pcd: parseInt(row.total_pcd) || 0,
  }
}

// ---------------------------------------------------------------------------
// verificarVinculosEscola
// ---------------------------------------------------------------------------

/**
 * Verifica vinculos de uma escola antes de excluir.
 * Retorna contagens de: alunos, turmas, resultados, consolidados, usuarios.
 */
export async function verificarVinculosEscola(
  escolaId: string
): Promise<VinculosEscola> {
  const vinculosResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as total_alunos,
      (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as total_turmas,
      (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as total_resultados,
      (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
      (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as total_usuarios
  `, [escolaId])

  const row = vinculosResult.rows[0]

  const totalAlunos = parseInt(row.total_alunos) || 0
  const totalTurmas = parseInt(row.total_turmas) || 0
  const totalResultados = parseInt(row.total_resultados) || 0
  const totalConsolidados = parseInt(row.total_consolidados) || 0
  const totalUsuarios = parseInt(row.total_usuarios) || 0

  return {
    totalAlunos,
    totalTurmas,
    totalResultados,
    totalConsolidados,
    totalUsuarios,
    temVinculos:
      totalAlunos > 0 ||
      totalTurmas > 0 ||
      totalResultados > 0 ||
      totalConsolidados > 0 ||
      totalUsuarios > 0,
  }
}

// ---------------------------------------------------------------------------
// excluirEscola
// ---------------------------------------------------------------------------

/**
 * Exclui escola (hard delete) se nao tiver vinculos.
 * Usa transacao atomica para evitar race condition entre verificacao e exclusao.
 */
export async function excluirEscola(escolaId: string): Promise<ResultadoExclusao> {
  return withTransaction(async (client) => {
    // Verificar vinculos dentro da transacao
    const vinculosResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as total_alunos,
        (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
        (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as total_usuarios
    `, [escolaId])

    const row = vinculosResult.rows[0]

    const totalAlunos = parseInt(row.total_alunos) || 0
    const totalTurmas = parseInt(row.total_turmas) || 0
    const totalResultados = parseInt(row.total_resultados) || 0
    const totalConsolidados = parseInt(row.total_consolidados) || 0
    const totalUsuarios = parseInt(row.total_usuarios) || 0

    if (totalAlunos > 0 || totalTurmas > 0 || totalResultados > 0 ||
        totalConsolidados > 0 || totalUsuarios > 0) {
      return {
        sucesso: false,
        mensagem: 'Nao e possivel excluir a escola pois possui vinculos',
        vinculos: {
          totalAlunos,
          totalTurmas,
          totalResultados,
          totalConsolidados,
          totalUsuarios,
        },
      }
    }

    const delResult = await client.query(
      'DELETE FROM escolas WHERE id = $1 RETURNING nome',
      [escolaId]
    )

    if (delResult.rows.length === 0) {
      return {
        sucesso: false,
        mensagem: 'Escola não encontrada',
      }
    }

    return {
      sucesso: true,
      mensagem: `Escola "${delResult.rows[0].nome}" excluida com sucesso`,
    }
  })
}
