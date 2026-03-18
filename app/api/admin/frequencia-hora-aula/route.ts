import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { frequenciaHoraAulaSchema } from '@/lib/schemas'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-hora-aula
 * Lista frequência por hora-aula de uma turma em uma data
 * Params: turma_id, data
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data')

    if (!turmaId || !data) {
      return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT fha.id, fha.aluno_id, fha.numero_aula, fha.disciplina_id,
              fha.presente, fha.metodo, fha.criado_em,
              a.nome AS aluno_nome, a.codigo AS aluno_codigo,
              d.nome AS disciplina_nome
       FROM frequencia_hora_aula fha
       INNER JOIN alunos a ON a.id = fha.aluno_id
       INNER JOIN disciplinas_escolares d ON d.id = fha.disciplina_id
       WHERE fha.turma_id = $1 AND fha.data = $2
       ORDER BY fha.numero_aula, a.nome`,
      [turmaId, data]
    )

    return NextResponse.json({ frequencias: result.rows })
  } catch (error: any) {
    console.error('Erro ao buscar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/frequencia-hora-aula
 * Registra frequência por aula em lote
 * Body: { turma_id, data, numero_aula, disciplina_id, registros: [{aluno_id, presente}] }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, frequenciaHoraAulaSchema)
    if (!validacao.success) return validacao.response

    const { turma_id, data, numero_aula, disciplina_id, registros } = validacao.data

    // Buscar escola_id da turma
    const turmaResult = await pool.query(
      'SELECT escola_id FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const escolaId = turmaResult.rows[0].escola_id

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let salvos = 0
      for (const reg of registros) {
        await client.query(
          `INSERT INTO frequencia_hora_aula
            (aluno_id, turma_id, escola_id, data, numero_aula, disciplina_id, presente, metodo, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)
           ON CONFLICT (aluno_id, data, numero_aula) DO UPDATE SET
            presente = EXCLUDED.presente,
            disciplina_id = EXCLUDED.disciplina_id,
            metodo = CASE
              WHEN frequencia_hora_aula.metodo = 'automatico' THEN 'manual'
              ELSE EXCLUDED.metodo
            END,
            registrado_por = EXCLUDED.registrado_por`,
          [reg.aluno_id, turma_id, escolaId, data, numero_aula, disciplina_id, reg.presente, usuario.id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Frequência registrada: ${salvos} aluno(s) na ${numero_aula}ª aula`,
        salvos,
        numero_aula,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao registrar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
