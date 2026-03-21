import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/frequencia-diaria
 * Lista frequência diária de uma turma do professor
 * Params: turma_id, data
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data')

    if (!turmaId || !data) {
      return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
    }

    if (!validarData(data)) {
      return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
    }

    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Buscar alunos da turma com status de frequência
    const result = await pool.query(
      `SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo,
              fd.id as frequencia_id, fd.status, fd.justificativa,
              fd.hora_entrada, fd.hora_saida, fd.metodo
       FROM alunos a
       LEFT JOIN frequencia_diaria fd ON fd.aluno_id = a.id AND fd.data = $2
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId, data]
    )

    // Resumo
    const total = result.rows.length
    const presentes = result.rows.filter((r: any) => r.status === 'presente').length
    const ausentes = result.rows.filter((r: any) => r.status === 'ausente').length
    const semRegistro = result.rows.filter((r: any) => !r.status).length

    return NextResponse.json({
      alunos: result.rows,
      resumo: {
        total,
        presentes,
        ausentes,
        sem_registro: semRegistro,
        percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar frequência diária:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/professor/frequencia-diaria
 * Registra frequência diária em lote (presente/ausente)
 * Body: { turma_id, data, registros: [{aluno_id, status}] }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { turma_id, data, registros } = await request.json()

    if (!turma_id || !data || !registros || !Array.isArray(registros)) {
      return NextResponse.json({ mensagem: 'turma_id, data e registros são obrigatórios' }, { status: 400 })
    }

    if (!validarData(data)) {
      return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
    }

    const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Buscar escola_id da turma
    const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turma_id])
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const escolaId = turmaResult.rows[0].escola_id

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let salvos = 0
      for (const reg of registros) {
        if (!reg.aluno_id || !reg.status) continue

        await client.query(
          `INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
           VALUES ($1, $2, $3, $4, 'manual', $5, $6)
           ON CONFLICT (aluno_id, data) DO UPDATE SET
             status = EXCLUDED.status,
             metodo = 'manual',
             registrado_por = EXCLUDED.registrado_por`,
          [reg.aluno_id, turma_id, escolaId, data, reg.status, usuario.id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Frequência registrada: ${salvos} aluno(s)`,
        salvos,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao registrar frequência diária:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/professor/frequencia-diaria
 * Remove um registro de frequência
 * Body: { frequencia_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { frequencia_id } = await request.json()
    if (!frequencia_id) {
      return NextResponse.json({ mensagem: 'frequencia_id é obrigatório' }, { status: 400 })
    }

    // Verificar que a frequência pertence a uma turma do professor
    const freqResult = await pool.query(
      `SELECT fd.id, fd.turma_id FROM frequencia_diaria fd
       INNER JOIN professor_turmas pt ON pt.turma_id = fd.turma_id
       WHERE fd.id = $1 AND pt.professor_id = $2 AND pt.ativo = true`,
      [frequencia_id, usuario.id]
    )
    if (freqResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Registro não encontrado ou sem permissão' }, { status: 404 })
    }

    await pool.query('DELETE FROM frequencia_diaria WHERE id = $1', [frequencia_id])

    return NextResponse.json({ mensagem: 'Registro excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
