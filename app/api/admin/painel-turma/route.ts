import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { buscarPainelTurma } from '@/lib/services/painelTurma.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('painel-turma')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/painel-turma
 * Retorna dados do painel da turma: alunos, status de entrada, horário do dia, frequência por aula
 * Params: turma_id, data (YYYY-MM-DD, default: hoje)
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    // V2 fix (IDOR): validar pertencimento turma → escola do usuário antes
    // de carregar o painel. Sem isso, um diretor da escola X consegue ver o
    // roster + status de entrada de qualquer turma da escola Y.
    const turmaCheck = await pool.query(
      'SELECT escola_id FROM turmas WHERE id = $1',
      [turmaId]
    )
    if (turmaCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const escolaTurmaId = turmaCheck.rows[0].escola_id
    if (escolaTurmaId && !(await podeAcessarEscola(usuario, escolaTurmaId))) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const resultado = await buscarPainelTurma(turmaId, data)

    if (!resultado) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    return NextResponse.json(resultado)
  } catch (error: unknown) {
    log.error('Erro no painel da turma', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
