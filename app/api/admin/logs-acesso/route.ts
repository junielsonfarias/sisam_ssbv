import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import {
  parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  parseSearchParams, createWhereBuilder, addCondition, addSearchCondition,
  addRawCondition, buildWhereString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador'], async (request, usuario) => {
  // Obter parametros de filtro
  const searchParams = request.nextUrl.searchParams
  const { dataInicio, dataFim, email, tipoUsuario } = parseSearchParams(searchParams, ['dataInicio', 'dataFim', 'email', 'tipoUsuario'])
  const paginacao = parsePaginacao(searchParams, { limitePadrao: 50 })

  // Construir filtros
  const where = createWhereBuilder()
  addCondition(where, 'criado_em', dataInicio, '>=')
  if (dataFim) {
    addRawCondition(where, `criado_em <= $${where.paramIndex}::timestamp + interval '1 day'`, [dataFim])
  }
  addSearchCondition(where, ['email'], email)
  addCondition(where, 'tipo_usuario', tipoUsuario)

  const whereClause = buildWhereString(where)

  // Buscar logs com paginacao
  const logsQuery = `
    SELECT
      id,
      usuario_id,
      usuario_nome,
      email,
      tipo_usuario,
      ip_address,
      user_agent,
      criado_em
    FROM logs_acesso
    ${whereClause}
    ORDER BY criado_em DESC
    ${buildLimitOffset(paginacao)}
  `

  const logsResult = await pool.query(logsQuery, where.params)

  // Contar total de registros
  const countQuery = `SELECT COUNT(*) as total FROM logs_acesso ${whereClause}`
  const countResult = await pool.query(countQuery, where.params)
  const total = parseInt(countResult.rows[0].total)

  // Buscar estatisticas por dia (ultimos 30 dias)
  const estatisticasPorDiaQuery = `
    SELECT
      DATE(criado_em) as data,
      COUNT(*) as total_logins,
      COUNT(DISTINCT usuario_id) as usuarios_unicos
    FROM logs_acesso
    WHERE criado_em >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(criado_em)
    ORDER BY data DESC
  `
  const estatisticasPorDiaResult = await pool.query(estatisticasPorDiaQuery)

  // Buscar totalizadores
  const totalizadoresQuery = `
    SELECT
      (SELECT COUNT(*) FROM logs_acesso WHERE DATE(criado_em) = CURRENT_DATE) as logins_hoje,
      (SELECT COUNT(*) FROM logs_acesso WHERE criado_em >= NOW() - INTERVAL '7 days') as logins_7_dias,
      (SELECT COUNT(*) FROM logs_acesso WHERE criado_em >= NOW() - INTERVAL '30 days') as logins_30_dias,
      (SELECT COUNT(DISTINCT usuario_id) FROM logs_acesso WHERE criado_em >= NOW() - INTERVAL '30 days') as usuarios_unicos_30_dias,
      (SELECT COUNT(*) FROM logs_acesso) as total_geral
  `
  const totalizadoresResult = await pool.query(totalizadoresQuery)

  // Buscar logins por tipo de usuario (ultimos 30 dias)
  const loginsPorTipoQuery = `
    SELECT
      tipo_usuario,
      COUNT(*) as total
    FROM logs_acesso
    WHERE criado_em >= NOW() - INTERVAL '30 days'
    GROUP BY tipo_usuario
    ORDER BY total DESC
  `
  const loginsPorTipoResult = await pool.query(loginsPorTipoQuery)

  return NextResponse.json({
    logs: logsResult.rows,
    paginacao: buildPaginacaoResponse(paginacao, total),
    estatisticas: {
      porDia: estatisticasPorDiaResult.rows,
      porTipo: loginsPorTipoResult.rows,
      totalizadores: {
        loginsHoje: parseInt(totalizadoresResult.rows[0].logins_hoje) || 0,
        logins7Dias: parseInt(totalizadoresResult.rows[0].logins_7_dias) || 0,
        logins30Dias: parseInt(totalizadoresResult.rows[0].logins_30_dias) || 0,
        usuariosUnicos30Dias: parseInt(totalizadoresResult.rows[0].usuarios_unicos_30_dias) || 0,
        totalGeral: parseInt(totalizadoresResult.rows[0].total_geral) || 0
      }
    }
  })
})
