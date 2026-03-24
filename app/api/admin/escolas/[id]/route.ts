import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/escolas/[id]
 * Retorna escola completa com estatísticas agregadas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const escolaId = params.id

    // Escola users can only see their own school
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escolaId) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    const result = await pool.query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM turmas t WHERE t.escola_id = e.id AND t.ano_letivo = $2 AND t.ativo = true) as total_turmas,
        (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ano_letivo = $2 AND a.ativo = true) as total_alunos,
        (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ano_letivo = $2 AND a.pcd = true) as total_pcd,
        p.nome as polo_nome
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE e.id = $1`,
      [escolaId, anoLetivo]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Escola não encontrada' },
        { status: 404 }
      )
    }

    const escola = {
      ...result.rows[0],
      total_turmas: parseInt(result.rows[0].total_turmas) || 0,
      total_alunos: parseInt(result.rows[0].total_alunos) || 0,
      total_pcd: parseInt(result.rows[0].total_pcd) || 0,
    }

    return NextResponse.json(escola)
  } catch (error: unknown) {
    console.error('Erro ao buscar escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/escolas/[id]
 * Atualiza escola (admin/tecnico apenas)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const escolaId = params.id
    const body = await request.json()

    // Only allow real escola columns
    const allowedFields = [
      'nome', 'codigo', 'polo_id', 'endereco', 'telefone', 'email', 'ativo', 'gestor_escolar_habilitado',
      // INEP - Identificacao
      'codigo_inep', 'situacao_funcionamento', 'dependencia_administrativa',
      'categoria_escola', 'localizacao', 'localizacao_diferenciada',
      'tipo_atendimento_escolarizacao', 'etapas_ensino', 'modalidade_ensino',
      // INEP - Infraestrutura
      'agua_potavel', 'energia_eletrica', 'esgoto_sanitario', 'coleta_lixo',
      'internet', 'banda_larga', 'quadra_esportiva', 'biblioteca',
      'laboratorio_informatica', 'laboratorio_ciencias',
      'acessibilidade_deficiente', 'alimentacao_escolar',
      // INEP - Localizacao
      'latitude', 'longitude', 'cep', 'bairro', 'municipio', 'uf',
      'distrito', 'complemento',
      // INEP - Outros
      'telefone_ddd', 'telefone_numero', 'cnpj_mantenedora', 'data_criacao'
    ]

    // Build dynamic SET clause with value sanitization
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key)) continue

      // Sanitize values
      let sanitized = value
      if (sanitized === '') sanitized = null  // empty string → null
      if (key === 'etapas_ensino') {
        // Ensure it's a proper array for TEXT[]
        sanitized = Array.isArray(value) ? value : (value ? [value] : [])
      }
      if (key === 'latitude' || key === 'longitude') {
        sanitized = value ? parseFloat(value as string) || null : null
      }

      setClauses.push(`${key} = $${paramIndex}`)
      values.push(sanitized)
      paramIndex++
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { mensagem: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    // Always update atualizado_em
    setClauses.push('atualizado_em = CURRENT_TIMESTAMP')

    values.push(escolaId)

    const result = await pool.query(
      `UPDATE escolas SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Escola não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar escola:', (error as Error)?.message || error, 'Code:', (error as DatabaseError)?.code, 'Detail:', (error as DatabaseError)?.detail)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
