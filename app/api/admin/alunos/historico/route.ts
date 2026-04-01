import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { DatabaseError } from '@/lib/validation'
import {
  parseSearchParams, createWhereBuilder, addRawCondition, addCondition,
  addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('AlunoHistorico')

export const dynamic = 'force-dynamic';
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { aluno_id, aluno_nome, aluno_codigo } = parseSearchParams(searchParams, ['aluno_id', 'aluno_nome', 'aluno_codigo'])

    if (!aluno_id && !aluno_nome && !aluno_codigo) {
      return NextResponse.json(
        { mensagem: 'É necessário informar aluno_id, aluno_nome ou aluno_codigo' },
        { status: 400 }
      )
    }

    const where = createWhereBuilder()
    addRawCondition(where, 'e.ativo = true')
    addAccessControl(where, usuario, { escolaIdField: 'e.id', poloIdField: 'e.polo_id' })

    if (aluno_id) {
      addCondition(where, 'a.id', aluno_id)
    } else if (aluno_nome) {
      addRawCondition(where, `TRIM(a.nome) ILIKE TRIM($${where.paramIndex})`, [aluno_nome])
    } else if (aluno_codigo) {
      addCondition(where, 'a.codigo', aluno_codigo)
    }

    const result = await pool.query(
      `SELECT
        a.id, a.codigo, a.nome, a.escola_id, a.turma_id, a.serie, a.ano_letivo,
        a.ativo, a.criado_em, a.atualizado_em,
        e.nome as escola_nome, e.polo_id, p.nome as polo_nome,
        t.codigo as turma_codigo, t.nome as turma_nome, t.serie as turma_serie, t.ano_letivo as turma_ano_letivo,
        rc.presenca as resultado_presenca,
        rc.total_acertos_lp, rc.total_acertos_ch, rc.total_acertos_mat, rc.total_acertos_cn,
        rc.nota_lp, rc.nota_ch, rc.nota_mat, rc.nota_cn, rc.nota_producao, rc.nivel_aprendizagem,
        CASE
          WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) /
              NULLIF(CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END + CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END + CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
          ELSE
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) /
              NULLIF(CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END + CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END + CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END + CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
        END as media_aluno,
        rc.criado_em as resultado_criado_em, rc.atualizado_em as resultado_atualizado_em
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id AND a.ano_letivo = rc.ano_letivo
      WHERE ${buildConditionsString(where)}
      ORDER BY a.ano_letivo DESC, a.serie, a.criado_em DESC`,
      where.params
    )

    // Agrupar por aluno (caso haja múltiplos registros do mesmo aluno)
    const alunosAgrupados = new Map()
    
    result.rows.forEach((row: any) => {
      const key = row.nome.toUpperCase().trim()
      if (!alunosAgrupados.has(key)) {
        alunosAgrupados.set(key, {
          nome: row.nome,
          codigo: row.codigo,
          registros: []
        })
      }
      alunosAgrupados.get(key).registros.push(row)
    })

    // Converter para array
    const historico = Array.from(alunosAgrupados.values())

    return NextResponse.json(historico)
  } catch (error: unknown) {
    log.error('Erro ao buscar histórico do aluno', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
