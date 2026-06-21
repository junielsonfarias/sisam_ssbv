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
  totalNotas: number
  totalFrequencia: number
  totalDocumentos: number
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
 * Verifica vinculos de uma escola antes de excluir. Espelha exatamente o
 * check de bloqueio de excluirEscola() para que o pre-check mostrado ao
 * usuario nao divirja da regra real de exclusao.
 * Retorna contagens de: alunos, turmas, resultados, consolidados, usuarios,
 * notas_escolares, frequencia_bimestral e documentos_emitidos.
 */
export async function verificarVinculosEscola(
  escolaId: string
): Promise<VinculosEscola> {
  const vinculosResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM alunos             WHERE escola_id = $1) as total_alunos,
      (SELECT COUNT(*) FROM turmas             WHERE escola_id = $1) as total_turmas,
      (SELECT COUNT(*) FROM resultados_provas  WHERE escola_id = $1) as total_resultados,
      (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
      (SELECT COUNT(*) FROM usuarios           WHERE escola_id = $1) as total_usuarios,
      (SELECT COUNT(*) FROM notas_escolares ne JOIN alunos a ON a.id = ne.aluno_id WHERE a.escola_id = $1) as total_notas,
      (SELECT COUNT(*) FROM frequencia_bimestral fb JOIN alunos a ON a.id = fb.aluno_id WHERE a.escola_id = $1) as total_frequencia,
      (SELECT COUNT(*) FROM documentos_emitidos WHERE escola_id = $1) as total_documentos
  `, [escolaId])

  const row = vinculosResult.rows[0]

  const totalAlunos = parseInt(row.total_alunos) || 0
  const totalTurmas = parseInt(row.total_turmas) || 0
  const totalResultados = parseInt(row.total_resultados) || 0
  const totalConsolidados = parseInt(row.total_consolidados) || 0
  const totalUsuarios = parseInt(row.total_usuarios) || 0
  const totalNotas = parseInt(row.total_notas) || 0
  const totalFrequencia = parseInt(row.total_frequencia) || 0
  const totalDocumentos = parseInt(row.total_documentos) || 0

  return {
    totalAlunos,
    totalTurmas,
    totalResultados,
    totalConsolidados,
    totalUsuarios,
    totalNotas,
    totalFrequencia,
    totalDocumentos,
    temVinculos:
      totalAlunos > 0 ||
      totalTurmas > 0 ||
      totalResultados > 0 ||
      totalConsolidados > 0 ||
      totalUsuarios > 0 ||
      totalNotas > 0 ||
      totalFrequencia > 0 ||
      totalDocumentos > 0,
  }
}

// ---------------------------------------------------------------------------
// excluirEscola
// ---------------------------------------------------------------------------

/**
 * Soft delete da escola (marca ativo=false) se nao tiver vinculos pedagogicos
 * relevantes. Antes (até 2026-05-26): hard delete + check incompleto (so
 * resultados_provas/consolidados e usuarios). Agora bloqueia tambem por:
 * notas_escolares, frequencia_bimestral, documentos_emitidos.
 *
 * Bug ALTO #16 da auditoria E2E. Soft delete preserva trilha de auditoria
 * + permite reativacao + nao quebra documentos_emitidos com QR code publico.
 *
 * Usa transacao atomica para evitar race entre verificacao e exclusao.
 */
export async function excluirEscola(escolaId: string): Promise<ResultadoExclusao> {
  return withTransaction(async (client) => {
    const vinculosResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM alunos             WHERE escola_id = $1) as total_alunos,
        (SELECT COUNT(*) FROM turmas             WHERE escola_id = $1) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas  WHERE escola_id = $1) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
        (SELECT COUNT(*) FROM usuarios           WHERE escola_id = $1) as total_usuarios,
        (SELECT COUNT(*) FROM notas_escolares ne JOIN alunos a ON a.id = ne.aluno_id WHERE a.escola_id = $1) as total_notas,
        (SELECT COUNT(*) FROM frequencia_bimestral fb JOIN alunos a ON a.id = fb.aluno_id WHERE a.escola_id = $1) as total_frequencia,
        (SELECT COUNT(*) FROM documentos_emitidos WHERE escola_id = $1) as total_documentos
    `, [escolaId])

    const row = vinculosResult.rows[0]

    const totalAlunos = parseInt(row.total_alunos) || 0
    const totalTurmas = parseInt(row.total_turmas) || 0
    const totalResultados = parseInt(row.total_resultados) || 0
    const totalConsolidados = parseInt(row.total_consolidados) || 0
    const totalUsuarios = parseInt(row.total_usuarios) || 0
    const totalNotas = parseInt(row.total_notas) || 0
    const totalFrequencia = parseInt(row.total_frequencia) || 0
    const totalDocumentos = parseInt(row.total_documentos) || 0

    if (totalAlunos > 0 || totalTurmas > 0 || totalResultados > 0 ||
        totalConsolidados > 0 || totalUsuarios > 0 || totalNotas > 0 ||
        totalFrequencia > 0 || totalDocumentos > 0) {
      return {
        sucesso: false,
        mensagem: 'Não é possível excluir a escola pois possui vínculos pedagógicos. Considere desativá-la em vez de excluir.',
        vinculos: {
          totalAlunos,
          totalTurmas,
          totalResultados,
          totalConsolidados,
          totalUsuarios,
          // Novos contadores expostos para que a UI possa mostrar o motivo
          totalNotas,
          totalFrequencia,
          totalDocumentos,
        } as ResultadoExclusao['vinculos'],
      }
    }

    // Soft delete: marca como inativa em vez de DELETE fisico. Preserva
    // historico e permite reativar. Documentos com QR code publico
    // continuam validando (escola_id permanece).
    const delResult = await client.query(
      `UPDATE escolas
          SET ativo = false,
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING nome`,
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
      mensagem: `Escola "${delResult.rows[0].nome}" desativada com sucesso`,
    }
  })
}
