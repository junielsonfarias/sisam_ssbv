import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie')
    const escolasIds = searchParams.get('escolas_ids')?.split(',').filter(Boolean) || []
    const anoLetivo = searchParams.get('ano_letivo')

    // Buscar apenas turmas que têm alunos com resultados válidos (presença P/F e média > 0)
    let query = `
      SELECT DISTINCT
        t.id,
        t.codigo,
        t.nome,
        t.serie,
        t.escola_id,
        e.nome as escola_nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos_com_resultado
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
        AND rc.media_aluno IS NOT NULL
        AND CAST(rc.media_aluno AS DECIMAL) > 0
      WHERE t.ativo = true
    `

    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND e.id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolasIds.length > 0) {
      const placeholders = escolasIds.map((_, i) => `$${paramIndex + i}`).join(',')
      query += ` AND e.id IN (${placeholders})`
      params.push(...escolasIds)
      paramIndex += escolasIds.length
    }

    if (serie && serie.trim() !== '') {
      query += ` AND t.serie = $${paramIndex}`
      params.push(serie.trim())
      paramIndex++
    }

    if (anoLetivo && anoLetivo.trim() !== '') {
      query += ` AND t.ano_letivo = $${paramIndex}`
      params.push(anoLetivo.trim())
      paramIndex++
    }

    query += ' GROUP BY t.id, t.codigo, t.nome, t.serie, t.escola_id, e.nome'
    query += ' HAVING COUNT(DISTINCT rc.aluno_id) > 0'
    query += ' ORDER BY t.serie, t.codigo, e.nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar turmas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

