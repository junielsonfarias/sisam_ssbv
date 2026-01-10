import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/debug-aluno?nome=julia
 * Retorna dados de debug para um aluno específico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nome = searchParams.get('nome') || 'julia'

    // Buscar aluno pelo nome
    const alunoResult = await pool.query(`
      SELECT
        a.id, a.nome, a.codigo, a.serie, a.ano_letivo,
        e.nome as escola_nome,
        t.codigo as turma_codigo
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE UPPER(a.nome) LIKE UPPER($1)
      LIMIT 5
    `, [`%${nome}%`])

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ erro: 'Aluno não encontrado', nome })
    }

    const aluno = alunoResult.rows[0]

    // Buscar resultados consolidados
    const consolidadoResult = await pool.query(`
      SELECT
        id, aluno_id, serie, presenca,
        nota_lp, nota_mat, nota_producao,
        item_producao_1, item_producao_2, item_producao_3, item_producao_4,
        item_producao_5, item_producao_6, item_producao_7, item_producao_8,
        nivel_aprendizagem, media_aluno
      FROM resultados_consolidados
      WHERE aluno_id = $1
      ORDER BY atualizado_em DESC
      LIMIT 1
    `, [aluno.id])

    // Buscar configuração da série
    const configResult = await pool.query(`
      SELECT serie, nome_serie, tem_producao_textual, qtd_itens_producao
      FROM configuracao_series
      WHERE serie = REGEXP_REPLACE($1, '[^0-9]', '', 'g')
         OR serie = $1
    `, [aluno.serie])

    return NextResponse.json({
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        serie: aluno.serie,
        escola: aluno.escola_nome,
        turma: aluno.turma_codigo
      },
      resultados_consolidados: consolidadoResult.rows[0] || null,
      configuracao_serie: configResult.rows[0] || null,
      debug: {
        alunos_encontrados: alunoResult.rows.length,
        tem_resultados: consolidadoResult.rows.length > 0,
        tem_config: configResult.rows.length > 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
