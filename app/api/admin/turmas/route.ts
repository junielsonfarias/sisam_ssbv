import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

// POST - Criar nova turma
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { codigo, nome, escola_id, serie, ano_letivo, capacidade_maxima, multiserie, multietapa } = body

    if (!codigo || !escola_id || !serie || !ano_letivo) {
      return NextResponse.json({ mensagem: 'Campos obrigatórios: codigo, escola_id, serie, ano_letivo' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, capacidade_maxima, multiserie, multietapa, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [
        codigo.trim(),
        nome?.trim() || null,
        escola_id,
        serie.trim(),
        ano_letivo.trim(),
        capacidade_maxima || 35,
        multiserie || false,
        multietapa || false
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Já existe uma turma com este código nesta escola e ano letivo' }, { status: 409 })
    }
    console.error('Erro ao criar turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar turma
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, codigo, nome, escola_id, serie, ano_letivo, ativo, capacidade_maxima, multiserie, multietapa } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID da turma é obrigatório' }, { status: 400 })
    }

    // Montar SET dinâmico — só atualiza campos enviados (permite limpar nome com null/vazio)
    const sets: string[] = []
    const params: (string | boolean | number | null)[] = [id]
    let paramIndex = 2

    if (codigo !== undefined) { sets.push(`codigo = $${paramIndex}`); params.push(codigo?.trim()); paramIndex++ }
    if (nome !== undefined) { sets.push(`nome = $${paramIndex}`); params.push(nome?.trim() || null); paramIndex++ }
    if (escola_id !== undefined) { sets.push(`escola_id = $${paramIndex}`); params.push(escola_id); paramIndex++ }
    if (serie !== undefined) { sets.push(`serie = $${paramIndex}`); params.push(serie?.trim()); paramIndex++ }
    if (ano_letivo !== undefined) { sets.push(`ano_letivo = $${paramIndex}`); params.push(ano_letivo?.trim()); paramIndex++ }
    if (ativo !== undefined) { sets.push(`ativo = $${paramIndex}`); params.push(ativo); paramIndex++ }
    if (capacidade_maxima !== undefined) { sets.push(`capacidade_maxima = $${paramIndex}`); params.push(capacidade_maxima); paramIndex++ }
    if (multiserie !== undefined) { sets.push(`multiserie = $${paramIndex}`); params.push(multiserie); paramIndex++ }
    if (multietapa !== undefined) { sets.push(`multietapa = $${paramIndex}`); params.push(multietapa); paramIndex++ }

    if (sets.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    sets.push('atualizado_em = CURRENT_TIMESTAMP')

    const result = await pool.query(
      `UPDATE turmas SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Já existe uma turma com este código nesta escola e ano letivo' }, { status: 409 })
    }
    console.error('Erro ao atualizar turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir turma (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'ID da turma é obrigatório' }, { status: 400 })
    }

    // Verificar se tem alunos vinculados
    const alunosCheck = await pool.query(
      'SELECT COUNT(*) as total FROM alunos WHERE turma_id = $1 AND ativo = true',
      [id]
    )
    const totalAlunos = parseInt(alunosCheck.rows[0].total)
    if (totalAlunos > 0) {
      return NextResponse.json(
        { mensagem: `Não é possível excluir: turma possui ${totalAlunos} aluno(s) vinculado(s)` },
        { status: 409 }
      )
    }

    const result = await pool.query(
      'UPDATE turmas SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Turma excluída com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

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
    const mode = searchParams.get('mode')
    const serie = searchParams.get('serie')
    const escolaId = searchParams.get('escola_id')
    const escolasIds = searchParams.get('escolas_ids')?.split(',').filter(Boolean) || []
    const anoLetivo = searchParams.get('ano_letivo')
    const busca = searchParams.get('busca')

    // Modo listagem simples: retorna turmas com contagem de alunos (sem precisar de resultados)
    if (mode === 'listagem') {
      const whereConditions: string[] = ['t.ativo = true']
      const params: string[] = []
      let paramIndex = 1

      if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
        whereConditions.push(`e.polo_id = $${paramIndex}`)
        params.push(usuario.polo_id as string)
        paramIndex++
      } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        whereConditions.push(`e.id = $${paramIndex}`)
        params.push(usuario.escola_id as string)
        paramIndex++
      }

      if (anoLetivo && anoLetivo.trim() !== '') {
        whereConditions.push(`t.ano_letivo = $${paramIndex}`)
        params.push(anoLetivo.trim())
        paramIndex++
      }

      if (escolaId && escolaId.trim() !== '') {
        whereConditions.push(`t.escola_id = $${paramIndex}`)
        params.push(escolaId.trim())
        paramIndex++
      }

      if (serie && serie.trim() !== '') {
        whereConditions.push(`t.serie = $${paramIndex}`)
        params.push(serie.trim())
        paramIndex++
      }

      if (busca && busca.trim() !== '') {
        whereConditions.push(`(t.codigo ILIKE $${paramIndex} OR t.nome ILIKE $${paramIndex + 1} OR e.nome ILIKE $${paramIndex + 2})`)
        const buscaParam = `%${busca.trim()}%`
        params.push(buscaParam, buscaParam, buscaParam)
        paramIndex += 3
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

      const query = `
        SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
               COALESCE(t.capacidade_maxima, 35) as capacidade_maxima,
               COALESCE(t.multiserie, false) as multiserie,
               COALESCE(t.multietapa, false) as multietapa,
               e.nome as escola_nome, p.nome as polo_nome,
               COUNT(a.id) FILTER (WHERE a.ativo = true) as total_alunos
        FROM turmas t
        INNER JOIN escolas e ON t.escola_id = e.id
        LEFT JOIN polos p ON e.polo_id = p.id
        LEFT JOIN alunos a ON a.turma_id = t.id
        ${whereClause}
        GROUP BY t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
                 t.capacidade_maxima, t.multiserie, t.multietapa, e.nome, p.nome
        ORDER BY t.ano_letivo DESC, e.nome, t.serie, t.codigo
      `

      const result = await pool.query(query, params)
      return NextResponse.json(result.rows.map(row => ({
        ...row,
        total_alunos: parseInt(row.total_alunos) || 0,
        capacidade_maxima: parseInt(row.capacidade_maxima) || 35,
        multiserie: row.multiserie === true,
        multietapa: row.multietapa === true,
      })))
    }

    // Construir condições WHERE
    const whereConditions: string[] = ['t.ativo = true']
    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`e.id = $${paramIndex}`)
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolasIds.length > 0) {
      const placeholders = escolasIds.map((_, i) => `$${paramIndex + i}`).join(',')
      whereConditions.push(`e.id IN (${placeholders})`)
      params.push(...escolasIds)
      paramIndex += escolasIds.length
    }

    if (serie && serie.trim() !== '') {
      whereConditions.push(`rc.serie = $${paramIndex}`)
      params.push(serie.trim())
      paramIndex++
    }

    if (anoLetivo && anoLetivo.trim() !== '') {
      whereConditions.push(`t.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo.trim())
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Detectar se é filtro de anos iniciais (2, 3, 5) ou finais (6, 7, 8, 9)
    const serieNumero = serie ? serie.replace(/[^0-9]/g, '') : ''
    const isAnosIniciais = ['2', '3', '5'].includes(serieNumero)
    const isAnosFinais = ['6', '7', '8', '9'].includes(serieNumero)

    // Query com cálculo de médias correto
    // Anos iniciais (2, 3, 5): média = (LP + MAT + PROD) / 3 (divisor fixo)
    // Anos finais (6, 7, 8, 9): média = (LP + CH + MAT + CN) / 4 (divisor fixo)
    // CORREÇÃO: Usar t.serie (série da turma) em vez de rc.serie para evitar duplicação de linhas
    // PADRONIZADO: Usar divisor fixo para consistência com dashboard-dados
    const query = `
      SELECT
        t.id,
        t.codigo,
        t.nome,
        t.serie,
        t.escola_id,
        e.nome as escola_nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_alunos,
        -- Média com DIVISOR FIXO: anos iniciais LP+MAT+PROD/3, anos finais LP+CH+MAT+CN/4
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD (divisor fixo 3)
              WHEN REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                ) / 3.0
              -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN (divisor fixo 4)
              ELSE
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                ) / 4.0
            END
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) ELSE NULL END), 2) as media_prod,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) ELSE NULL END), 2) as media_cn,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      ${whereClause}
      GROUP BY t.id, t.codigo, t.nome, t.serie, t.escola_id, e.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
      ORDER BY t.serie, t.codigo, e.nome
    `

    const result = await pool.query(query, params)

    // Converter campos numéricos para garantir consistência
    // Quando filtro de série está ativo, ocultar disciplinas não aplicáveis
    // Também verificar a série da própria turma para casos sem filtro
    const turmas = result.rows.map(row => {
      const turmaSerie = row.serie || ''
      const turmaSerieNumero = turmaSerie.replace(/[^0-9]/g, '')
      const turmaIsAnosIniciais = ['2', '3', '5'].includes(turmaSerieNumero)
      const turmaIsAnosFinais = ['6', '7', '8', '9'].includes(turmaSerieNumero)

      return {
        id: row.id,
        codigo: row.codigo,
        nome: row.nome,
        serie: row.serie,
        escola_id: row.escola_id,
        escola_nome: row.escola_nome,
        total_alunos: parseInt(row.total_alunos) || 0,
        media_geral: parseFloat(row.media_geral) || null,
        media_lp: parseFloat(row.media_lp) || null,
        media_mat: parseFloat(row.media_mat) || null,
        // PROD: mostrar apenas para anos iniciais (2, 3, 5)
        media_prod: turmaIsAnosFinais ? null : parseFloat(row.media_prod) || null,
        // CH/CN: mostrar apenas para anos finais (6, 7, 8, 9)
        media_ch: turmaIsAnosIniciais ? null : parseFloat(row.media_ch) || null,
        media_cn: turmaIsAnosIniciais ? null : parseFloat(row.media_cn) || null,
        presentes: parseInt(row.presentes) || 0,
        faltantes: parseInt(row.faltantes) || 0
      }
    })

    return NextResponse.json(turmas)
  } catch (error: any) {
    console.error('Erro ao buscar turmas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
