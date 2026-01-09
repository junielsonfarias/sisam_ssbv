import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

// Desabilitar cache para garantir dados sempre atualizados
export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('id')

    let query = `
      SELECT e.*, p.nome as polo_nome
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true
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
    if (poloId) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(poloId)
      paramIndex++
    }

    if (escolaId) {
      query += ` AND e.id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    query += ' ORDER BY e.nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar escolas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { nome, codigo, polo_id, endereco, telefone, email } = await request.json()

    if (!nome || !polo_id) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatórios: nome, polo_id' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO escolas (nome, codigo, polo_id, endereco, telefone, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nome, codigo || null, polo_id, endereco || null, telefone || null, email || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('id')

    if (!escolaId) {
      return NextResponse.json(
        { mensagem: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar vínculos antes de excluir
    const vinculosResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as total_alunos,
        (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
        (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as total_usuarios
    `, [escolaId])

    const vinculos = vinculosResult.rows[0]
    
    if (vinculos.total_alunos > 0 || vinculos.total_turmas > 0 || 
        vinculos.total_resultados > 0 || vinculos.total_consolidados > 0 || 
        vinculos.total_usuarios > 0) {
      return NextResponse.json(
        { 
          mensagem: 'Não é possível excluir a escola pois possui vínculos',
          vinculos: {
            totalAlunos: parseInt(vinculos.total_alunos) || 0,
            totalTurmas: parseInt(vinculos.total_turmas) || 0,
            totalResultados: parseInt(vinculos.total_resultados) || 0,
            totalConsolidados: parseInt(vinculos.total_consolidados) || 0,
            totalUsuarios: parseInt(vinculos.total_usuarios) || 0,
          }
        },
        { status: 400 }
      )
    }

    // Excluir a escola
    await pool.query('DELETE FROM escolas WHERE id = $1', [escolaId])

    return NextResponse.json(
      { mensagem: 'Escola excluída com sucesso' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Erro ao excluir escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

