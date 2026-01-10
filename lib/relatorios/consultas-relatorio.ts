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
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(rc.id) as total_avaliacoes,
      COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca IS NULL THEN 1 END)::decimal /
         NULLIF(COUNT(rc.id), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter}
  `;

  // Query 3: Desempenho por disciplina
  // CH e CN só são avaliados em 8º e 9º Ano (usando função utilitária)
  const incluirCHCN = serieTemCHCN(serie);

  const disciplinasQuery = `
    WITH disciplinas AS (
      SELECT
        'LP' as disciplina,
        'Língua Portuguesa' as disciplina_nome,
        AVG(rc.nota_lp) as media,
        SUM(rc.total_acertos_lp) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(rc.nota_mat) as media,
        SUM(rc.total_acertos_mat) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      ${incluirCHCN ? `
      UNION ALL

      SELECT
        'CH' as disciplina,
        'Ciências Humanas' as disciplina_nome,
        AVG(rc.nota_ch) as media,
        SUM(rc.total_acertos_ch) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND rc.serie IN ('8º Ano', '9º Ano')
        ${serieFilter}

      UNION ALL

      SELECT
        'CN' as disciplina,
        'Ciências da Natureza' as disciplina_nome,
        AVG(rc.nota_cn) as media,
        SUM(rc.total_acertos_cn) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
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

  // Query 4: Detalhamento por turma
  const turmasQuery = `
    SELECT
      t.id,
      COALESCE(t.codigo, t.nome) as codigo,
      COALESCE(t.nome, t.codigo) as nome,
      COALESCE(t.serie, '') as serie,
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(AVG(rc.nota_lp)::numeric, 2), 0) as media_lp,
      COALESCE(ROUND(AVG(rc.nota_mat)::numeric, 2), 0) as media_mat,
      COALESCE(ROUND(AVG(rc.nota_ch)::numeric, 2), 0) as media_ch,
      COALESCE(ROUND(AVG(rc.nota_cn)::numeric, 2), 0) as media_cn
    FROM turmas t
    LEFT JOIN resultados_consolidados rc ON t.id = rc.turma_id
      AND rc.ano_letivo = $2
    WHERE t.escola_id = $1
      ${serie ? 'AND t.serie = $3' : ''}
    GROUP BY t.id, t.codigo, t.nome, t.serie
    ORDER BY t.serie, t.codigo
  `;

  // Query 5: Análise de questões
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      COALESCE(q.numero_questao, 0) as numero,
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
    WHERE q.ativo = true
      ${serie ? 'AND q.serie_aplicavel = $3' : ''}
    GROUP BY q.id, q.numero_questao, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY q.disciplina, q.numero_questao
    LIMIT 100
  `;

  // Query 6: Distribuição por níveis de aprendizagem
  const niveisQuery = `
    SELECT
      COALESCE(na.nome, 'Não classificado') as nivel,
      COALESCE(na.cor, '#6B7280') as cor,
      COUNT(rc.id) as quantidade
    FROM resultados_consolidados rc
    LEFT JOIN niveis_aprendizagem na ON rc.nivel_aprendizagem_id = na.id
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      ${serieFilter}
    GROUP BY na.nome, na.cor, na.ordem
    ORDER BY na.ordem NULLS LAST
  `;

  // Query 7: Notas para distribuição
  const notasQuery = `
    SELECT media_aluno as nota
    FROM resultados_consolidados
    WHERE escola_id = $1
      AND ano_letivo = $2
      AND media_aluno IS NOT NULL
      ${serieFilter}
  `;

  // Query 8: Produção Textual (apenas para Anos Iniciais - usando função utilitária)
  const incluirProducao = serieTemProducaoTextual(serie);

  const producaoQuery = incluirProducao ? `
    SELECT
      COALESCE(ROUND(AVG(rc.nota_producao)::numeric, 2), 0) as media_producao,
      COALESCE(ROUND(AVG(rc.item_producao_1)::numeric, 2), 0) as item_1,
      COALESCE(ROUND(AVG(rc.item_producao_2)::numeric, 2), 0) as item_2,
      COALESCE(ROUND(AVG(rc.item_producao_3)::numeric, 2), 0) as item_3,
      COALESCE(ROUND(AVG(rc.item_producao_4)::numeric, 2), 0) as item_4,
      COALESCE(ROUND(AVG(rc.item_producao_5)::numeric, 2), 0) as item_5,
      COALESCE(ROUND(AVG(rc.item_producao_6)::numeric, 2), 0) as item_6,
      COALESCE(ROUND(AVG(rc.item_producao_7)::numeric, 2), 0) as item_7,
      COALESCE(ROUND(AVG(rc.item_producao_8)::numeric, 2), 0) as item_8
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      AND rc.serie IN ('2º Ano', '3º Ano', '5º Ano')
      ${serieFilter}
  ` : null;

  // Query 9: Comparativo com Polo
  const comparativoPoloQuery = `
    WITH media_escola AS (
      SELECT COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media
      FROM resultados_consolidados rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2 ${serieFilter}
    ),
    media_polo AS (
      SELECT COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media
      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = (SELECT polo_id FROM escolas WHERE id = $1)
        AND rc.ano_letivo = $2 ${serieFilter}
    ),
    ranking AS (
      SELECT
        e.id,
        RANK() OVER (ORDER BY AVG(rc.media_aluno) DESC NULLS LAST) as posicao,
        COUNT(*) OVER () as total_escolas
      FROM escolas e
      LEFT JOIN resultados_consolidados rc ON e.id = rc.escola_id
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

    // Processar questões
    const analise_questoes: AnaliseQuestao[] = questoesResult.rows.map(row => {
      const percentual = parseFloat(row.percentual_acerto) || 0;
      return {
        questao_id: row.questao_id,
        numero: parseInt(row.numero) || 0,
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

    // Processar produção textual (se aplicável)
    let producao_textual: ProducaoTextual | undefined;
    if (producaoResult && producaoResult.rows.length > 0) {
      const prodRow = producaoResult.rows[0];
      const mediaProducao = parseFloat(prodRow.media_producao) || 0;

      // Só inclui se houver dados de produção
      if (mediaProducao > 0) {
        producao_textual = {
          media_geral: mediaProducao,
          itens: [
            { codigo: 'ITEM_1', nome: 'Adequação ao tema', media: parseFloat(prodRow.item_1) || 0 },
            { codigo: 'ITEM_2', nome: 'Adequação ao gênero', media: parseFloat(prodRow.item_2) || 0 },
            { codigo: 'ITEM_3', nome: 'Coesão e coerência', media: parseFloat(prodRow.item_3) || 0 },
            { codigo: 'ITEM_4', nome: 'Registro linguístico', media: parseFloat(prodRow.item_4) || 0 },
            { codigo: 'ITEM_5', nome: 'Convenções da escrita', media: parseFloat(prodRow.item_5) || 0 },
            { codigo: 'ITEM_6', nome: 'Segmentação', media: parseFloat(prodRow.item_6) || 0 },
            { codigo: 'ITEM_7', nome: 'Vocabulário', media: parseFloat(prodRow.item_7) || 0 },
            { codigo: 'ITEM_8', nome: 'Legibilidade', media: parseFloat(prodRow.item_8) || 0 }
          ]
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
      comparativo_polo
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

  // Query 2: Estatísticas gerais do polo
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(rc.id) as total_avaliacoes,
      COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media_geral,
      COALESCE(ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca IS NULL THEN 1 END)::decimal /
         NULLIF(COUNT(rc.id), 0) * 100)::numeric, 1
      ), 0) as taxa_participacao
    FROM resultados_consolidados rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1
      AND rc.ano_letivo = $2
      ${serieFilter}
  `;

  // Query 3: Desempenho por disciplina do polo
  // CH e CN só são avaliados em 8º e 9º Ano (usando função utilitária)
  const incluirCHCN = serieTemCHCN(serie);

  const disciplinasQuery = `
    WITH disciplinas AS (
      SELECT
        'LP' as disciplina,
        'Língua Portuguesa' as disciplina_nome,
        AVG(rc.nota_lp) as media,
        SUM(rc.total_acertos_lp) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      UNION ALL

      SELECT
        'MAT' as disciplina,
        'Matemática' as disciplina_nome,
        AVG(rc.nota_mat) as media,
        SUM(rc.total_acertos_mat) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2 ${serieFilter}

      ${incluirCHCN ? `
      UNION ALL

      SELECT
        'CH' as disciplina,
        'Ciências Humanas' as disciplina_nome,
        AVG(rc.nota_ch) as media,
        SUM(rc.total_acertos_ch) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.polo_id = $1 AND rc.ano_letivo = $2
        AND rc.serie IN ('8º Ano', '9º Ano')
        ${serieFilter}

      UNION ALL

      SELECT
        'CN' as disciplina,
        'Ciências da Natureza' as disciplina_nome,
        AVG(rc.nota_cn) as media,
        SUM(rc.total_acertos_cn) as acertos_total,
        COUNT(rc.id) as total_registros
      FROM resultados_consolidados rc
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

  // Query 4: Escolas do polo com ranking
  const escolasQuery = `
    SELECT
      e.id,
      e.nome,
      COALESCE(e.codigo, '') as codigo,
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media_geral,
      RANK() OVER (ORDER BY AVG(rc.media_aluno) DESC NULLS LAST) as ranking_posicao
    FROM escolas e
    LEFT JOIN resultados_consolidados rc ON e.id = rc.escola_id
      AND rc.ano_letivo = $2
      ${serieFilter}
    WHERE e.polo_id = $1 AND e.ativo = true
    GROUP BY e.id, e.nome, e.codigo
    ORDER BY media_geral DESC NULLS LAST
  `;

  // Query 5: Comparativo entre escolas
  const comparativoQuery = `
    SELECT
      e.nome as escola_nome,
      COALESCE(ROUND(AVG(rc.nota_lp)::numeric, 2), 0) as lp,
      COALESCE(ROUND(AVG(rc.nota_mat)::numeric, 2), 0) as mat,
      COALESCE(ROUND(AVG(rc.nota_ch)::numeric, 2), 0) as ch,
      COALESCE(ROUND(AVG(rc.nota_cn)::numeric, 2), 0) as cn,
      COALESCE(ROUND(AVG(rc.media_aluno)::numeric, 2), 0) as media
    FROM escolas e
    LEFT JOIN resultados_consolidados rc ON e.id = rc.escola_id
      AND rc.ano_letivo = $2
      ${serieFilter}
    WHERE e.polo_id = $1 AND e.ativo = true
    GROUP BY e.id, e.nome
    HAVING COUNT(rc.id) > 0
    ORDER BY media DESC
  `;

  // Query 6: Análise de questões do polo
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      COALESCE(q.numero_questao, 0) as numero,
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
    WHERE q.ativo = true AND e.polo_id = $1
      ${serie ? 'AND q.serie_aplicavel = $3' : ''}
    GROUP BY q.id, q.numero_questao, q.disciplina
    HAVING COUNT(rp.id) > 0
    ORDER BY q.disciplina, q.numero_questao
    LIMIT 100
  `;

  // Query 7: Notas para distribuição
  const notasQuery = `
    SELECT rc.media_aluno as nota
    FROM resultados_consolidados rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    WHERE e.polo_id = $1
      AND rc.ano_letivo = $2
      AND rc.media_aluno IS NOT NULL
      ${serieFilter}
  `;

  // Query 8: Distribuição por níveis de aprendizagem
  const niveisQuery = `
    SELECT
      COALESCE(na.nome, 'Não classificado') as nivel,
      COALESCE(na.cor, '#6B7280') as cor,
      COUNT(rc.id) as quantidade
    FROM resultados_consolidados rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN niveis_aprendizagem na ON rc.nivel_aprendizagem_id = na.id
    WHERE e.polo_id = $1 AND rc.ano_letivo = $2
      ${serieFilter}
    GROUP BY na.nome, na.cor, na.ordem
    ORDER BY na.ordem NULLS LAST
  `;

  // Query 9: Produção Textual (apenas para Anos Iniciais - usando função utilitária)
  const incluirProducao = serieTemProducaoTextual(serie);

  const producaoQuery = incluirProducao ? `
    SELECT
      COALESCE(ROUND(AVG(rc.nota_producao)::numeric, 2), 0) as media_producao,
      COALESCE(ROUND(AVG(rc.item_producao_1)::numeric, 2), 0) as item_1,
      COALESCE(ROUND(AVG(rc.item_producao_2)::numeric, 2), 0) as item_2,
      COALESCE(ROUND(AVG(rc.item_producao_3)::numeric, 2), 0) as item_3,
      COALESCE(ROUND(AVG(rc.item_producao_4)::numeric, 2), 0) as item_4,
      COALESCE(ROUND(AVG(rc.item_producao_5)::numeric, 2), 0) as item_5,
      COALESCE(ROUND(AVG(rc.item_producao_6)::numeric, 2), 0) as item_6,
      COALESCE(ROUND(AVG(rc.item_producao_7)::numeric, 2), 0) as item_7,
      COALESCE(ROUND(AVG(rc.item_producao_8)::numeric, 2), 0) as item_8
    FROM resultados_consolidados rc
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

    // Processar questões
    const analise_questoes: AnaliseQuestao[] = questoesResult.rows.map(row => {
      const percentual = parseFloat(row.percentual_acerto) || 0;
      return {
        questao_id: row.questao_id,
        numero: parseInt(row.numero) || 0,
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

    // Processar produção textual (se aplicável)
    let producao_textual: ProducaoTextual | undefined;
    if (producaoResult && producaoResult.rows.length > 0) {
      const prodRow = producaoResult.rows[0];
      const mediaProducao = parseFloat(prodRow.media_producao) || 0;

      // Só inclui se houver dados de produção
      if (mediaProducao > 0) {
        producao_textual = {
          media_geral: mediaProducao,
          itens: [
            { codigo: 'ITEM_1', nome: 'Adequação ao tema', media: parseFloat(prodRow.item_1) || 0 },
            { codigo: 'ITEM_2', nome: 'Adequação ao gênero', media: parseFloat(prodRow.item_2) || 0 },
            { codigo: 'ITEM_3', nome: 'Coesão e coerência', media: parseFloat(prodRow.item_3) || 0 },
            { codigo: 'ITEM_4', nome: 'Registro linguístico', media: parseFloat(prodRow.item_4) || 0 },
            { codigo: 'ITEM_5', nome: 'Convenções da escrita', media: parseFloat(prodRow.item_5) || 0 },
            { codigo: 'ITEM_6', nome: 'Segmentação', media: parseFloat(prodRow.item_6) || 0 },
            { codigo: 'ITEM_7', nome: 'Vocabulário', media: parseFloat(prodRow.item_7) || 0 },
            { codigo: 'ITEM_8', nome: 'Legibilidade', media: parseFloat(prodRow.item_8) || 0 }
          ]
        };
      }
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
      distribuicao_niveis
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
