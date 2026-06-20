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
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // Guarda de vínculo: escola/polo sem unidade vinculada não pode cair em
    // consulta sem filtro (contaria presenças/alunos de outras unidades).
    if (usuario.tipo_usuario === 'escola' && !usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Usuário sem escola vinculada' }, { status: 403 })
    }
    if (usuario.tipo_usuario === 'polo' && !usuario.polo_id) {
      return NextResponse.json({ mensagem: 'Usuário sem polo vinculado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]
    let escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')
    const poloIdUsuario = usuario.tipo_usuario === 'polo' ? usuario.polo_id : null

    // Controle de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      escolaId = usuario.escola_id
    }

    // Totais por status no dia (presente/ausente/justificado).
    let presencaQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'presente') AS total_presentes,
        COUNT(*) FILTER (WHERE status = 'ausente') AS total_ausentes,
        COUNT(*) FILTER (WHERE status = 'justificado') AS total_justificados
      FROM frequencia_diaria
      WHERE data = $1
    `
    const presencaParams: (string)[] = [data]
    let paramIdx = 2

    if (escolaId) {
      presencaQuery += ` AND escola_id = $${paramIdx}`
      presencaParams.push(escolaId)
      paramIdx++
    } else if (poloIdUsuario) {
      presencaQuery += ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIdx})`
      presencaParams.push(poloIdUsuario)
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
    } else if (poloIdUsuario) {
      alunosQuery += ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${alunoIdx})`
      alunosParams.push(poloIdUsuario)
      alunoIdx++
    }

    if (turmaId) {
      alunosQuery += ` AND turma_id = $${alunoIdx}`
      alunosParams.push(turmaId)
      alunoIdx++
    }

    // Sem safeQuery silencioso: falha de query deve propagar para o catch
    // externo (que retorna 500), e não virar um 200 com zeros (sucesso falso).
    const [presencaResult, alunosResult] = await Promise.all([
      pool.query(presencaQuery, presencaParams),
      pool.query(alunosQuery, alunosParams),
    ])

    const presenca = presencaResult.rows[0]
    const totalAlunos = parseInt(alunosResult.rows[0]?.total_alunos || '0', 10)
    const totalPresentes = parseInt(presenca?.total_presentes || '0', 10)
    const totalAusentes = parseInt(presenca?.total_ausentes || '0', 10)
    const totalJustificados = parseInt(presenca?.total_justificados || '0', 10)
    const taxaPresenca = totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 10000) / 100 : 0

    return NextResponse.json({
      data,
      total_alunos: totalAlunos,
      total_presentes: totalPresentes,
      total_ausentes: totalAusentes,
      total_justificados: totalJustificados,
      taxa_presenca: taxaPresenca,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar resumo de frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
