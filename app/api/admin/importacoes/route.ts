import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  parseSearchParams, parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  createWhereBuilder, addCondition, buildWhereString, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const { ano_letivo, status } = parseSearchParams(searchParams, ['ano_letivo', 'status'])
    const paginacao = parsePaginacao(searchParams, { camposPagina: 'page', camposLimite: 'limit', limitePadrao: 20 })

    const where = createWhereBuilder()
    if (usuario.tipo_usuario !== 'administrador') {
      addCondition(where, 'usuario_id', usuario.id)
    }
    addCondition(where, 'ano_letivo', ano_letivo)
    addCondition(where, 'status', status)

    const whereClause = buildWhereString(where)

    const [importacoesResult, countResult] = await Promise.all([
      pool.query(
        `SELECT i.id, i.nome_arquivo, i.ano_letivo, i.total_linhas,
          i.linhas_processadas, i.linhas_com_erro, i.status,
          i.polos_criados, i.polos_existentes, i.escolas_criadas, i.escolas_existentes,
          i.turmas_criadas, i.turmas_existentes, i.alunos_criados, i.alunos_existentes,
          i.questoes_criadas, i.questoes_existentes, i.resultados_novos, i.resultados_duplicados,
          i.criado_em, i.concluido_em,
          u.nome as usuario_nome, u.email as usuario_email
        FROM importacoes i
        INNER JOIN usuarios u ON i.usuario_id = u.id
        ${whereClause}
        ORDER BY i.criado_em DESC
        ${buildLimitOffset(paginacao)}`,
        where.params
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM importacoes i ${whereClause}`,
        where.params
      ),
    ])

    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      importacoes: importacoesResult.rows,
      paginacao: buildPaginacaoResponse(paginacao, total),
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar histórico de importações:', error)
    return NextResponse.json(
      { mensagem: (error as Error).message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

