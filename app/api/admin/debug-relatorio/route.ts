/**
 * API de Debug para verificar dados disponíveis para relatórios
 * GET /api/admin/debug-relatorio?escola_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const escolaId = searchParams.get('escola_id') || 'e0690bbd-dc70-4ded-b1b3-9b310f3c4c5f';

  try {
    const resultado: Record<string, any> = {};

    // 1. Verificar escola
    const escola = await pool.query(
      'SELECT id, nome, polo_id FROM escolas WHERE id = $1',
      [escolaId]
    );
    resultado.escola = escola.rows[0] || null;

    // 2. Anos letivos disponíveis
    const anosDisponiveis = await pool.query(`
      SELECT DISTINCT ano_letivo, COUNT(*) as total
      FROM resultados_consolidados
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `, [escolaId]);
    resultado.anos_disponiveis = anosDisponiveis.rows;

    // 3. Totais por ano
    const totaisPorAno = await pool.query(`
      SELECT
        ano_letivo,
        COUNT(DISTINCT aluno_id) as alunos,
        COUNT(DISTINCT turma_id) as turmas,
        -- Média geral com divisor fixo: Anos Iniciais (2,3,5) = 3 disciplinas, Anos Finais (6,7,8,9) = 4 disciplinas
        ROUND(AVG(
          CASE
            WHEN REGEXP_REPLACE(serie, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(nota_lp, 0) + COALESCE(nota_mat, 0) + COALESCE(nota_producao, 0)) / 3.0
            ELSE
              (COALESCE(nota_lp, 0) + COALESCE(nota_ch, 0) + COALESCE(nota_mat, 0) + COALESCE(nota_cn, 0)) / 4.0
          END
        )::numeric, 2) as media_geral,
        COUNT(*) as registros
      FROM resultados_consolidados
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `, [escolaId]);
    resultado.totais_por_ano = totaisPorAno.rows;

    // 4. Turmas da escola
    const turmas = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.serie,
             COUNT(DISTINCT a.id) as alunos_matriculados
      FROM turmas t
      LEFT JOIN alunos a ON a.turma_id = t.id
      WHERE t.escola_id = $1
      GROUP BY t.id, t.codigo, t.nome, t.serie
      ORDER BY t.serie
    `, [escolaId]);
    resultado.turmas = turmas.rows;

    // 5. Último ano com dados
    const ultimoAno = await pool.query(`
      SELECT MAX(ano_letivo) as ultimo_ano
      FROM resultados_consolidados
      WHERE escola_id = $1
    `, [escolaId]);
    resultado.ultimo_ano_com_dados = ultimoAno.rows[0]?.ultimo_ano || null;

    // 6. Se houver dados, mostrar amostra do último ano
    if (resultado.ultimo_ano_com_dados) {
      const amostra = await pool.query(`
        SELECT
          rc.serie,
          COUNT(DISTINCT rc.aluno_id) as alunos,
          ROUND(AVG(rc.nota_lp)::numeric, 2) as media_lp,
          ROUND(AVG(rc.nota_mat)::numeric, 2) as media_mat,
          ROUND(AVG(rc.nota_ch)::numeric, 2) as media_ch,
          ROUND(AVG(rc.nota_cn)::numeric, 2) as media_cn,
          -- Média geral com divisor fixo
          ROUND(AVG(
            CASE
              WHEN REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0
              ELSE
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_ch, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_cn, 0)) / 4.0
            END
          )::numeric, 2) as media_geral
        FROM resultados_consolidados rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        GROUP BY rc.serie
        ORDER BY rc.serie
      `, [escolaId, resultado.ultimo_ano_com_dados]);
      resultado.dados_ultimo_ano = amostra.rows;
    }

    // 7. Verificar resultados_provas
    const resultadosProvas = await pool.query(`
      SELECT ano_letivo, COUNT(*) as total
      FROM resultados_provas
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
      LIMIT 5
    `, [escolaId]);
    resultado.resultados_provas = resultadosProvas.rows;

    // 8. Recomendação
    if (!resultado.ultimo_ano_com_dados) {
      resultado.recomendacao = 'Nenhum dado encontrado em resultados_consolidados para esta escola. Verifique se os dados foram importados corretamente.';
    } else if (resultado.ultimo_ano_com_dados !== '2026') {
      resultado.recomendacao = `Use ano_letivo=${resultado.ultimo_ano_com_dados} ao gerar o relatório, pois é o último ano com dados.`;
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (error: any) {
    console.error('Erro no debug:', error);
    return NextResponse.json({
      erro: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
