import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-diaria/resumo
 * Resumo de frequência diária: presentes hoje, métodos, dispositivos online
 * Params: escola_id, data (default: hoje)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]
    let escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')

    // Controle de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      escolaId = usuario.escola_id
    }

    // Total de presentes no dia (exclui registros com status='ausente')
    let presencaQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'presente') AS total_presentes,
        COUNT(*) FILTER (WHERE status = 'ausente') AS total_ausentes
      FROM frequencia_diaria
      WHERE data = $1
    `
    const presencaParams: (string)[] = [data]
    let paramIdx = 2

    if (escolaId) {
      presencaQuery += ` AND escola_id = $${paramIdx}`
      presencaParams.push(escolaId)
      paramIdx++
    }

    if (turmaId) {
      presencaQuery += ` AND turma_id = $${paramIdx}`
      presencaParams.push(turmaId)
      paramIdx++
    }

    // Total de alunos ativos do ano letivo (respeitando escola e turma selecionadas)
    const anoLetivo = data.substring(0, 4)
    let alunosQuery = `
      SELECT COUNT(*) AS total_alunos
      FROM alunos
      WHERE ativo = true AND situacao = 'cursando' AND ano_letivo = $1
    `
    const alunosParams: string[] = [anoLetivo]
    let alunoIdx = 2

    if (escolaId) {
      alunosQuery += ` AND escola_id = $${alunoIdx}`
      alunosParams.push(escolaId)
      alunoIdx++
    }

    if (turmaId) {
      alunosQuery += ` AND turma_id = $${alunoIdx}`
      alunosParams.push(turmaId)
      alunoIdx++
    }

    const safeQuery = async (sql: string, params: any[] = []) => {
      try { return await pool.query(sql, params) }
      catch (err: unknown) { console.error('[Freq Resumo] Query falhou:', (err as Error)?.message); return { rows: [] } }
    }

    const [presencaResult, alunosResult] = await Promise.all([
      safeQuery(presencaQuery, presencaParams),
      safeQuery(alunosQuery, alunosParams),
    ])

    const presenca = presencaResult.rows[0]
    const totalAlunos = parseInt(alunosResult.rows[0]?.total_alunos || '0', 10)
    const totalPresentes = parseInt(presenca?.total_presentes || '0', 10)
    const totalAusentes = parseInt(presenca?.total_ausentes || '0', 10)
    const taxaPresenca = totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 10000) / 100 : 0

    return NextResponse.json({
      data,
      total_alunos: totalAlunos,
      total_presentes: totalPresentes,
      total_ausentes: totalAusentes,
      taxa_presenca: taxaPresenca,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar resumo de frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
