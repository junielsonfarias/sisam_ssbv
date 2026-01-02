import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'

export const dynamic = 'force-dynamic';
// Cache de 15 segundos para listagens de alunos
export const revalidate = 15;
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
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo')
    const busca = searchParams.get('busca')

    let query = `
      SELECT 
        a.id,
        a.codigo,
        a.nome,
        a.escola_id,
        a.turma_id,
        a.serie,
        a.ano_letivo,
        a.ativo,
        a.criado_em,
        a.atualizado_em,
        e.nome as escola_nome,
        e.polo_id,
        p.nome as polo_nome,
        t.codigo as turma_codigo,
        t.nome as turma_nome
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE 1=1
    `

    const params: any[] = []
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
    if (escolaId) {
      query += ` AND a.escola_id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    if (turmaId) {
      query += ` AND a.turma_id = $${paramIndex}`
      params.push(turmaId)
      paramIndex++
    }

    if (serie) {
      query += ` AND a.serie = $${paramIndex}`
      params.push(serie)
      paramIndex++
    }

    if (anoLetivo) {
      query += ` AND a.ano_letivo = $${paramIndex}`
      params.push(anoLetivo)
      paramIndex++
    }

    if (busca) {
      // Usar similarity para busca mais eficiente com índices GIN
      query += ` AND (a.nome ILIKE $${paramIndex} OR a.codigo ILIKE $${paramIndex})`
      params.push(`%${busca}%`)
      paramIndex++
      // Limitar resultados para busca para melhor performance
      query += ' LIMIT 1000'
    }

    query += ' ORDER BY a.nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar alunos:', error)
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

    const { codigo, nome, escola_id, turma_id, serie, ano_letivo } = await request.json()

    if (!nome || !escola_id) {
      return NextResponse.json(
        { mensagem: 'Nome e escola são obrigatórios' },
        { status: 400 }
      )
    }

    // Gerar código automático se não fornecido
    const codigoFinal = codigo || await gerarCodigoAluno()

    const result = await pool.query(
      `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigoFinal,
        nome,
        escola_id,
        turma_id || null,
        serie || null,
        ano_letivo || null,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar aluno:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { id, codigo, nome, escola_id, turma_id, serie, ano_letivo, ativo } = await request.json()

    if (!id || !nome || !escola_id) {
      return NextResponse.json(
        { mensagem: 'ID, nome e escola são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `UPDATE alunos 
       SET codigo = $1, nome = $2, escola_id = $3, turma_id = $4, serie = $5, ano_letivo = $6, ativo = $7, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        codigo || null,
        nome,
        escola_id,
        turma_id || null,
        serie || null,
        ano_letivo || null,
        ativo !== undefined ? ativo : true,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar aluno:', error)
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { mensagem: 'ID do aluno é obrigatório' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM alunos WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mensagem: 'Aluno excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir aluno:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

