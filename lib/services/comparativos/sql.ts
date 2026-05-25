/**
 * Fragmentos SQL compartilhados entre as queries de comparativos.
 *
 * Centraliza médias por disciplina, contagens de alunos, JOINs base e
 * a lógica de divisor por série (anos iniciais vs finais).
 *
 * @module services/comparativos/sql
 */

/** SQL para extrair número da série */
export const NUMERO_SERIE_SQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

/** Condição base: presença P ou F (case-insensitive) */
export const PRESENCA_BASE = `(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`

/**
 * SQL: média geral com divisor fixo por série (AVG agregado).
 * Anos iniciais (2,3,5): LP + MAT + PROD / 3
 * Anos finais (6-9): LP + CH + MAT + CN / 4
 */
export function getMediaGeralAgregadaSQL(): string {
  return `AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN ${NUMERO_SERIE_SQL} IN ('2', '3', '5') THEN
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) / 3.0
            ELSE
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) / 4.0
          END
        ELSE NULL END)`
}

/**
 * SQL: média geral por aluno (com ROUND e divisor dinâmico baseado em notas presentes).
 * Usado na query de melhores alunos.
 */
export function getMediaGeralAlunoSQL(): string {
  return `CASE
              WHEN ${NUMERO_SERIE_SQL} IN ('2', '3', '5') THEN
                ROUND(
                  (
                    COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
              ELSE
                ROUND(
                  (
                    COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
            END`
}

/**
 * SQL: colunas de médias individuais por disciplina (presença P).
 * Compartilhado entre todas as queries de comparativos.
 */
export function getMediasDisciplinasSQL(): string {
  return `AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END) as media_producao,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_lp IS NOT NULL) THEN CAST(rc.total_acertos_lp AS INTEGER) ELSE NULL END) as media_acertos_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_ch IS NOT NULL) THEN CAST(rc.total_acertos_ch AS INTEGER) ELSE NULL END) as media_acertos_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_mat IS NOT NULL) THEN CAST(rc.total_acertos_mat AS INTEGER) ELSE NULL END) as media_acertos_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_cn IS NOT NULL) THEN CAST(rc.total_acertos_cn AS INTEGER) ELSE NULL END) as media_acertos_cn`
}

/**
 * SQL: contagem de alunos (total e presentes).
 * Compartilhado entre todas as queries de comparativos.
 */
export function getContagemAlunosSQL(): string {
  return `COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes`
}

/**
 * SQL: FROM + JOINs padrão para queries de comparativos.
 */
export function getFromJoinsSQL(): string {
  return `FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      INNER JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id`
}
