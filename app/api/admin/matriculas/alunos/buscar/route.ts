import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  createWhereBuilder, addRawCondition, addSearchCondition, addCondition,
  addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const busca = sp.get('busca')
    const escolaId = sp.get('escola_id')
    const turmaId = sp.get('turma_id')
    const serie = sp.get('serie')
    const anoLetivo = sp.get('ano_letivo')

    // Exige pelo menos um critério de filtro (busca textual OU algum filtro)
    const temFiltro = (busca && busca.trim().length >= 2) || escolaId || turmaId || serie || anoLetivo
    if (!temFiltro) {
      return NextResponse.json([])
    }

    const where = createWhereBuilder()
    addRawCondition(where, 'a.ativo = true')
    if (busca && busca.trim().length >= 2) {
      addSearchCondition(where, ['a.nome', 'a.codigo', 'a.cpf'], busca)
    }
    addCondition(where, 'a.escola_id', escolaId)
    addCondition(where, 'a.turma_id', turmaId)
    addCondition(where, 'a.ano_letivo', anoLetivo)

    // Série: comparação flexível extraindo número
    if (serie) {
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        addRawCondition(
          where,
          `COALESCE(a.serie_numero, REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g')) = $${where.paramIndex}`,
          [numeroSerie]
        )
      } else {
        addCondition(where, 'a.serie', serie, 'ILIKE')
      }
    }

    addAccessControl(where, usuario, { escolaIdField: 'a.escola_id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.escola_id, a.turma_id,
              a.cpf, a.data_nascimento, a.pcd,
              e.nome as escola_nome,
              t.codigo as turma_codigo, t.nome as turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE ${buildConditionsString(where)}
       ORDER BY a.nome
       LIMIT 50`,
      where.params
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    console.error('Erro ao buscar alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
