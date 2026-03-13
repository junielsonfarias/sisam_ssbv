import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { configuracaoNotasEscolaSchema, configuracaoNotasEscolaBaseSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const atualizarConfigSchema = configuracaoNotasEscolaBaseSchema.extend({
  id: z.string().uuid('ID inválido'),
}).refine(data => {
  const soma = Math.round((data.peso_avaliacao + data.peso_recuperacao) * 100) / 100
  return soma === 1
}, { message: 'A soma dos pesos deve ser igual a 1.0', path: ['peso_avaliacao'] })
.refine(data => {
  return data.media_recuperacao <= data.media_aprovacao
}, { message: 'Média de recuperação deve ser menor ou igual à média de aprovação', path: ['media_recuperacao'] })

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo')

    const whereConditions: string[] = []
    const params: string[] = []
    let paramIndex = 1

    // Restrição de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`c.escola_id = $${paramIndex}`)
      params.push(usuario.escola_id as string)
      paramIndex++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id as string)
      paramIndex++
    }

    if (escolaId) {
      whereConditions.push(`c.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (anoLetivo) {
      whereConditions.push(`c.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT c.*, e.nome as escola_nome
       FROM configuracao_notas_escola c
       INNER JOIN escolas e ON c.escola_id = e.id
       ${whereClause}
       ORDER BY e.nome, c.ano_letivo DESC`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar configurações de notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, configuracaoNotasEscolaSchema)
    if (!validacao.success) return validacao.response

    const {
      escola_id, ano_letivo, tipo_periodo, nota_maxima,
      media_aprovacao, media_recuperacao, peso_avaliacao,
      peso_recuperacao, permite_recuperacao
    } = validacao.data

    // Usuário escola só pode configurar sua própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO configuracao_notas_escola
       (escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe uma configuração para esta escola neste ano letivo' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar configuração de notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, atualizarConfigSchema)
    if (!validacao.success) return validacao.response

    const {
      id, escola_id, ano_letivo, tipo_periodo, nota_maxima,
      media_aprovacao, media_recuperacao, peso_avaliacao,
      peso_recuperacao, permite_recuperacao
    } = validacao.data

    // Usuário escola só pode configurar sua própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `UPDATE configuracao_notas_escola
       SET escola_id = $1, ano_letivo = $2, tipo_periodo = $3, nota_maxima = $4,
           media_aprovacao = $5, media_recuperacao = $6, peso_avaliacao = $7,
           peso_recuperacao = $8, permite_recuperacao = $9
       WHERE id = $10
       RETURNING *`,
      [escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Configuração não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe uma configuração para esta escola neste ano letivo' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar configuração de notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const validacaoId = validateId(searchParams.get('id'))
    if (!validacaoId.success) return validacaoId.response
    const id = validacaoId.data

    // Verificar se há notas lançadas com esta configuração
    const configResult = await pool.query(
      'SELECT escola_id, ano_letivo FROM configuracao_notas_escola WHERE id = $1',
      [id]
    )

    if (configResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Configuração não encontrada' }, { status: 404 })
    }

    const { escola_id, ano_letivo } = configResult.rows[0]
    const notasVinculadas = await pool.query(
      'SELECT COUNT(*) as total FROM notas_escolares WHERE escola_id = $1 AND ano_letivo = $2',
      [escola_id, ano_letivo]
    )

    if (parseInt(notasVinculadas.rows[0].total) > 0) {
      return NextResponse.json(
        { mensagem: 'Não é possível excluir: existem notas lançadas para esta escola/ano' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM configuracao_notas_escola WHERE id = $1', [id])
    return NextResponse.json({ mensagem: 'Configuração excluída com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir configuração de notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
