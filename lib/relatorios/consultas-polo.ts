/**
 * Consultas SQL para relatório de polo
 * @module lib/relatorios/consultas-polo
 *
 * Extraído de consultas-relatorio.ts para melhor organização.
 */

import pool from '@/database/connection';
import {
  DadosRelatorioPolo,
  DadosSegmento,
  DesempenhoDisciplina,
  AnaliseQuestao,
  EscolaComparativo,
  ComparativoEscola,
  DistribuicaoNivel,
  ProducaoTextual,
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
 * Busca dados completos para relatório de um polo
 *
 * @param poloId - UUID do polo
 * @param anoLetivo - Ano letivo no formato 'YYYY'
 * @param serie - Série específica para filtrar (opcional)
 * @returns Dados completos para geração do relatório do polo
 * @throws ErroRelatorio se o polo não for encontrado ou parâmetros inválidos
 *
 * @example
 * ```typescript
 * const dados = await buscarDadosRelatorioPolo(
 *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   '2025'
 * );
 * ```
 */
export async function buscarDadosRelatorioPolo(
  poloId: string,
  anoLetivo: string,
  serie?: string,
  avaliacaoId?: string
): Promise<DadosRelatorioPolo> {
  // Validar parâmetros de entrada
  validarFiltroRelatorio({ id: poloId, ano_letivo: anoLetivo, serie: serie as SerieDisponivel | undefined });

  const params: string[] = [poloId, anoLetivo];
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

  // Query 1: Dados do polo
  const poloQuery = `
    SELECT id, nome, COALESCE(codigo, '') as codigo
    FROM polos
    WHERE id = $1
  `;

  // Query 2: Estatísticas gerais do polo - usando mesma lógica do dashboard
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) as total_avaliacoes,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN 1 END)::decimal /
         NULLIF(COUNT(*), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter} ${avaliacaoFilter}
  `;

  // Query 3: Desempenho por disciplina do polo - usando mesma lógica do dashboard
  const incluirCHCN = serieTemCHCN(serie);
  const incluirPROD = serieTemProducaoTextual(serie);

  const disciplinasQuery = `
    WITH disciplinas AS (
      SELECT
        'LP' as disciplina,
        'Língua Portuguesa' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_lp, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_mat, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter} ${avaliacaoFilter}

      ${incluirPROD ? `
      UNION ALL

      SELECT
        'PROD' as disciplina,
        'Produção Textual' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) END) as media,
        0 as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2
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
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2
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
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2
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

  // Query 4: Escolas do polo com ranking - usando mesma lógica do dashboard
  const escolasQuery = `
    SELECT
      e.id,
      e.nome,
      COALESCE(e.codigo, '') as codigo,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      RANK() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END) DESC NULLS LAST) as ranking_posicao
    FROM escolas e
    LEFT JOIN resultados_consolidados_unificada rc ON e.id = rc.escola_id
      AND rc.ano_letivo = $2
      ${serieFilter} ${avaliacaoFilter}
    WHERE e.polo_id = $1 AND e.ativo = true
    GROUP BY e.id, e.nome, e.codigo
    ORDER BY media_geral DESC NULLS LAST
  `;

  // Query 5: Comparativo entre escolas - usando mesma lógica do dashboard
  const comparativoQuery = `
    SELECT
      e.nome as escola_nome,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as lp,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as mat,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END)::numeric, 2), 0) as ch,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END)::numeric, 2), 0) as cn,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media
    FROM escolas e
    LEFT JOIN resultados_consolidados_unificada rc ON e.id = rc.escola_id
      AND rc.ano_letivo = $2
      ${serieFilter} ${avaliacaoFilter}
    WHERE e.polo_id = $1 AND e.ativo = true
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) > 0
    ORDER BY media DESC
  `;

  // Query 6: Análise de questões do polo
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
      AND rp.ano_letivo = $2
      ${avaliacaoFilterRP}
    LEFT JOIN escolas e ON rp.escola_id = e.id
    WHERE e.polo_id = $1
    GROUP BY q.id, q.codigo, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY q.disciplina, numero NULLS LAST, q.codigo
    LIMIT 100
  `;

  // Query 7: Notas para distribuição - usando mesma lógica do dashboard
  const notasQuery = `
    SELECT CAST(rc.media_aluno AS DECIMAL) as nota
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1
      AND rc.ano_letivo = $2
      AND (rc.presenca = 'P' OR rc.presenca = 'p')
      AND rc.media_aluno IS NOT NULL
      AND CAST(rc.media_aluno AS DECIMAL) > 0
      ${serieFilter} ${avaliacaoFilter}
  `;

  // Query 8: Distribuição por níveis de aprendizagem - calculado dinamicamente pela média
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
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2
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

  // Query 9: Produção Textual (apenas para Anos Iniciais)
  const incluirProducao = serieTemProducaoTextual(serie);

  // Produção textual - apenas nota_producao disponível na VIEW unificada
  const producaoQuery = incluirProducao ? `
    SELECT
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) END)::numeric, 2), 0) as media_producao,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1
      AND rc.ano_letivo = $2
      AND rc.serie IN ('2º Ano', '3º Ano', '5º Ano')
      ${serieFilter} ${avaliacaoFilter}
  ` : null;

  try {
    const queries = [
      pool.query(poloQuery, [poloId]),
      pool.query(estatisticasQuery, params),
      pool.query(disciplinasQuery, params),
      pool.query(escolasQuery, params),
      pool.query(comparativoQuery, params),
      pool.query(questoesQuery, params),
      pool.query(notasQuery, params),
      pool.query(niveisQuery, params)
    ];

    // Adicionar query de produção textual se aplicável
    if (producaoQuery) {
      queries.push(pool.query(producaoQuery, params));
    }

    const results = await Promise.all(queries);

    const poloResult = results[0];
    const estatisticasResult = results[1];
    const disciplinasResult = results[2];
    const escolasResult = results[3];
    const comparativoResult = results[4];
    const questoesResult = results[5];
    const notasResult = results[6];
    const niveisResult = results[7];
    const producaoResult = producaoQuery ? results[8] : null;

    if (poloResult.rows.length === 0) {
      throw new ErroRelatorio(
        CodigoErroRelatorio.POLO_NAO_ENCONTRADO,
        `Polo com ID ${poloId} não encontrado`,
        { poloId }
      );
    }

    const polo = poloResult.rows[0];
    const estatisticas = estatisticasResult.rows[0] || {
      total_alunos: 0,
      total_turmas: 0,
      total_avaliacoes: 0,
      media_geral: 0,
      taxa_participacao: 0
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

    // Processar escolas
    const escolas: EscolaComparativo[] = escolasResult.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      codigo: row.codigo,
      total_alunos: parseInt(row.total_alunos) || 0,
      total_turmas: parseInt(row.total_turmas) || 0,
      media_geral: parseFloat(row.media_geral) || 0,
      ranking_posicao: parseInt(row.ranking_posicao) || 0
    }));

    // Processar comparativo
    const comparativo_escolas: ComparativoEscola[] = comparativoResult.rows.map(row => ({
      escola_nome: row.escola_nome,
      lp: parseFloat(row.lp) || 0,
      mat: parseFloat(row.mat) || 0,
      ch: parseFloat(row.ch) || 0,
      cn: parseFloat(row.cn) || 0,
      media: parseFloat(row.media) || 0
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

    // Calcular distribuição de notas
    const notas = notasResult.rows.map(row => parseFloat(row.nota) || 0);
    const distribuicao_notas = calcularDistribuicaoNotas(notas);

    // Calcular projeções
    const projecoes = calcularProjecoes({
      disciplinas: desempenho_disciplinas.map(d => ({ disciplina: d.disciplina, media: d.media })),
      turmas: escolas.map(e => ({ media_geral: e.media_geral, serie: '' })),
      questoes: analise_questoes.map(q => ({ percentual_acerto: q.percentual_acerto, disciplina: q.disciplina }))
    });

    // Processar níveis de aprendizagem
    const totalNiveis = niveisResult.rows.reduce((acc: number, row: { quantidade: string }) => acc + parseInt(row.quantidade), 0);
    const distribuicao_niveis: DistribuicaoNivel[] = niveisResult.rows.map((row: { nivel: string; cor: string; quantidade: string }) => ({
      nivel: row.nivel,
      cor: row.cor,
      quantidade: parseInt(row.quantidade) || 0,
      percentual: totalNiveis > 0 ? Math.round((parseInt(row.quantidade) / totalNiveis) * 100) : 0
    }));

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

    // Buscar dados por segmento (apenas se não houver filtro de série)
    let anos_iniciais: DadosSegmento | undefined;
    let anos_finais: DadosSegmento | undefined;

    if (!serie) {
      const [dadosIniciais, dadosFinais] = await Promise.all([
        buscarDadosSegmento(null, poloId, anoLetivo, 'iniciais'),
        buscarDadosSegmento(null, poloId, anoLetivo, 'finais')
      ]);
      if (dadosIniciais) anos_iniciais = dadosIniciais;
      if (dadosFinais) anos_finais = dadosFinais;
    }

    return {
      polo: {
        id: polo.id,
        nome: polo.nome,
        codigo: polo.codigo
      },
      ano_letivo: anoLetivo,
      serie_filtro: serie,
      data_geracao: new Date().toLocaleDateString('pt-BR'),
      estatisticas: {
        total_alunos: parseInt(estatisticas.total_alunos) || 0,
        total_turmas: parseInt(estatisticas.total_turmas) || 0,
        total_avaliacoes: parseInt(estatisticas.total_avaliacoes) || 0,
        media_geral: parseFloat(estatisticas.media_geral) || 0,
        taxa_participacao: parseFloat(estatisticas.taxa_participacao) || 0
      },
      desempenho_disciplinas,
      escolas,
      comparativo_escolas,
      analise_questoes,
      projecoes,
      graficos: {
        comparativo_disciplinas: desempenho_disciplinas.map(d => ({
          disciplina: d.disciplina_nome,
          escola: 0,
          polo: d.media,
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
      anos_iniciais,
      anos_finais
    };
  } catch (error) {
    // Re-lançar ErroRelatorio sem modificação
    if (error instanceof ErroRelatorio) {
      throw error;
    }

    // Converter outros erros para ErroRelatorio
    console.error('Erro ao buscar dados do relatório do polo:', error);
    throw new ErroRelatorio(
      CodigoErroRelatorio.ERRO_CONSULTA_BD,
      'Erro ao buscar dados do relatório do polo',
      { poloId, anoLetivo, serie, originalError: String(error) }
    );
  }
}
