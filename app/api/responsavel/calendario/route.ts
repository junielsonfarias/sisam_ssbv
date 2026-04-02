import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/calendario?mes=MM&ano=YYYY
 * Retorna eventos publicos + tarefas dos filhos para o mes
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)
    const ano = searchParams.get('ano') || String(new Date().getFullYear())

    // Eventos publicos do mes
    const eventosResult = await pool.query(
      `SELECT id, titulo, descricao, tipo, data_inicio, data_fim, local
       FROM eventos
       WHERE publico = true AND ativo = true
         AND EXTRACT(MONTH FROM data_inicio) = $1
         AND EXTRACT(YEAR FROM data_inicio) = $2
       ORDER BY data_inicio`,
      [mes, ano]
    )

    // Turmas dos filhos
    const turmasResult = await pool.query(
      `SELECT DISTINCT a.turma_id FROM alunos a
       INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
       WHERE ra.usuario_id = $1 AND ra.ativo = true AND a.ativo = true AND a.turma_id IS NOT NULL`,
      [usuario.id]
    )
    const turmaIds = turmasResult.rows.map((r: any) => r.turma_id)

    // Tarefas do mes
    let tarefas: any[] = []
    if (turmaIds.length > 0) {
      const tarefasResult = await pool.query(
        `SELECT t.id, t.titulo, t.disciplina, t.data_entrega, t.tipo,
                tu.codigo AS turma_codigo
         FROM tarefas_turma t
         INNER JOIN turmas tu ON t.turma_id = tu.id
         WHERE t.turma_id = ANY($1) AND t.ativo = true
           AND EXTRACT(MONTH FROM t.data_entrega) = $2
           AND EXTRACT(YEAR FROM t.data_entrega) = $3
         ORDER BY t.data_entrega`,
        [turmaIds, mes, ano]
      )
      tarefas = tarefasResult.rows
    }

    // Periodos letivos do ano
    const periodosResult = await pool.query(
      `SELECT nome, numero, data_inicio, data_fim
       FROM periodos_letivos
       WHERE ano_letivo = $1 AND ativo = true
       ORDER BY numero`,
      [ano]
    )

    return NextResponse.json({
      eventos: eventosResult.rows,
      tarefas,
      periodos: periodosResult.rows,
      mes: parseInt(mes),
      ano: parseInt(ano),
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar calendario responsavel:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
