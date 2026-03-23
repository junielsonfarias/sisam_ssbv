import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

// Desabilitar cache para garantir dados sempre atualizados
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  // Se usuário é polo ou escola, só pode ver seu próprio polo
  if (usuario.tipo_usuario === 'polo' || usuario.tipo_usuario === 'escola') {
    const poloIdPermitido = usuario.polo_id
    if (id && id !== poloIdPermitido) {
      return NextResponse.json(
        { mensagem: 'Não autorizado a acessar este polo' },
        { status: 403 }
      )
    }
    // Retornar apenas o polo do usuário
    const result = await pool.query(
      'SELECT * FROM polos WHERE id = $1',
      [poloIdPermitido]
    )
    return NextResponse.json(result.rows)
  }

  // Admin e tecnico podem ver todos os polos
  let query = 'SELECT * FROM polos'
  const params: (string | number | boolean | null | undefined)[] = []

  if (id) {
    query += ' WHERE id = $1'
    params.push(id)
  }

  query += ' ORDER BY nome'

  const result = await pool.query(query, params)

  return NextResponse.json(result.rows)
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const { nome, codigo, descricao } = await request.json()

    if (!nome) {
      return NextResponse.json(
        { mensagem: 'Campo obrigatório: nome' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO polos (nome, codigo, descricao)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, codigo || null, descricao || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as any).code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar polo:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const { id, nome, codigo, descricao } = await request.json()
    if (!id || !nome) {
      return NextResponse.json({ mensagem: 'Campos obrigatórios: id, nome' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE polos SET nome = $1, codigo = $2, descricao = $3 WHERE id = $4 RETURNING *`,
      [nome, codigo || null, descricao || null, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Polo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if ((error as any).code === '23505') {
      return NextResponse.json({ mensagem: 'Código já cadastrado' }, { status: 400 })
    }
    console.error('Erro ao atualizar polo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    // Verificar se há escolas vinculadas
    const escolasCheck = await pool.query(
      'SELECT COUNT(*) as total FROM escolas WHERE polo_id = $1',
      [id]
    )
    if (parseInt(escolasCheck.rows[0].total) > 0) {
      return NextResponse.json(
        { mensagem: `Não é possível excluir: ${escolasCheck.rows[0].total} escola(s) vinculada(s) a este polo` },
        { status: 409 }
      )
    }

    const result = await pool.query('DELETE FROM polos WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Polo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Polo excluído com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao excluir polo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
