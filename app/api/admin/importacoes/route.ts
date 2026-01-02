import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

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

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Construir query com filtros
    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    // Filtro por usuário (se não for admin, só ver suas próprias importações)
    if (usuario.tipo_usuario !== 'administrador') {
      whereConditions.push(`usuario_id = $${paramIndex}`)
      params.push(usuario.id)
      paramIndex++
    }

    if (anoLetivo) {
      whereConditions.push(`ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : ''

    // Buscar importações com informações do usuário
    const importacoesQuery = `
      SELECT 
        i.id,
        i.nome_arquivo,
        i.ano_letivo,
        i.total_linhas,
        i.linhas_processadas,
        i.linhas_com_erro,
        i.status,
        i.polos_criados,
        i.polos_existentes,
        i.escolas_criadas,
        i.escolas_existentes,
        i.turmas_criadas,
        i.turmas_existentes,
        i.alunos_criados,
        i.alunos_existentes,
        i.questoes_criadas,
        i.questoes_existentes,
        i.resultados_novos,
        i.resultados_duplicados,
        i.criado_em,
        i.concluido_em,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM importacoes i
      INNER JOIN usuarios u ON i.usuario_id = u.id
      ${whereClause}
      ORDER BY i.criado_em DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const importacoesResult = await pool.query(importacoesQuery, params)

    // Contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM importacoes i
      ${whereClause}
    `
    const countParams = params.slice(0, -2) // Remover limit e offset
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      importacoes: importacoesResult.rows,
      paginacao: {
        pagina: page,
        limite: limit,
        total,
        total_paginas: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar histórico de importações:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

