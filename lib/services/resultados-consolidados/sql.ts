/**
 * Blocos SQL (SELECT principal, COUNT e estatísticas) das queries de
 * resultados consolidados. Mantidos idênticos ao código original da rota.
 *
 * @module services/resultados-consolidados/sql
 */

/**
 * SELECT principal de resultados consolidados (até o WHERE 1=1, sem filtros).
 * Media calculada dinamicamente com divisor fixo por série.
 */
export const SELECT_RESULTADOS = `
    SELECT
      rc.id,
      rc.aluno_id,
      rc.escola_id,
      rc.turma_id,
      rc.ano_letivo,
      rc.serie,
      rc.presenca,
      rc.total_acertos_lp,
      rc.total_acertos_ch,
      rc.total_acertos_mat,
      rc.total_acertos_cn,
      rc.nota_lp,
      rc.nota_ch,
      rc.nota_mat,
      rc.nota_cn,
      rc.nota_producao,
      rc.nivel_aprendizagem,
      rc.nivel_aprendizagem_id,
      rc.tipo_avaliacao,
      rc.total_questoes_esperadas,
      rc.item_producao_1,
      rc.item_producao_2,
      rc.item_producao_3,
      rc.item_producao_4,
      rc.item_producao_5,
      rc.item_producao_6,
      rc.item_producao_7,
      rc.item_producao_8,
      rc.nivel_lp,
      rc.nivel_mat,
      rc.nivel_prod,
      rc.nivel_aluno,
      rc.avaliacao_id,
      av.nome as avaliacao_nome,
      av.tipo as avaliacao_tipo,
      a.nome as aluno_nome,
      e.nome as escola_nome,
      e.polo_id,
      p.nome as polo_nome,
      t.codigo as turma_codigo,
      cs.tipo_ensino,
      cs.qtd_questoes_lp,
      cs.qtd_questoes_mat,
      cs.qtd_questoes_ch,
      cs.qtd_questoes_cn,
      -- DEBUG: tipo de calculo usado (para verificar se a logica esta correta)
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN 'anos_iniciais'
        ELSE 'anos_finais'
      END as _debug_tipo_calculo,
      rc.media_aluno as _debug_media_banco,
      -- Media calculada dinamicamente baseada na serie
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
          ROUND(
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
            ) / 3.0,
            2
          )
        ELSE
          ROUND(
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / 4.0,
            2
          )
      END as media_aluno
    FROM resultados_consolidados rc
    INNER JOIN alunos a ON rc.aluno_id = a.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN polos p ON e.polo_id = p.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    LEFT JOIN configuracao_series cs ON COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = cs.serie::text
    LEFT JOIN avaliacoes av ON rc.avaliacao_id = av.id
    WHERE 1=1
  `

/**
 * Query de contagem total (mesmos JOINs/filtros, sem ORDER/LIMIT).
 */
export const SELECT_COUNT = `
    SELECT COUNT(*) as total
    FROM resultados_consolidados rc
    INNER JOIN alunos a ON rc.aluno_id = a.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    LEFT JOIN configuracao_series cs ON COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = cs.serie::text
    WHERE 1=1
  `

/**
 * Query de estatísticas gerais (sem paginação) com divisor fixo por série.
 */
export const SELECT_ESTATISTICAS = `
    SELECT
      COUNT(*) as total_alunos,
      COUNT(CASE WHEN UPPER(rc.presenca) = 'P' THEN 1 END) as total_presentes,
      COUNT(CASE WHEN UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE') THEN 1 END) as total_faltas,
      ROUND(AVG(CASE
        WHEN UPPER(rc.presenca) = 'P' THEN
          CASE
            WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ELSE NULL
      END), 2) as media_geral,
      ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' THEN COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' THEN COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' THEN COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) ELSE NULL END), 2) as media_producao,
      ROUND(AVG(CASE
        WHEN UPPER(rc.presenca) = 'P'
        AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
        THEN (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
        ELSE NULL
      END), 2) as media_anos_iniciais,
      COUNT(CASE
        WHEN UPPER(rc.presenca) = 'P'
        AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
        THEN 1
        ELSE NULL
      END) as total_anos_iniciais,
      ROUND(AVG(CASE
        WHEN UPPER(rc.presenca) = 'P'
        AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')
        THEN (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
        ELSE NULL
      END), 2) as media_anos_finais,
      COUNT(CASE
        WHEN UPPER(rc.presenca) = 'P'
        AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')
        THEN 1
        ELSE NULL
      END) as total_anos_finais
    FROM resultados_consolidados rc
    INNER JOIN alunos a ON rc.aluno_id = a.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    LEFT JOIN configuracao_series cs ON COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = cs.serie::text
    WHERE 1=1
  `
