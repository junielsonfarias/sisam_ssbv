import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!escolaId) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    const conditions = ['t.escola_id = $1', 't.ano_letivo = $2', 't.ativo = true']
    const params: any[] = [escolaId, anoLetivo]
    let idx = 3

    if (serie) {
      const numSerie = serie.match(/(\d+)/)?.[1] || serie.trim()
      conditions.push(`REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') = $${idx}`)
      params.push(numSerie)
      idx++
    }

    const result = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
              t.capacidade_maxima, t.multiserie, t.multietapa,
              COUNT(a.id) FILTER (WHERE a.ativo = true) as total_alunos
       FROM turmas t
       LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
       WHERE ${conditions.join(' AND ')}
       GROUP BY t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
                t.capacidade_maxima, t.multiserie, t.multietapa
       ORDER BY t.serie, t.codigo`,
      params
    )

    return NextResponse.json(result.rows.map(r => ({
      ...r,
      total_alunos: parseInt(r.total_alunos) || 0
    })))
  } catch (error: any) {
    console.error('Erro ao listar turmas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { codigo, nome, escola_id, serie, ano_letivo } = body

    if (!codigo || !escola_id || !ano_letivo) {
      return NextResponse.json({ mensagem: 'Código, escola e ano letivo são obrigatórios' }, { status: 400 })
    }

    // Escola só pode criar turma na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [codigo, nome || null, escola_id, serie || null, ano_letivo]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Turma com este código já existe para esta escola e ano letivo' }, { status: 400 })
    }
    console.error('Erro ao criar turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
