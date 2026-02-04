/**
 * Consultas SQL para geração de relatórios
 * @module lib/relatorios/consultas-relatorio
 *
 * Este módulo contém todas as consultas SQL utilizadas para buscar
 * dados necessários para a geração de relatórios PDF.
 *
 * As consultas são executadas em paralelo usando Promise.all para
 * otimizar a performance.
 *
 * @example
 * ```typescript
 * const dados = await buscarDadosRelatorioEscola('uuid-escola', '2025', '5º Ano');
 * ```
 */

import pool from '@/database/connection';
import {
  DadosRelatorioEscola,
  DadosRelatorioPolo,
  DadosSegmento,
  DesempenhoDisciplina,
  TurmaRelatorio,
  AnaliseQuestao,
  EscolaComparativo,
  ComparativoEscola,
  DistribuicaoNivel,
  ProducaoTextual,
  // Tipos de rows do banco
  EscolaRow,
  PoloRow,
  EstatisticasRow,
  DisciplinaRow,
  TurmaRow,
  QuestaoRow,
  NivelRow,
  ProducaoTextualRow,
  ComparativoPoloRow,
  EscolaPoloRow,
  ComparativoEscolaRow,
  // Utilitários
  ErroRelatorio,
  CodigoErroRelatorio,
  serieTemProducaoTextual,
  serieTemCHCN,
  validarFiltroRelatorio,
  parseNumero,
  parseInteiro
} from './tipos';
import { calcularProjecoes, calcularDistribuicaoNotas } from './calculos-projecoes';

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
  serie?: string
): Promise<DadosRelatorioEscola> {
  // Validar parâmetros de entrada
  validarFiltroRelatorio({ id: escolaId, ano_letivo: anoLetivo, serie: serie as any });

  const params = serie ? [escolaId, anoLetivo, serie] : [escolaId, anoLetivo];
  const serieFilter = serie ? 'AND rc.serie = $3' : '';

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
      ), 0) as taxa_participacao
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter}
  `;

  // Query 3: Desempenho por disciplina
  // CH e CN só são avaliados em 8º e 9º Ano (usando função utilitária)
  const incluirCHCN = serieTemCHCN(serie);

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
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_mat, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

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
        ${serieFilter}

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
        ${serieFilter}
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
  const turmasQuery = `
    SELECT
      t.id,
      COALESCE(t.codigo, t.nome) as codigo,
      COALESCE(t.nome, t.codigo) as nome,
      COALESCE(t.serie, '') as serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as media_lp,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as media_mat,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END)::numeric, 2), 0) as media_ch,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END)::numeric, 2), 0) as media_cn
    FROM turmas t
    LEFT JOIN resultados_consolidados_unificada rc ON t.id = rc.turma_id
      AND rc.ano_letivo = $2
    WHERE t.escola_id = $1
      ${serie ? 'AND t.serie = $3' : ''}
    GROUP BY t.id, t.codigo, t.nome, t.serie
    HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) > 0
    ORDER BY t.serie, t.codigo
  `;

  // Query 5: Análise de questões
  // Extrair número da questão do código (ex: Q15 -> 15, LP01 -> 1) ou usar numero_questao
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      q.codigo as questao_codigo,
      COALESCE(
        q.numero_questao,
        CASE
          WHEN q.codigo ~ '^Q[0-9]+' THEN CAST(SUBSTRING(q.codigo FROM 2) AS INTEGER)
          WHEN q.codigo ~ '[0-9]+' THEN CAST(REGEXP_REPLACE(q.codigo, '[^0-9]', '', 'g') AS INTEGER)
          ELSE NULL
        END
      ) as numero,
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
    WHERE 1=1
      ${serie ? 'AND q.serie_aplicavel = $3' : ''}
    GROUP BY q.id, q.codigo, q.numero_questao, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY q.disciplina, numero NULLS LAST, q.codigo
    LIMIT 100
  `;

  // Query 6: Distribuição por níveis de aprendizagem - usando campo nivel_aprendizagem (VARCHAR)
  const niveisQuery = `
    SELECT
      COALESCE(rc.nivel_aprendizagem, 'Não classificado') as nivel,
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN '#22C55E'
        WHEN 'Adequado' THEN '#3B82F6'
        WHEN 'Básico' THEN '#F59E0B'
        WHEN 'Insuficiente' THEN '#EF4444'
        ELSE '#6B7280'
      END as cor,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) as quantidade
    FROM resultados_consolidados_unificada rc
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      ${serieFilter}
    GROUP BY rc.nivel_aprendizagem
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) > 0
    ORDER BY
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN 1
        WHEN 'Adequado' THEN 2
        WHEN 'Básico' THEN 3
        WHEN 'Insuficiente' THEN 4
        ELSE 5
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
      ${serieFilter}
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
      ${serieFilter}
  ` : null;

  // Query 9: Comparativo com Polo - usando VIEW unificada e mesma lógica
  const comparativoPoloQuery = `
    WITH media_escola AS (
      SELECT COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}
    ),
    media_polo AS (
      SELECT COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = (SELECT polo_id FROM escolas WHERE id = $1)
        AND rc.ano_letivo = $2 ${serieFilter}
    ),
    ranking AS (
      SELECT
        e.id,
        RANK() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END) DESC NULLS LAST) as posicao,
        COUNT(*) OVER () as total_escolas
      FROM escolas e
      LEFT JOIN resultados_consolidados_unificada rc ON e.id = rc.escola_id
        AND rc.ano_letivo = $2 ${serieFilter}
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
      pool.query(comparativoPoloQuery, params)
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
    const producaoResult = producaoQuery ? results[8] : null;

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

    // Processar turmas
    const turmas: TurmaRelatorio[] = turmasResult.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      total_alunos: parseInt(row.total_alunos) || 0,
      media_geral: parseFloat(row.media_geral) || 0,
      medias_disciplinas: {
        LP: parseFloat(row.media_lp) || 0,
        MAT: parseFloat(row.media_mat) || 0,
        CH: parseFloat(row.media_ch) || 0,
        CN: parseFloat(row.media_cn) || 0
      },
      distribuicao_niveis: []
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
        taxa_participacao: parseFloat(estatisticas.taxa_participacao) || 0
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
      anos_finais
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
  serie?: string
): Promise<DadosRelatorioPolo> {
  // Validar parâmetros de entrada
  validarFiltroRelatorio({ id: poloId, ano_letivo: anoLetivo, serie: serie as any });

  const params = serie ? [poloId, anoLetivo, serie] : [poloId, anoLetivo];
  const serieFilter = serie ? 'AND rc.serie = $3' : '';

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
      ${serieFilter}
  `;

  // Query 3: Desempenho por disciplina do polo - usando mesma lógica do dashboard
  const incluirCHCN = serieTemCHCN(serie);

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
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media,
        SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(rc.total_acertos_mat, 0) ELSE 0 END) as acertos_total,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 END) as total_registros
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

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
        ${serieFilter}

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
        ${serieFilter}
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
      ${serieFilter}
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
      ${serieFilter}
    WHERE e.polo_id = $1 AND e.ativo = true
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) > 0
    ORDER BY media DESC
  `;

  // Query 6: Análise de questões do polo
  // Extrair número da questão do código (ex: Q15 -> 15, LP01 -> 1) ou usar numero_questao
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      q.codigo as questao_codigo,
      COALESCE(
        q.numero_questao,
        CASE
          WHEN q.codigo ~ '^Q[0-9]+' THEN CAST(SUBSTRING(q.codigo FROM 2) AS INTEGER)
          WHEN q.codigo ~ '[0-9]+' THEN CAST(REGEXP_REPLACE(q.codigo, '[^0-9]', '', 'g') AS INTEGER)
          ELSE NULL
        END
      ) as numero,
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
    LEFT JOIN escolas e ON rp.escola_id = e.id
    WHERE e.polo_id = $1
      ${serie ? 'AND q.serie_aplicavel = $3' : ''}
    GROUP BY q.id, q.codigo, q.numero_questao, q.disciplina
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
      ${serieFilter}
  `;

  // Query 8: Distribuição por níveis de aprendizagem - usando campo nivel_aprendizagem (VARCHAR)
  const niveisQuery = `
    SELECT
      COALESCE(rc.nivel_aprendizagem, 'Não classificado') as nivel,
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN '#22C55E'
        WHEN 'Adequado' THEN '#3B82F6'
        WHEN 'Básico' THEN '#F59E0B'
        WHEN 'Insuficiente' THEN '#EF4444'
        ELSE '#6B7280'
      END as cor,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1 AND rc.ano_letivo = $2
      ${serieFilter}
    GROUP BY rc.nivel_aprendizagem
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) > 0
    ORDER BY
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN 1
        WHEN 'Adequado' THEN 2
        WHEN 'Básico' THEN 3
        WHEN 'Insuficiente' THEN 4
        ELSE 5
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
      ${serieFilter}
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
  const seriesFinais = ['6º Ano', '7º Ano', '8º Ano', '9º Ano'];
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
      ), 0) as taxa_participacao
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

  // Query de níveis de aprendizagem
  const niveisQuery = `
    SELECT
      COALESCE(rc.nivel_aprendizagem, 'Não classificado') as nivel,
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN '#22C55E'
        WHEN 'Adequado' THEN '#3B82F6'
        WHEN 'Básico' THEN '#F59E0B'
        WHEN 'Insuficiente' THEN '#EF4444'
        ELSE '#6B7280'
      END as cor,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) as quantidade
    FROM resultados_consolidados_unificada rc
    ${poloId && !escolaId ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    WHERE rc.ano_letivo = $1 ${entidadeFilter}
      AND rc.serie IN (${seriesPlaceholder})
    GROUP BY rc.nivel_aprendizagem
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN 1 END) > 0
    ORDER BY
      CASE rc.nivel_aprendizagem
        WHEN 'Avançado' THEN 1
        WHEN 'Adequado' THEN 2
        WHEN 'Básico' THEN 3
        WHEN 'Insuficiente' THEN 4
        ELSE 5
      END
  `;

  // Query de turmas
  const turmasQuery = `
    SELECT
      t.id,
      COALESCE(t.codigo, t.nome) as codigo,
      COALESCE(t.nome, t.codigo) as nome,
      COALESCE(t.serie, '') as serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as media_lp,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as media_mat,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END)::numeric, 2), 0) as media_ch,
      COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END)::numeric, 2), 0) as media_cn
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

  try {
    const queries = [
      pool.query(estatisticasQuery, params),
      pool.query(disciplinasQuery, params),
      pool.query(niveisQuery, params),
      pool.query(turmasQuery, params)
    ];

    if (producaoQuery) {
      queries.push(pool.query(producaoQuery, params));
    }

    const results = await Promise.all(queries);

    const estatisticasResult = results[0];
    const disciplinasResult = results[1];
    const niveisResult = results[2];
    const turmasResult = results[3];
    const producaoResult = producaoQuery ? results[4] : null;

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

    // Processar turmas
    const turmas: TurmaRelatorio[] = turmasResult.rows.map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      total_alunos: parseInt(row.total_alunos) || 0,
      media_geral: parseFloat(row.media_geral) || 0,
      medias_disciplinas: {
        LP: parseFloat(row.media_lp) || 0,
        MAT: parseFloat(row.media_mat) || 0,
        CH: parseFloat(row.media_ch) || 0,
        CN: parseFloat(row.media_cn) || 0
      },
      distribuicao_niveis: []
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
        taxa_participacao: parseFloat(estatisticas.taxa_participacao) || 0
      },
      desempenho_disciplinas,
      distribuicao_niveis,
      producao_textual,
      turmas
    };
  } catch (error) {
    console.error(`Erro ao buscar dados do segmento ${segmento}:`, error);
    return null;
  }
}
