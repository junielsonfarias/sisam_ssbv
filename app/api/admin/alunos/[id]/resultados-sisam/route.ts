import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('resultados-sisam')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request: NextRequest, usuario) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const alunoId = segments[segments.indexOf('alunos') + 1]

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'ID do aluno é obrigatório' }, { status: 400 })
    }

    // V1 fix (IDOR): validar pertencimento aluno → escola/polo do usuário
    // antes de qualquer leitura de resultados. Aluno sem escola é tratado
    // como 404 (não revelar existência).
    const alunoCheck = await pool.query(
      'SELECT escola_id FROM alunos WHERE id = $1 AND ativo = true',
      [alunoId]
    )
    if (alunoCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }
    const escolaAlunoId = alunoCheck.rows[0].escola_id
    if (escolaAlunoId && !(await podeAcessarEscola(usuario, escolaAlunoId))) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT
        rc.ano_letivo,
        rc.serie,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.nota_producao,
        rc.media_aluno,
        rc.presenca,
        rc.nivel_aprendizagem,
        e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.aluno_id = $1
      ORDER BY rc.ano_letivo DESC, rc.serie`,
      [alunoId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    log.error('Erro ao buscar resultados SISAM', error)
    return NextResponse.json({ mensagem: 'Erro ao buscar resultados SISAM' }, { status: 500 })
  }
})
