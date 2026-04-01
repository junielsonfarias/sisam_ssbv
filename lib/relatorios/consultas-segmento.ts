/**
 * Consultas SQL para relatório por segmento (Anos Iniciais / Anos Finais)
 * @module lib/relatorios/consultas-segmento
 *
 * Extraído de consultas-relatorio.ts para melhor organização.
 */

import pool from '@/database/connection';
import {
  DadosSegmento,
  DesempenhoDisciplina,
  TurmaRelatorio,
  AnaliseQuestao,
  AnaliseQuestoesSerie,
  ItemProducaoAvaliado,
  ProducaoTextual,
  DistribuicaoNivel
} from './tipos';

/**
 * Busca dados de um segmento específico (Anos Iniciais ou Anos Finais)
 *
 * @param escolaId - UUID da escola (null para buscar de todo o polo)
 * @param poloId - UUID do polo (usado quando escolaId é null)
 * @param anoLetivo - Ano letivo
 * @param segmento - 'iniciais' ou 'finais'
 * @returns Dados do segmento
 */
export async function buscarDadosSegmento(
  escolaId: string | null,
  poloId: string | null,
  anoLetivo: string,
  segmento: 'iniciais' | 'finais'
): Promise<DadosSegmento | null> {
  const seriesIniciais = ['2º Ano', '3º Ano', '5º Ano'];
  const seriesFinais = ['8º Ano', '9º Ano'];
  const series = segmento === 'iniciais' ? seriesIniciais : seriesFinais;
  const nomeSegmento = segmento === 'iniciais' ? 'Anos Iniciais' : 'Anos Finais';

  // Construir filtro de entidade (escola ou polo)
  let entidadeFilter = '';
  let params: any[] = [anoLetivo];

  if (escolaId) {
    entidadeFilter = 'AND rc.escola_id = $2';
    params.push(escolaId);
  } else if (poloId) {
    entidadeFilter = 'AND e.polo_id = $2';
    params.push(poloId);
  }

  const seriesPlaceholder = series.map((_, i) => `$${params.length + i + 1}`).join(', ');
  params.push(...series);

  // Query de estatísticas
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN 1 END)::decimal /
         NULLIF(COUNT(*), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as total_presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN rc.aluno_id END) as total_ausentes
    FROM resultados_consolidados_unificada rc
    ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    WHERE rc.ano_letivo = $1
      ${entidadeFilter}
      AND rc.serie IN (${seriesPlaceholder})
  `;

  // Query de disciplinas
  const disciplinasQuery = `
    WITH disciplinas AS (
      SELECT
        'LP' as disciplina,
        'Língua Portuguesa' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter} AND rc.serie IN (${seriesPlaceholder})

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter} AND rc.serie IN (${seriesPlaceholder})

      ${segmento === 'iniciais' ? `
      UNION ALL

      SELECT
        'PROD' as disciplina,
        'Produção Textual' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) END) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter} AND rc.serie IN (${seriesPlaceholder})
      ` : ''}

      ${segmento === 'finais' ? `
      UNION ALL

      SELECT
        'CH' as disciplina,
        'Ciências Humanas' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter} AND rc.serie IN ('8º Ano', '9º Ano')

      UNION ALL

      SELECT
        'CN' as disciplina,
        'Ciências da Natureza' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter} AND rc.serie IN ('8º Ano', '9º Ano')
      ` : ''}
    )
    SELECT
      disciplina,
      disciplina_nome,
      COALESCE(ROUND(media::numeric, 2), 0) as media,
      COALESCE(total_registros, 0) as total_registros
    FROM disciplinas
    WHERE total_registros > 0
  `;

  // Query de níveis de aprendizagem - calculado dinamicamente pela média
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
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter}
        AND rc.serie IN (${seriesPlaceholder})
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
        AND rc.media_aluno IS NOT NULL
        AND CAST(rc.media_aluno AS DECIMAL) > 0
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

  // Query de turmas - inclui PROD para Anos Iniciais
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
    LEFT JOIN resultados_consolidados_unificada rc ON t.id = rc.turma_id AND rc.ano_letivo = $1
    ${poloId && !escolaId ? 'INNER JOIN escolas e ON t.escola_id = e.id' : ''}
    WHERE ${escolaId ? 't.escola_id = $2' : poloId ? 'e.polo_id = $2' : '1=1'}
      AND t.serie IN (${seriesPlaceholder})
    GROUP BY t.id, t.codigo, t.nome, t.serie
    HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) > 0
    ORDER BY t.serie, t.codigo
  `;

  // Query de produção textual (apenas Anos Iniciais)
  const producaoQuery = segmento === 'iniciais' ? `
    SELECT
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) END)::numeric, 2), 0) as media_producao,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    WHERE rc.ano_letivo = $1
      ${entidadeFilter}
      AND rc.serie IN (${seriesPlaceholder})
  ` : null;

  // Query de questões por série do segmento
  // Filtrar disciplinas corretamente:
  // - Anos Iniciais: LP, MAT (questões objetivas)
  // - Anos Finais: LP, MAT, CH, CN
  // IMPORTANTE: Usar tabela resultados_provas em vez de avaliacoes/alunos_respostas
  const disciplinasSegmento = segmento === 'iniciais' ? "('LP', 'MAT')" : "('LP', 'MAT', 'CH', 'CN')";

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
    ${poloId && !escolaId ? 'INNER JOIN escolas e ON rp.escola_id = e.id' : ''}
    WHERE rp.ano_letivo = $1
      ${escolaId ? 'AND rp.escola_id = $2' : poloId ? 'AND e.polo_id = $2' : ''}
      AND rp.serie IN (${seriesPlaceholder})
      AND q.disciplina IN ${disciplinasSegmento}
    GROUP BY rp.serie, q.id, q.codigo, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY rp.serie, q.disciplina, numero NULLS LAST, q.codigo
  `;

  // Query de níveis por turma
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
      ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
      WHERE rc.ano_letivo = $1 ${entidadeFilter}
        AND rc.serie IN (${seriesPlaceholder})
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
        AND rc.media_aluno IS NOT NULL
        AND CAST(rc.media_aluno AS DECIMAL) > 0
    ) as niveis
    GROUP BY turma_id, nivel
    ORDER BY turma_id, nivel
  `;

  // Query de itens de produção textual por série (apenas Anos Iniciais)
  // NOTA: Desabilitado - a estrutura do banco não suporta itens de produção individuais
  // A nota de produção textual geral está disponível em rc.nota_producao
  const itensProducaoQuery = null;

  try {
    const queries = [
      pool.query(estatisticasQuery, params),
      pool.query(disciplinasQuery, params),
      pool.query(niveisQuery, params),
      pool.query(turmasQuery, params),
      pool.query(niveisTurmasQuery, params),
      pool.query(questoesSerieQuery, params)
    ];

    if (producaoQuery) {
      queries.push(pool.query(producaoQuery, params));
    }

    if (itensProducaoQuery) {
      queries.push(pool.query(itensProducaoQuery, params));
    }

    const results = await Promise.all(queries);

    const estatisticasResult = results[0];
    const disciplinasResult = results[1];
    const niveisResult = results[2];
    const turmasResult = results[3];
    const niveisTurmasResult = results[4];
    const questoesSerieResult = results[5];

    let resultIndex = 6;
    const producaoResult = producaoQuery ? results[resultIndex++] : null;
    const itensProducaoResult = itensProducaoQuery ? results[resultIndex++] : null;

    const estatisticas = estatisticasResult.rows[0];

    // Se não houver dados, retornar null
    if (!estatisticas || parseInt(estatisticas.total_alunos) === 0) {
      return null;
    }

    // Processar disciplinas
    const desempenho_disciplinas: DesempenhoDisciplina[] = disciplinasResult.rows.map((row: any) => ({
      disciplina: row.disciplina,
      disciplina_nome: row.disciplina_nome,
      media: parseFloat(row.media) || 0,
      total_questoes: 0,
      acertos_medio: 0,
      percentual_acerto: (parseFloat(row.media) / 10) * 100
    }));

    // Processar níveis
    const totalNiveis = niveisResult.rows.reduce((acc: number, row: any) => acc + parseInt(row.quantidade), 0);
    const distribuicao_niveis: DistribuicaoNivel[] = niveisResult.rows.map((row: any) => ({
      nivel: row.nivel,
      cor: row.cor,
      quantidade: parseInt(row.quantidade) || 0,
      percentual: totalNiveis > 0 ? Math.round((parseInt(row.quantidade) / totalNiveis) * 100) : 0
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
    const turmas: TurmaRelatorio[] = turmasResult.rows.map((row: any) => ({
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

    // Processar produção textual
    let producao_textual: ProducaoTextual | undefined;
    if (producaoResult && producaoResult.rows.length > 0) {
      const prodRow = producaoResult.rows[0];
      const mediaProducao = parseFloat(prodRow.media_producao) || 0;
      if (mediaProducao > 0) {
        producao_textual = {
          media_geral: mediaProducao,
          itens: []
        };
      }
    }

    // Processar análise de questões por série
    const questoesPorSerieMap: Record<string, AnaliseQuestao[]> = {};
    questoesSerieResult.rows.forEach((row: any) => {
      const serieNome = row.serie;
      if (!questoesPorSerieMap[serieNome]) {
        questoesPorSerieMap[serieNome] = [];
      }
      const percentualAcerto = parseFloat(row.percentual_acerto) || 0;
      questoesPorSerieMap[serieNome].push({
        questao_id: row.questao_id,
        numero: parseInt(row.numero) || 0,
        disciplina: row.disciplina || 'LP',
        total_respostas: parseInt(row.total_respostas) || 0,
        acertos: parseInt(row.acertos) || 0,
        percentual_acerto: percentualAcerto,
        dificuldade_calculada: percentualAcerto >= 70 ? 'facil' : percentualAcerto >= 40 ? 'media' : 'dificil',
        distribuicao_respostas: {}
      });
    });

    // Processar itens de produção por série (apenas Anos Iniciais)
    const itensProducaoPorSerie: Record<string, ItemProducaoAvaliado[]> = {};
    if (itensProducaoResult) {
      itensProducaoResult.rows.forEach((row: any) => {
        const serieNome = row.serie;
        if (!itensProducaoPorSerie[serieNome]) {
          itensProducaoPorSerie[serieNome] = [];
        }
        const notaMaxima = parseFloat(row.nota_maxima) || 1;
        const mediaItem = parseFloat(row.media_item) || 0;
        const percentualAcerto = notaMaxima > 0 ? (mediaItem / notaMaxima) * 100 : 0;

        itensProducaoPorSerie[serieNome].push({
          item_id: row.item_id,
          item_codigo: row.item_codigo,
          item_nome: row.item_nome,
          ordem: parseInt(row.ordem) || 0,
          total_alunos: parseInt(row.total_alunos) || 0,
          media_item: mediaItem,
          nota_maxima: notaMaxima,
          percentual_acerto: Math.round(percentualAcerto * 10) / 10
        });
      });
    }

    // Converter para array de AnaliseQuestoesSerie
    const analise_questoes_por_serie: AnaliseQuestoesSerie[] = Object.entries(questoesPorSerieMap).map(([serieName, questoes]) => {
      const mediaAcerto = questoes.length > 0
        ? questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length
        : 0;

      // Adicionar itens de produção para séries de Anos Iniciais
      const itensProducao = itensProducaoPorSerie[serieName];

      return {
        serie: serieName,
        questoes,
        media_acerto_geral: Math.round(mediaAcerto * 10) / 10,
        questoes_dificeis: questoes.filter(q => q.percentual_acerto < 40).sort((a, b) => a.percentual_acerto - b.percentual_acerto),
        questoes_faceis: questoes.filter(q => q.percentual_acerto >= 70).sort((a, b) => b.percentual_acerto - a.percentual_acerto),
        itens_producao: itensProducao
      };
    });

    return {
      nome_segmento: nomeSegmento,
      // Filtrar séries: Anos Finais incluem todas, Anos Iniciais excluem 6º e 7º
      series: series.filter(s => {
        if (segmento === 'finais') return true;
        return s !== '6º Ano' && s !== '7º Ano';
      }),
      estatisticas: {
        total_alunos: parseInt(estatisticas.total_alunos) || 0,
        total_turmas: parseInt(estatisticas.total_turmas) || 0,
        media_geral: parseFloat(estatisticas.media_geral) || 0,
        taxa_participacao: parseFloat(estatisticas.taxa_participacao) || 0,
        total_presentes: parseInt(estatisticas.total_presentes) || 0,
        total_ausentes: parseInt(estatisticas.total_ausentes) || 0
      },
      desempenho_disciplinas,
      distribuicao_niveis,
      producao_textual,
      turmas,
      analise_questoes_por_serie
    };
  } catch (error) {
    console.error(`Erro ao buscar dados do segmento ${segmento}:`, error);
    return null;
  }
}
