// SISAM - Verificadores de Divergências: Regras de Negócio
// Funções que verificam conformidade com regras de negócio do sistema

import pool from '@/database/connection'
import {
  Divergencia,
  DivergenciaDetalhe,
  CONFIGURACOES_DIVERGENCIAS
} from './tipos'

/**
 * Verifica nível de aprendizagem incorreto
 * USA A MÉDIA RECALCULADA (mesma lógica do Painel de Dados)
 * O nível deve corresponder à média calculada conforme as faixas configuradas
 */
export async function verificarNivelAprendizagemIncorreto(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.nivel_aprendizagem_errado

    // Buscar níveis de aprendizagem
    const niveisResult = await pool.query(`
      SELECT id, codigo, nome, nota_minima, nota_maxima, serie_aplicavel
      FROM niveis_aprendizagem WHERE ativo = true ORDER BY ordem
    `)
    const niveis = niveisResult.rows

    if (niveis.length === 0) return null

    // Buscar resultados de Anos Iniciais com média recalculada
    // MESMA LÓGICA DO PAINEL DE DADOS
    const result = await pool.query(`
      SELECT
        rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
        rc.nivel_aprendizagem, rc.nivel_aprendizagem_id,
        rc.nota_lp, rc.nota_mat, rc.nota_producao,
        a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome,
        REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') as numero_serie,
        -- Média calculada dinamicamente (MESMA LÓGICA DO PAINEL DE DADOS)
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
          2
        ) as media_calculada
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.presenca = 'P'
        AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    `)

    const detalhes: DivergenciaDetalhe[] = []

    result.rows.forEach((r: any) => {
      const numeroSerie = r.numero_serie
      const media = parseFloat(r.media_calculada) || 0

      // Se não tem média válida, pular
      if (media === 0 || isNaN(media)) return

      // Encontrar o nível correto para a média calculada
      const nivelCorreto = niveis.find(n =>
        media >= parseFloat(n.nota_minima) &&
        media <= parseFloat(n.nota_maxima) &&
        (n.serie_aplicavel === null || n.serie_aplicavel === numeroSerie)
      )

      if (!nivelCorreto) return

      // Verificar se o nível armazenado está correto
      const nivelArmazenado = r.nivel_aprendizagem
      if (nivelArmazenado && nivelArmazenado !== nivelCorreto.nome) {
        detalhes.push({
          id: r.id,
          entidade: 'resultado_consolidado',
          entidadeId: r.id,
          nome: r.aluno_nome,
          codigo: r.aluno_codigo,
          escola: r.escola_nome,
          escolaId: r.escola_id,
          serie: r.serie,
          anoLetivo: r.ano_letivo,
          descricaoProblema: `Nível "${nivelArmazenado}" incorreto para média ${media.toFixed(2)}`,
          valorAtual: nivelArmazenado,
          valorEsperado: nivelCorreto.nome,
          dadosExtras: { mediaCalculada: media.toFixed(2) },
          sugestaoCorrecao: `Alterar para "${nivelCorreto.nome}"`
        })
      } else if (!nivelArmazenado) {
        // Série deveria ter nível mas não tem
        detalhes.push({
          id: r.id,
          entidade: 'resultado_consolidado',
          entidadeId: r.id,
          nome: r.aluno_nome,
          codigo: r.aluno_codigo,
          escola: r.escola_nome,
          escolaId: r.escola_id,
          serie: r.serie,
          anoLetivo: r.ano_letivo,
          descricaoProblema: `Sem nível de aprendizagem definido para média ${media.toFixed(2)}`,
          valorAtual: 'Não definido',
          valorEsperado: nivelCorreto.nome,
          dadosExtras: { mediaCalculada: media.toFixed(2) },
          sugestaoCorrecao: `Definir como "${nivelCorreto.nome}"`
        })
      }
    })

    if (detalhes.length === 0) return null

    return { id: 'nivel_aprendizagem_errado', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar nível de aprendizagem:', error)
    return null
  }
}

/**
 * Verifica ano letivo inválido
 */
export async function verificarAnoLetivoInvalido(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.ano_letivo_invalido
    const anoAtual = new Date().getFullYear()

    const result = await pool.query(`
      SELECT 'aluno' as tipo, a.id, a.codigo, a.nome, a.ano_letivo, e.nome as escola_nome, NULL as serie
      FROM alunos a LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.ano_letivo IS NOT NULL AND a.ano_letivo !~ '^[0-9]{4}$'
      UNION ALL
      SELECT 'resultado' as tipo, rc.id, al.codigo, al.nome, rc.ano_letivo, e.nome as escola_nome, rc.serie
      FROM resultados_consolidados rc
      LEFT JOIN alunos al ON rc.aluno_id = al.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.ano_letivo IS NOT NULL AND rc.ano_letivo !~ '^[0-9]{4}$'
      LIMIT 100
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: `${r.tipo}_${r.id}`,
      entidade: r.tipo === 'aluno' ? 'aluno' : 'resultado_consolidado',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      escola: r.escola_nome,
      serie: r.serie,
      anoLetivo: r.ano_letivo,
      descricaoProblema: `Ano letivo inválido: "${r.ano_letivo}"`,
      valorAtual: r.ano_letivo,
      valorEsperado: `Formato YYYY (2000-${anoAtual + 1})`,
      sugestaoCorrecao: 'Corrigir ano letivo para formato YYYY válido'
    }))

    return { id: 'ano_letivo_invalido', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar ano letivo inválido:', error)
    return null
  }
}

/**
 * Verifica presença inconsistente
 */
export async function verificarPresencaInconsistente(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.presenca_inconsistente

    const result = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie, rc.presenca,
             a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.presenca = 'F' AND (
        COALESCE(rc.total_acertos_lp, 0) + COALESCE(rc.total_acertos_mat, 0) +
        COALESCE(rc.total_acertos_ch, 0) + COALESCE(rc.total_acertos_cn, 0)
      ) > 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'resultado_consolidado',
      entidadeId: r.id,
      nome: r.aluno_nome,
      codigo: r.aluno_codigo,
      escola: r.escola_nome,
      escolaId: r.escola_id,
      serie: r.serie,
      anoLetivo: r.ano_letivo,
      descricaoProblema: 'Aluno marcado como faltante mas possui acertos registrados',
      valorAtual: 'Presença: F (Faltou)',
      valorEsperado: 'Presença: P (Presente)',
      sugestaoCorrecao: 'Alterar presença para P ou limpar acertos'
    }))

    return { id: 'presenca_inconsistente', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar presença inconsistente:', error)
    return null
  }
}

/**
 * Verifica série aluno diferente da turma
 */
export async function verificarSerieAlunoTurmaDivergente(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.serie_aluno_turma_divergente

    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.serie as serie_aluno, a.escola_id, a.turma_id,
             e.nome as escola_nome, t.nome as turma_nome, t.serie as serie_turma
      FROM alunos a
      INNER JOIN turmas t ON a.turma_id = t.id
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.serie IS NOT NULL AND t.serie IS NOT NULL AND a.serie != t.serie
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'aluno',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      escola: r.escola_nome,
      escolaId: r.escola_id,
      turma: r.turma_nome,
      turmaId: r.turma_id,
      serie: r.serie_aluno,
      descricaoProblema: `Aluno na série "${r.serie_aluno}" mas turma é "${r.serie_turma}"`,
      valorAtual: r.serie_aluno,
      valorEsperado: r.serie_turma,
      sugestaoCorrecao: 'Corrigir série do aluno ou trocar de turma'
    }))

    return { id: 'serie_aluno_turma_divergente', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar série aluno/turma divergente:', error)
    return null
  }
}

/**
 * Verifica importações com erro pendente
 */
export async function verificarImportacoesErroPendente(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.importacoes_erro_pendente

    const result = await pool.query(`
      SELECT i.id, i.nome_arquivo, i.status, i.total_linhas, i.linhas_processadas,
             i.linhas_com_erro, i.criado_em, u.nome as usuario_nome
      FROM importacoes i LEFT JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.status = 'erro' OR (i.status = 'processando' AND i.criado_em < NOW() - INTERVAL '1 day')
      ORDER BY i.criado_em DESC LIMIT 50
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'importacao',
      entidadeId: r.id,
      nome: r.nome_arquivo,
      descricaoProblema: r.status === 'erro'
        ? `Importação "${r.nome_arquivo}" com erro`
        : `Importação "${r.nome_arquivo}" processando há mais de 24h`,
      valorAtual: r.status,
      dadosExtras: { totalLinhas: r.total_linhas, processadas: r.linhas_processadas, comErro: r.linhas_com_erro, usuario: r.usuario_nome },
      sugestaoCorrecao: 'Cancelar importação e tentar novamente'
    }))

    return { id: 'importacoes_erro_pendente', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar importações com erro:', error)
    return null
  }
}

/**
 * Verifica questões sem gabarito
 */
export async function verificarQuestoesSemGabarito(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.questoes_sem_gabarito
    const result = await pool.query(`
      SELECT id, codigo, descricao, disciplina, serie_aplicavel
      FROM questoes WHERE gabarito IS NULL OR gabarito = ''
    `)
    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((q: any) => ({
      id: q.id,
      entidade: 'questao',
      entidadeId: q.id,
      codigo: q.codigo,
      nome: q.descricao?.substring(0, 50) || 'Sem descrição',
      serie: q.serie_aplicavel,
      descricaoProblema: `Questão ${q.codigo || 'sem código'} sem gabarito definido`,
      dadosExtras: { disciplina: q.disciplina },
      sugestaoCorrecao: 'Definir gabarito (A, B, C, D ou E)'
    }))

    return { id: 'questoes_sem_gabarito', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar questões sem gabarito:', error)
    return null
  }
}
