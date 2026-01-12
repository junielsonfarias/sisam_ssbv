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
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo')
    const comEstatisticas = searchParams.get('com_estatisticas') === 'true'

    // Se não precisa de estatísticas, usar query simples
    if (!comEstatisticas) {
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
    }

    // Query com estatísticas (médias por disciplina)
    const whereConditions: string[] = ['e.ativo = true']
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
    if (poloId) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(poloId)
      paramIndex++
    }

    if (escolaId) {
      whereConditions.push(`e.id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (serie && serie.trim() !== '') {
      whereConditions.push(`rc.serie = $${paramIndex}`)
      params.push(serie.trim())
      paramIndex++
    }

    if (anoLetivo && anoLetivo.trim() !== '') {
      whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo.trim())
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Detectar se é filtro de anos iniciais (2, 3, 5) ou finais (6, 7, 8, 9)
    const serieNumero = serie ? serie.replace(/[^0-9]/g, '') : ''
    const isAnosIniciais = ['2', '3', '5'].includes(serieNumero)
    const isAnosFinais = ['6', '7', '8', '9'].includes(serieNumero)

    // Query com cálculo de médias correto
    // Anos iniciais (2, 3, 5): média = (LP + MAT + PROD) / 3
    // Anos finais (6, 7, 8, 9): média = (LP + CH + MAT + CN) / 4
    const query = `
      SELECT
        e.id,
        e.nome,
        e.codigo,
        p.nome as polo_nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT t.id) as total_turmas,
        -- Média CORRIGIDA: anos iniciais inclui PROD, anos finais usa LP+CH+MAT+CN
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
              -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN
              ELSE
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
            END
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON t.escola_id = e.id AND t.ativo = true
      LEFT JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      ${whereClause}
      GROUP BY e.id, e.nome, e.codigo, p.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
      ORDER BY media_geral DESC NULLS LAST, e.nome
    `

    const result = await pool.query(query, params)

    // Converter campos numéricos para garantir consistência
    // Quando filtro de série está ativo, ocultar disciplinas não aplicáveis
    const escolas = result.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      codigo: row.codigo,
      polo_nome: row.polo_nome,
      total_alunos: parseInt(row.total_alunos) || 0,
      total_turmas: parseInt(row.total_turmas) || 0,
      media_geral: parseFloat(row.media_geral) || null,
      media_lp: parseFloat(row.media_lp) || null,
      media_mat: parseFloat(row.media_mat) || null,
      // PROD: mostrar apenas para anos iniciais (2, 3, 5)
      media_prod: isAnosFinais ? null : parseFloat(row.media_prod) || null,
      // CH/CN: mostrar apenas para anos finais (6, 7, 8, 9)
      media_ch: isAnosIniciais ? null : parseFloat(row.media_ch) || null,
      media_cn: isAnosIniciais ? null : parseFloat(row.media_cn) || null,
      presentes: parseInt(row.presentes) || 0,
      faltantes: parseInt(row.faltantes) || 0
    }))

    return NextResponse.json(escolas)
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

