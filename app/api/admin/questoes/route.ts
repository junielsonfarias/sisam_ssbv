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

    const result = await pool.query(
      `SELECT q.*, 
       COALESCE(
         json_agg(
           json_build_object('serie', g.serie, 'gabarito', g.gabarito)
         ) FILTER (WHERE g.id IS NOT NULL),
         '[]'::json
       ) as gabaritos_por_serie
       FROM questoes q
       LEFT JOIN questoes_gabaritos g ON q.id = g.questao_id
       GROUP BY q.id
       ORDER BY q.ano_letivo DESC NULLS LAST, q.criado_em DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, ano_letivo, tipo, gabaritos_por_serie } = await request.json()

    // Normalizar valores vazios para null
    const normalizeValue = (value: any) => {
      if (value === '' || value === undefined) return null
      return value
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, ano_letivo, tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          normalizeValue(codigo),
          normalizeValue(descricao),
          normalizeValue(disciplina),
          normalizeValue(area_conhecimento),
          normalizeValue(dificuldade),
          normalizeValue(gabarito),
          normalizeValue(ano_letivo),
          normalizeValue(tipo) || 'objetiva',
        ]
      )

      const questaoId = result.rows[0].id

      // Inserir gabaritos por série se fornecidos
      if (gabaritos_por_serie && Array.isArray(gabaritos_por_serie)) {
        for (const gab of gabaritos_por_serie) {
          if (gab.serie && gab.gabarito) {
            await client.query(
              `INSERT INTO questoes_gabaritos (questao_id, serie, gabarito)
               VALUES ($1, $2, $3)
               ON CONFLICT (questao_id, serie) 
               DO UPDATE SET gabarito = $3, atualizado_em = CURRENT_TIMESTAMP`,
              [questaoId, gab.serie, gab.gabarito]
            )
          }
        }
      }

      await client.query('COMMIT')

      // Buscar questão completa com gabaritos
      const questaoCompleta = await client.query(
        `SELECT q.*, 
         COALESCE(
           json_agg(
             json_build_object('serie', g.serie, 'gabarito', g.gabarito)
           ) FILTER (WHERE g.id IS NOT NULL),
           '[]'::json
         ) as gabaritos_por_serie
         FROM questoes q
         LEFT JOIN questoes_gabaritos g ON q.id = g.questao_id
         WHERE q.id = $1
         GROUP BY q.id`,
        [questaoId]
      )

      return NextResponse.json(questaoCompleta.rows[0], { status: 201 })
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar questão:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, ano_letivo, tipo, gabaritos_por_serie } = body

    if (!id) {
      return NextResponse.json(
        { mensagem: 'ID da questão é obrigatório' },
        { status: 400 }
      )
    }

    // Normalizar valores vazios para null
    const normalizeValue = (value: any) => {
      if (value === '' || value === undefined) return null
      return value
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `UPDATE questoes 
         SET codigo = $1, descricao = $2, disciplina = $3, area_conhecimento = $4, dificuldade = $5, gabarito = $6, ano_letivo = $7, tipo = $8
         WHERE id = $9
         RETURNING *`,
        [
          normalizeValue(codigo),
          normalizeValue(descricao),
          normalizeValue(disciplina),
          normalizeValue(area_conhecimento),
          normalizeValue(dificuldade),
          normalizeValue(gabarito),
          normalizeValue(ano_letivo),
          normalizeValue(tipo) || 'objetiva',
          id,
        ]
      )

      if (result.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { mensagem: 'Questão não encontrada' },
          { status: 404 }
        )
      }

      // Remover gabaritos antigos e inserir novos
      await client.query('DELETE FROM questoes_gabaritos WHERE questao_id = $1', [id])

      // Inserir gabaritos por série se fornecidos
      if (gabaritos_por_serie && Array.isArray(gabaritos_por_serie)) {
        for (const gab of gabaritos_por_serie) {
          if (gab.serie && gab.gabarito) {
            await client.query(
              `INSERT INTO questoes_gabaritos (questao_id, serie, gabarito)
               VALUES ($1, $2, $3)`,
              [id, gab.serie, gab.gabarito]
            )
          }
        }
      }

      await client.query('COMMIT')

      // Buscar questão completa com gabaritos
      const questaoCompleta = await client.query(
        `SELECT q.*, 
         COALESCE(
           json_agg(
             json_build_object('serie', g.serie, 'gabarito', g.gabarito)
           ) FILTER (WHERE g.id IS NOT NULL),
           '[]'::json
         ) as gabaritos_por_serie
         FROM questoes q
         LEFT JOIN questoes_gabaritos g ON q.id = g.questao_id
         WHERE q.id = $1
         GROUP BY q.id`,
        [id]
      )

      return NextResponse.json(questaoCompleta.rows[0])
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro completo ao atualizar questão:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    })
    
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    
    if (error.code === '22P02') {
      return NextResponse.json(
        { mensagem: 'ID inválido. Verifique se o ID está correto.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        mensagem: error.message || 'Erro interno do servidor', 
        detalhes: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { mensagem: 'ID da questão é obrigatório' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM questoes WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Questão não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mensagem: 'Questão excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir questão:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

