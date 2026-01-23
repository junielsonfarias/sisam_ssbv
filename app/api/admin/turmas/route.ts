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
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
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
