/**
 * Consultas SQL para relatório de escola
 * @module lib/relatorios/consultas-escola
 *
 * Extraído de consultas-relatorio.ts para melhor organização.
 */

import pool from '@/database/connection';
import {
  DadosRelatorioEscola,
  DadosSegmento,
  DesempenhoDisciplina,
  TurmaRelatorio,
  AnaliseQuestao,
  AnaliseQuestoesSerie,
  ProducaoTextual,
  DistribuicaoNivel,
  FaltasSerie,
  ErroRelatorio,
  CodigoErroRelatorio,
  SerieDisponivel,
  serieTemProducaoTextual,
  serieTemCHCN,
  validarFiltroRelatorio
} from './tipos';
import { calcularProjecoes, calcularDistribuicaoNotas } from './calculos-projecoes';
import { buscarDadosSegmento } from './consultas-segmento';

/**
 * Busca dados completos para relatório de uma escola
 *
 * @param escolaId - UUID da escola
 * @param anoLetivo - Ano letivo no formato 'YYYY'
 * @param serie - Série específica para filtrar (opcional)
 * @returns Dados completos para geração do relatório
 * @throws ErroRelatorio se a escola não for encontrada ou parâmetros inválidos
 *
 * @example
 * ```typescript
 * const dados = await buscarDadosRelatorioEscola(
 *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   '2025',
 *   '5º Ano'
 * );
 * ```
 */
export async function buscarDadosRelatorioEscola(
  escolaId: string,
  anoLetivo: string,
  serie?: string,
  avaliacaoId?: string
): Promise<DadosRelatorioEscola> {
  // Validar parâmetros de entrada
  validarFiltroRelatorio({ id: escolaId, ano_letivo: anoLetivo, serie: serie as SerieDisponivel | undefined });

  const params: string[] = [escolaId, anoLetivo];
  let paramIdx = 3;
  let serieFilter = '';
  if (serie) {
    serieFilter = `AND rc.serie = $${paramIdx}`;
    params.push(serie);
    paramIdx++;
  }
  let avaliacaoFilter = '';
  let avaliacaoFilterRP = '';
  if (avaliacaoId) {
    avaliacaoFilter = `AND rc.avaliacao_id = $${paramIdx}`;
    avaliacaoFilterRP = `AND rp.avaliacao_id = $${paramIdx}`;
    params.push(avaliacaoId);
    paramIdx++;
  }

  // Query 1: Dados da escola
  const escolaQuery = `
    SELECT
      e.id,
      e.nome,
      COALESCE(e.codigo, '') as codigo,
      e.polo_id,
      COALESCE(p.nome, 'Sem Polo') as polo_nome
    FROM escolas e
    LEFT JOIN polos p ON e.polo_id = p.id
    WHERE e.id = $1
  `;

  // Query 2: Estatísticas gerais
  // IMPORTANTE: Usar mesma lógica do dashboard (resultados_consolidados_unificada)
  // Filtrar apenas presentes (P/p) com notas válidas (> 0)
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) as total_avaliacoes,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN 1 END)::decimal /
         NULLIF(COUNT(*), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as total_presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN rc.aluno_id END) as total_ausentes
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter} ${avaliacaoFilter}
  `;

  // Query 3: Desempenho por disciplina
  // CH e CN só são avaliados em 8º e 9º Ano (usando função utilitária)
  // PROD só é avaliado em 2º, 3º e 5º Ano (Anos Iniciais)
  const incluirCHCN = serieTemCHCN(serie);
  const incluirPROD = serieTemProducaoTextual(serie);

  // Query 3: Desempenho por disciplina - usando mesma lógica do dashboard
  const disciplinasQuery = `
    WITH disciplinas AS (
      SELECT
        'LP' as disciplina,
        'Língua Portuguesa' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_lp, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_mat, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}

      ${incluirPROD ? `
      UNION ALL

      SELECT
        'PROD' as disciplina,
        'Produção Textual' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) END) as media,
        0 as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND rc.serie IN ('2º Ano', '3º Ano', '5º Ano')
        ${serieFilter} ${avaliacaoFilter}
      ` : ''}

      ${incluirCHCN ? `
      UNION ALL

      SELECT
        'CH' as disciplina,
        'Ciências Humanas' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_ch, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND rc.serie IN ('8º Ano', '9º Ano')
        ${serieFilter} ${avaliacaoFilter}

      UNION ALL

      SELECT
        'CN' as disciplina,
        'Ciências da Natureza' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_cn, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND rc.serie IN ('8º Ano', '9º Ano')
        ${serieFilter} ${avaliacaoFilter}
      ` : ''}
    )
    SELECT
      disciplina,
      disciplina_nome,
      COALESCE(ROUND(media::numeric, 2), 0) as media,
      COALESCE(acertos_total, 0) as acertos_total,
      COALESCE(total_registros, 0) as total_registros
    FROM disciplinas
    WHERE total_registros > 0
  `;

  // Query 4: Detalhamento por turma - usando mesma lógica do dashboard
  // Inclui PROD para Anos Iniciais e dados de presença/ausência
  const turmasQuery = `
    SELECT
      t.id,
      COALESCE(t.codigo, t.nome) as codigo,
      COALESCE(t.nome, t.codigo) as nome,
      COALESCE(t.serie, '') as serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as total_presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN rc.aluno_id END) as total_ausentes,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as media_lp,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as media_mat,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END)::numeric, 2), 0) as media_ch,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END)::numeric, 2), 0) as media_cn,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) END)::numeric, 2), 0) as media_producao
    FROM turmas t
    LEFT JOIN resultados_consolidados_unificada rc ON t.id = rc.turma_id
      AND rc.ano_letivo = $2
      ${avaliacaoFilter}
    WHERE t.escola_id = $1
      ${serie ? 'AND t.serie = $3' : ''}
    GROUP BY t.id, t.codigo, t.nome, t.serie
    HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) > 0
    ORDER BY t.serie, t.codigo
  `;

  // Query 5: Análise de questões
  // Extrair número da questão do código (ex: Q15 -> 15, LP01 -> 1)
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      q.codigo as questao_codigo,
      CASE
        WHEN q.codigo ~ '^Q[0-9]+' THEN CAST(SUBSTRING(q.codigo FROM 2) AS INTEGER)
        WHEN q.codigo ~ '[0-9]+' THEN CAST(REGEXP_REPLACE(q.codigo, '[^0-9]', '', 'g') AS INTEGER)
        ELSE NULL
      END as numero,
      COALESCE(q.disciplina, '') as disciplina,
      COUNT(rp.id) as total_respostas,
      SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as acertos,
      COALESCE(ROUND(
        (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::decimal /
         NULLIF(COUNT(rp.id), 0) * 100)::numeric, 1
      ), 0) as percentual_acerto
    FROM questoes q
    LEFT JOIN resultados_provas rp ON q.id = rp.questao_id
      AND rp.escola_id = $1
      AND rp.ano_letivo = $2
      ${avaliacaoFilterRP}
    WHERE 1=1
    GROUP BY q.id, q.codigo, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY q.disciplina, numero NULLS LAST, q.codigo
    LIMIT 100
  `;

  // Query 6: Distribuição por níveis de aprendizagem - calculado dinamicamente pela média
  const niveisQuery = `
    WITH niveis_calculados AS (
      SELECT
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 THEN 'Avançado'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 THEN 'Adequado'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 THEN 'Básico'
          ELSE 'Insuficiente'
        END as nivel
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
        AND rc.media_aluno IS NOT NULL
        AND CAST(rc.media_aluno AS DECIMAL) > 0
        ${serieFilter} ${avaliacaoFilter}
    )
    SELECT
      nivel,
      CASE nivel
        WHEN 'Avançado' THEN '#22C55E'
        WHEN 'Adequado' THEN '#3B82F6'
        WHEN 'Básico' THEN '#F59E0B'
        WHEN 'Insuficiente' THEN '#EF4444'
      END as cor,
      COUNT(*) as quantidade
    FROM niveis_calculados
    GROUP BY nivel
    ORDER BY
      CASE nivel
        WHEN 'Avançado' THEN 1
        WHEN 'Adequado' THEN 2
        WHEN 'Básico' THEN 3
        WHEN 'Insuficiente' THEN 4
      END
  `;

  // Query 7: Notas para distribuição - usando VIEW unificada e mesma lógica
  const notasQuery = `
    SELECT CAST(rc.media_aluno AS DECIMAL) as nota
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      AND (rc.presenca = 'P' OR rc.presenca = 'p')
      AND rc.media_aluno IS NOT NULL
      AND CAST(rc.media_aluno AS DECIMAL) > 0
      ${serieFilter} ${avaliacaoFilter}
  `;

  // Query 8: Produção Textual (apenas para Anos Iniciais - usando função utilitária)
  const incluirProducao = serieTemProducaoTextual(serie);

  // Produção textual - apenas nota_producao disponível na VIEW unificada
  const producaoQuery = incluirProducao ? `
    SELECT
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) END)::numeric, 2), 0) as media_producao,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      AND rc.serie IN ('2º Ano', '3º Ano', '5º Ano')
      ${serieFilter} ${avaliacaoFilter}
  ` : null;

  // Query 9: Níveis de aprendizagem por turma
  const niveisTurmasQuery = `
    SELECT
      turma_id,
      nivel,
      COUNT(*) as quantidade
    FROM (
      SELECT
        rc.turma_id,
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 THEN 'Avançado'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 THEN 'Adequado'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 THEN 'Básico'
          ELSE 'Insuficiente'
        END as nivel
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
        AND rc.media_aluno IS NOT NULL
        AND CAST(rc.media_aluno AS DECIMAL) > 0
        ${serieFilter} ${avaliacaoFilter}
    ) as niveis
    GROUP BY turma_id, nivel
    ORDER BY turma_id, nivel
  `;

  // Query 10: Faltas por série
  const faltasSerieQuery = `
    SELECT
      rc.serie,
      COUNT(DISTINCT rc.aluno_id) as total_matriculados,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as total_presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN rc.aluno_id END) as total_ausentes,
      COALESCE(ROUND(
        (COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END)::decimal /
         NULLIF(COUNT(DISTINCT rc.aluno_id), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter} ${avaliacaoFilter}
    GROUP BY rc.serie
    ORDER BY rc.serie
  `;

  // Query 11: Análise de questões por série
  // IMPORTANTE: Filtrar disciplinas conforme a série
  // - Anos Iniciais (2º, 3º, 5º Ano): LP, MAT (questões objetivas) + PROD (produção textual com itens)
  // - Anos Finais (8º, 9º Ano): LP, MAT, CH, CN (questões objetivas)
  const questoesSerieQuery = `
    SELECT
      rp.serie,
      q.id as questao_id,
      q.codigo as questao_codigo,
      CASE
        WHEN q.codigo ~ '^Q[0-9]+' THEN CAST(SUBSTRING(q.codigo FROM 2) AS INTEGER)
        WHEN q.codigo ~ '[0-9]+' THEN CAST(REGEXP_REPLACE(q.codigo, '[^0-9]', '', 'g') AS INTEGER)
        ELSE NULL
      END as numero,
      COALESCE(q.disciplina, '') as disciplina,
      COUNT(rp.id) as total_respostas,
      SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as acertos,
      COALESCE(ROUND(
        (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::decimal /
         NULLIF(COUNT(rp.id), 0) * 100)::numeric, 1
      ), 0) as percentual_acerto
    FROM questoes q
    INNER JOIN resultados_provas rp ON q.id = rp.questao_id
    WHERE rp.escola_id = $1
      AND rp.ano_letivo = $2
      ${serie ? 'AND rp.serie = $3' : ''}
      ${avaliacaoFilterRP}
      -- Filtrar disciplinas válidas por série
      AND (
        (rp.serie IN ('2º Ano', '3º Ano', '5º Ano') AND q.disciplina IN ('LP', 'MAT'))
        OR
        (rp.serie IN ('8º Ano', '9º Ano') AND q.disciplina IN ('LP', 'MAT', 'CH', 'CN'))
      )
    GROUP BY rp.serie, q.id, q.codigo, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY rp.serie, q.disciplina, numero NULLS LAST, q.codigo
  `;

  // Query 12: Itens de Produção Textual por série (Anos Iniciais)
  // NOTA: Esta query está desabilitada temporariamente porque os itens de produção
  // não estão disponíveis de forma individual na view unificada.
  // A nota de produção textual geral está disponível em rc.nota_producao
  const itensProducaoQuery = null; // Desabilitado - estrutura de banco não suporta itens individuais

  // Query 13: Comparativo com Polo - usando VIEW unificada e mesma lógica
  const comparativoPoloQuery = `
    WITH media_escola AS (
      SELECT COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}
    ),
    media_polo AS (
      SELECT COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = (SELECT polo_id FROM escolas WHERE id = $1)
        AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}
    ),
    ranking AS (
      SELECT
        e.id,
        RANK() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END) DESC NULLS LAST) as posicao,
        COUNT(*) OVER () as total_escolas
      FROM escolas e
      LEFT JOIN resultados_consolidados_unificada rc ON e.id = rc.escola_id
        AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}
      WHERE e.polo_id = (SELECT polo_id FROM escolas WHERE id = $1) AND e.ativo = true
      GROUP BY e.id
    )
    SELECT
      me.media as media_escola,
      mp.media as media_polo,
      ROUND((me.media - mp.media)::numeric, 2) as diferenca,
      r.posicao as posicao_ranking,
      r.total_escolas
    FROM media_escola me, media_polo mp
    LEFT JOIN ranking r ON r.id = $1
  `;

  try {
    const queries = [
      pool.query(escolaQuery, [escolaId]),
      pool.query(estatisticasQuery, params),
      pool.query(disciplinasQuery, params),
      pool.query(turmasQuery, params),
      pool.query(questoesQuery, params),
      pool.query(niveisQuery, params),
      pool.query(notasQuery, params),
      pool.query(comparativoPoloQuery, params),
      pool.query(niveisTurmasQuery, params),
      pool.query(faltasSerieQuery, params),
      pool.query(questoesSerieQuery, params)
    ];

    // Adicionar query de produção textual se aplicável
    if (producaoQuery) {
      queries.push(pool.query(producaoQuery, params));
    }

    const results = await Promise.all(queries);

    const escolaResult = results[0];
    const estatisticasResult = results[1];
    const disciplinasResult = results[2];
    const turmasResult = results[3];
    const questoesResult = results[4];
    const niveisResult = results[5];
    const notasResult = results[6];
    const comparativoPoloResult = results[7];
    const niveisTurmasResult = results[8];
    const faltasSerieResult = results[9];
    const questoesSerieResult = results[10];
    const producaoResult = producaoQuery ? results[11] : null;

    if (escolaResult.rows.length === 0) {
      throw new ErroRelatorio(
        CodigoErroRelatorio.ESCOLA_NAO_ENCONTRADA,
        `Escola com ID ${escolaId} não encontrada`,
        { escolaId }
      );
    }

    const escola = escolaResult.rows[0];
    const estatisticas = estatisticasResult.rows[0] || {
      total_alunos: 0,
      total_turmas: 0,
      total_avaliacoes: 0,
      media_geral: 0,
      taxa_participacao: 0,
      total_presentes: 0,
      total_ausentes: 0
    };

    // Processar disciplinas
    const desempenho_disciplinas: DesempenhoDisciplina[] = disciplinasResult.rows.map(row => ({
      disciplina: row.disciplina,
      disciplina_nome: row.disciplina_nome,
      media: parseFloat(row.media) || 0,
      total_questoes: 0,
      acertos_medio: parseFloat(row.acertos_total) / Math.max(parseInt(row.total_registros), 1),
      percentual_acerto: (parseFloat(row.media) / 10) * 100
    }));

    // Processar níveis por turma
    const niveisPorTurma: Record<string, DistribuicaoNivel[]> = {};
    niveisTurmasResult.rows.forEach((row: { turma_id: string; nivel: string; quantidade: string }) => {
      if (!niveisPorTurma[row.turma_id]) {
        niveisPorTurma[row.turma_id] = [];
      }
      niveisPorTurma[row.turma_id].push({
        nivel: row.nivel,
        cor: row.nivel === 'Avançado' ? '#22C55E' :
             row.nivel === 'Adequado' ? '#3B82F6' :
             row.nivel === 'Básico' ? '#F59E0B' : '#EF4444',
        quantidade: parseInt(row.quantidade) || 0,
        percentual: 0 // Será calculado abaixo
      });
    });

    // Calcular percentuais para cada turma
    Object.keys(niveisPorTurma).forEach(turmaId => {
      const niveis = niveisPorTurma[turmaId];
      const total = niveis.reduce((acc, n) => acc + n.quantidade, 0);
      niveis.forEach(n => {
        n.percentual = total > 0 ? Math.round((n.quantidade / total) * 100) : 0;
      });
    });

    // Processar turmas - inclui PROD para Anos Iniciais
    const turmas: TurmaRelatorio[] = turmasResult.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      total_alunos: parseInt(row.total_alunos) || 0,
      total_presentes: parseInt(row.total_presentes) || 0,
      total_ausentes: parseInt(row.total_ausentes) || 0,
      media_geral: parseFloat(row.media_geral) || 0,
      medias_disciplinas: {
        LP: parseFloat(row.media_lp) || 0,
        MAT: parseFloat(row.media_mat) || 0,
        CH: parseFloat(row.media_ch) || 0,
        CN: parseFloat(row.media_cn) || 0,
        PROD: parseFloat(row.media_producao) || 0
      },
      distribuicao_niveis: niveisPorTurma[row.id] || []
    }));

    // Processar questões - usar índice + 1 se numero for null/0
    const analise_questoes: AnaliseQuestao[] = questoesResult.rows.map((row, index) => {
      const percentual = parseFloat(row.percentual_acerto) || 0;
      const numeroExtraido = parseInt(row.numero);
      // Se não conseguiu extrair número, usar índice + 1
      const numero = !isNaN(numeroExtraido) && numeroExtraido > 0 ? numeroExtraido : index + 1;
      return {
        questao_id: row.questao_id,
        numero,
        disciplina: row.disciplina,
        total_respostas: parseInt(row.total_respostas) || 0,
        acertos: parseInt(row.acertos) || 0,
        percentual_acerto: percentual,
        dificuldade_calculada: percentual >= 70 ? 'facil' : percentual >= 40 ? 'media' : 'dificil',
        distribuicao_respostas: {}
      };
    });

    // Processar níveis
    const totalNiveis = niveisResult.rows.reduce((acc, row) => acc + parseInt(row.quantidade), 0);
    const distribuicao_niveis: DistribuicaoNivel[] = niveisResult.rows.map(row => ({
      nivel: row.nivel,
      cor: row.cor,
      quantidade: parseInt(row.quantidade) || 0,
      percentual: totalNiveis > 0 ? Math.round((parseInt(row.quantidade) / totalNiveis) * 100) : 0
    }));

    // Calcular distribuição de notas
    const notas = notasResult.rows.map(row => parseFloat(row.nota) || 0);
    const distribuicao_notas = calcularDistribuicaoNotas(notas);

    // Calcular projeções
    const projecoes = calcularProjecoes({
      disciplinas: desempenho_disciplinas.map(d => ({ disciplina: d.disciplina, media: d.media })),
      turmas: turmas.map(t => ({ media_geral: t.media_geral, serie: t.serie })),
      questoes: analise_questoes.map(q => ({ percentual_acerto: q.percentual_acerto, disciplina: q.disciplina }))
    });

    // Processar produção textual (se aplicável) - apenas nota geral disponível na VIEW
    let producao_textual: ProducaoTextual | undefined;
    if (producaoResult && producaoResult.rows.length > 0) {
      const prodRow = producaoResult.rows[0];
      const mediaProducao = parseFloat(prodRow.media_producao) || 0;

      // Só inclui se houver dados de produção
      if (mediaProducao > 0) {
        producao_textual = {
          media_geral: mediaProducao,
          itens: [] // Itens detalhados não disponíveis na VIEW unificada
        };
      }
    }

    // Processar comparativo com polo
    let comparativo_polo: {
      media_polo: number;
      media_escola: number;
      diferenca: number;
      posicao_ranking: number | undefined;
      total_escolas_polo: number | undefined;
    } | undefined;
    if (comparativoPoloResult && comparativoPoloResult.rows.length > 0) {
      const compRow = comparativoPoloResult.rows[0];
      comparativo_polo = {
        media_polo: parseFloat(compRow.media_polo) || 0,
        media_escola: parseFloat(compRow.media_escola) || 0,
        diferenca: parseFloat(compRow.diferenca) || 0,
        posicao_ranking: parseInt(compRow.posicao_ranking) || undefined,
        total_escolas_polo: parseInt(compRow.total_escolas) || undefined
      };
    }

    // Processar faltas por série
    const faltas_por_serie: FaltasSerie[] = faltasSerieResult.rows.map((row: any) => ({
      serie: row.serie,
      total_matriculados: parseInt(row.total_matriculados) || 0,
      total_presentes: parseInt(row.total_presentes) || 0,
      total_ausentes: parseInt(row.total_ausentes) || 0,
      taxa_participacao: parseFloat(row.taxa_participacao) || 0
    }));

    // Processar questões por série - agrupar por série
    const questoesPorSerieMap: Record<string, AnaliseQuestao[]> = {};
    questoesSerieResult.rows.forEach((row: any) => {
      const serieName = row.serie;
      if (!questoesPorSerieMap[serieName]) {
        questoesPorSerieMap[serieName] = [];
      }
      const percentual = parseFloat(row.percentual_acerto) || 0;
      const numeroExtraido = parseInt(row.numero);
      const numero = !isNaN(numeroExtraido) && numeroExtraido > 0 ? numeroExtraido : questoesPorSerieMap[serieName].length + 1;

      questoesPorSerieMap[serieName].push({
        questao_id: row.questao_id,
        numero,
        disciplina: row.disciplina,
        total_respostas: parseInt(row.total_respostas) || 0,
        acertos: parseInt(row.acertos) || 0,
        percentual_acerto: percentual,
        dificuldade_calculada: percentual >= 70 ? 'facil' : percentual >= 40 ? 'media' : 'dificil',
        distribuicao_respostas: {}
      });
    });

    // Nota: Itens de produção textual desabilitados - banco não possui colunas nota_item_1 a nota_item_8
    // Apenas nota_producao está disponível na VIEW resultados_consolidados_unificada

    // Converter para array de AnaliseQuestoesSerie
    const analise_questoes_por_serie: AnaliseQuestoesSerie[] = Object.entries(questoesPorSerieMap).map(([serieName, questoes]) => {
      const mediaAcerto = questoes.length > 0
        ? questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length
        : 0;

      return {
        serie: serieName,
        questoes,
        media_acerto_geral: Math.round(mediaAcerto * 10) / 10,
        questoes_dificeis: questoes.filter(q => q.dificuldade_calculada === 'dificil').slice(0, 5),
        questoes_faceis: questoes.filter(q => q.dificuldade_calculada === 'facil').slice(0, 5),
        itens_producao: undefined // Desabilitado - schema do banco não suporta
      };
    });

    // Buscar dados por segmento (apenas se não houver filtro de série)
    let anos_iniciais: DadosSegmento | undefined;
    let anos_finais: DadosSegmento | undefined;

    if (!serie) {
      const [dadosIniciais, dadosFinais] = await Promise.all([
        buscarDadosSegmento(escolaId, null, anoLetivo, 'iniciais'),
        buscarDadosSegmento(escolaId, null, anoLetivo, 'finais')
      ]);
      if (dadosIniciais) anos_iniciais = dadosIniciais;
      if (dadosFinais) anos_finais = dadosFinais;
    }

    return {
      escola: {
        id: escola.id,
        nome: escola.nome,
        codigo: escola.codigo,
        polo_id: escola.polo_id,
        polo_nome: escola.polo_nome
      },
      ano_letivo: anoLetivo,
      serie_filtro: serie,
      data_geracao: new Date().toLocaleDateString('pt-BR'),
      estatisticas: {
        total_alunos: parseInt(estatisticas.total_alunos) || 0,
        total_turmas: parseInt(estatisticas.total_turmas) || 0,
        total_avaliacoes: parseInt(estatisticas.total_avaliacoes) || 0,
        media_geral: parseFloat(estatisticas.media_geral) || 0,
        taxa_participacao: parseFloat(estatisticas.taxa_participacao) || 0,
        total_presentes: parseInt(estatisticas.total_presentes) || 0,
        total_ausentes: parseInt(estatisticas.total_ausentes) || 0
      },
      desempenho_disciplinas,
      turmas,
      analise_questoes,
      projecoes,
      graficos: {
        comparativo_disciplinas: desempenho_disciplinas.map(d => ({
          disciplina: d.disciplina_nome,
          escola: d.media,
          polo: comparativo_polo?.media_polo || 0,
          rede: 0
        })),
        distribuicao_notas,
        radar_competencias: desempenho_disciplinas.map(d => ({
          area: d.disciplina,
          valor: d.media
        }))
      },
      producao_textual,
      distribuicao_niveis,
      comparativo_polo,
      anos_iniciais,
      anos_finais,
      faltas_por_serie,
      analise_questoes_por_serie
    };
  } catch (error) {
    // Re-lançar ErroRelatorio sem modificação
    if (error instanceof ErroRelatorio) {
      throw error;
    }

    // Converter outros erros para ErroRelatorio
    console.error('Erro ao buscar dados do relatório:', error);
    throw new ErroRelatorio(
      CodigoErroRelatorio.ERRO_CONSULTA_BD,
      'Erro ao buscar dados do relatório da escola',
      { escolaId, anoLetivo, serie, originalError: String(error) }
    );
  }
}
