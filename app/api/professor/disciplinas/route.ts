import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/disciplinas?turma_id=X
 * Lista disciplinas disponíveis para o professor nesta turma
 * Polivalente: todas da série. Disciplina: apenas a vinculada.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Verificar tipo de vínculo
    const vinculoResult = await pool.query(
      `SELECT tipo_vinculo, disciplina_id FROM professor_turmas
       WHERE professor_id = $1 AND turma_id = $2 AND ativo = true`,
      [usuario.id, turmaId]
    )

    const vinculos = vinculoResult.rows
    const isPolivalente = vinculos.some((v: any) => v.tipo_vinculo === 'polivalente')

    if (isPolivalente) {
      // Buscar todas as disciplinas da série da turma
      const result = await pool.query(
        `SELECT DISTINCT de.id, de.nome, de.codigo, de.abreviacao, de.ordem
         FROM disciplinas_escolares de
         INNER JOIN series_disciplinas sd ON sd.disciplina_id = de.id
         INNER JOIN series_escolares se ON se.id = sd.serie_id
         INNER JOIN turmas t ON (t.serie = se.nome OR REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g') = se.numero::text)
         WHERE t.id = $1 AND de.ativo = true
         ORDER BY de.ordem, de.nome`,
        [turmaId]
      )
      return NextResponse.json({ disciplinas: result.rows })
    } else {
      // Retornar apenas as disciplinas vinculadas
      const disciplinaIds = vinculos.filter((v: any) => v.disciplina_id).map((v: any) => v.disciplina_id)
      if (disciplinaIds.length === 0) {
        return NextResponse.json({ disciplinas: [] })
      }
      const result = await pool.query(
        `SELECT id, nome, codigo, abreviacao, ordem FROM disciplinas_escolares
         WHERE id = ANY($1) AND ativo = true ORDER BY ordem, nome`,
        [disciplinaIds]
      )
      return NextResponse.json({ disciplinas: result.rows })
    }
  } catch (error: unknown) {
    console.error('Erro ao listar disciplinas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
