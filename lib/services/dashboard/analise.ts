/**
 * Análise de Acertos/Erros do Dashboard
 *
 * Funções de busca de análise de acertos/erros e resumos por série.
 *
 * @module services/dashboard/analise
 */

import pool from '@/database/connection'
import { safeQuery } from '@/lib/api-helpers'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import type { QueryParamValue } from '@/lib/types'
import type {
  TaxaAcertoDisciplinaDbRow,
  TaxaAcertoGeralDbRow,
  QuestaoAcertoDbRow,
  EscolaAcertoDbRow,
  TurmaAcertoDbRow,
  ResumoQuestaoDbRow,
  ResumoEscolaDbRow,
  ResumoTurmaDbRow,
  ResumoDisciplinaDbRow,
  AnaliseAcertosErros,
  ResumosPorSerie,
} from './types'

/**
 * Busca análise de acertos/erros (resultados_provas)
 */
export async function fetchAnaliseAcertosErros(
  rpWhereClauseComPresenca: string,
  rpParams: QueryParamValue[]
): Promise<AnaliseAcertosErros> {
  const [
    taxaAcertoPorDisciplinaRows,
    taxaAcertoGeralRows,
    questoesErrosRows,
    escolasErrosRows,
    turmasErrosRows,
    questoesAcertosRows,
    escolasAcertosRows,
    turmasAcertosRows
  ] = await Promise.all([
    // Taxa de acerto por disciplina
    safeQuery<TaxaAcertoDisciplinaDbRow>(pool, `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      ORDER BY taxa_erro DESC, total_erros DESC
    `, rpParams, 'taxaAcertoPorDisciplina'),

    // Taxa de acerto geral
    safeQuery<TaxaAcertoGeralDbRow>(pool, `
      SELECT
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto_geral,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro_geral
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
    `, rpParams, 'taxaAcertoGeral'),

    // Questões com mais erros
    safeQuery<QuestaoAcertoDbRow>(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'questoesComMaisErros'),

    // Escolas com mais erros
    safeQuery<EscolaAcertoDbRow>(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'escolasComMaisErros'),

    // Turmas com mais erros
    safeQuery<TurmaAcertoDbRow>(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'turmasComMaisErros'),

    // Questões com mais acertos
    safeQuery<QuestaoAcertoDbRow>(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'questoesComMaisAcertos'),

    // Escolas com mais acertos
    safeQuery<EscolaAcertoDbRow>(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'escolasComMaisAcertos'),

    // Turmas com mais acertos
    safeQuery<TurmaAcertoDbRow>(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'turmasComMaisAcertos')
  ])

  const taxaAcertoGeralRow = taxaAcertoGeralRows[0] as TaxaAcertoGeralDbRow | undefined

  return {
    taxaAcertoGeral: taxaAcertoGeralRow ? {
      total_respostas: parseDbInt(taxaAcertoGeralRow.total_respostas),
      total_acertos: parseDbInt(taxaAcertoGeralRow.total_acertos),
      total_erros: parseDbInt(taxaAcertoGeralRow.total_erros),
      taxa_acerto_geral: parseDbNumber(taxaAcertoGeralRow.taxa_acerto_geral),
      taxa_erro_geral: parseDbNumber(taxaAcertoGeralRow.taxa_erro_geral)
    } : null,
    taxaAcertoPorDisciplina: taxaAcertoPorDisciplinaRows.map((row: TaxaAcertoDisciplinaDbRow) => ({
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    questoesComMaisErros: questoesErrosRows.map((row: QuestaoAcertoDbRow) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    escolasComMaisErros: escolasErrosRows.map((row: EscolaAcertoDbRow) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmasComMaisErros: turmasErrosRows.map((row: TurmaAcertoDbRow) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    questoesComMaisAcertos: questoesAcertosRows.map((row: QuestaoAcertoDbRow) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    escolasComMaisAcertos: escolasAcertosRows.map((row: EscolaAcertoDbRow) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmasComMaisAcertos: turmasAcertosRows.map((row: TurmaAcertoDbRow) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    }))
  }
}

/**
 * Busca resumos por série para cache local no frontend
 */
export async function fetchResumosPorSerie(
  rpWhereClauseSemSerie: string,
  rpParamsSemSerie: QueryParamValue[],
  serie: string | null
): Promise<ResumosPorSerie> {
  // Somente buscar se não há filtro de série (dados de TODAS as séries para cache local)
  if (serie) {
    return { questoes: [], escolas: [], turmas: [], disciplinas: [] }
  }

  const [questoesRows, escolasRows, turmasRows, disciplinasRows] = await Promise.all([
    safeQuery<ResumoQuestaoDbRow>(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseSemSerie}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
      HAVING COUNT(*) >= 1
    `, rpParamsSemSerie, 'resumoQuestoesPorSerie'),

    safeQuery<ResumoEscolaDbRow>(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseSemSerie}
      GROUP BY e.id, e.nome, p.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
    `, rpParamsSemSerie, 'resumoEscolasPorSerie'),

    safeQuery<ResumoTurmaDbRow>(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseSemSerie}
      GROUP BY t.id, t.codigo, e.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
    `, rpParamsSemSerie, 'resumoTurmasPorSerie'),

    safeQuery<ResumoDisciplinaDbRow>(pool, `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      ${rpWhereClauseSemSerie}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
    `, rpParamsSemSerie, 'resumoDisciplinasPorSerie')
  ])

  return {
    questoes: questoesRows.map((row: ResumoQuestaoDbRow) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros)
    })),
    escolas: escolasRows.map((row: ResumoEscolaDbRow) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      serie: row.serie,
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmas: turmasRows.map((row: ResumoTurmaDbRow) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    disciplinas: disciplinasRows.map((row: ResumoDisciplinaDbRow) => ({
      disciplina: row.disciplina,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros)
    }))
  }
}
