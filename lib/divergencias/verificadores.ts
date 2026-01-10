// SISAM - Verificadores de Divergências
// Funções que executam queries SQL para identificar inconsistências no banco
// Considera a configuração específica de cada série (disciplinas e questões)

import pool from '@/database/connection'
import {
  Divergencia,
  DivergenciaDetalhe,
  ResumoDivergencias,
  ResultadoVerificacao,
  CONFIGURACOES_DIVERGENCIAS,
  TipoDivergencia
} from './tipos'

// Interface para configuração de série
interface ConfigSerie {
  serie: string
  nome_serie: string
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  total_questoes_objetivas: number
  tem_producao_textual: boolean
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  peso_lp: number
  peso_mat: number
  peso_ch: number
  peso_cn: number
  peso_producao: number
}

// Cache de configurações de séries
let cacheConfigSeries: Map<string, ConfigSerie> | null = null

/**
 * Carrega configurações de todas as séries do banco
 */
async function carregarConfigSeries(): Promise<Map<string, ConfigSerie>> {
  if (cacheConfigSeries) return cacheConfigSeries

  try {
    const result = await pool.query(`
      SELECT serie, nome_serie,
             qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
             total_questoes_objetivas, tem_producao_textual, qtd_itens_producao,
             avalia_lp, avalia_mat, avalia_ch, avalia_cn,
             peso_lp, peso_mat, peso_ch, peso_cn, peso_producao
      FROM configuracao_series WHERE ativo = true
    `)

    cacheConfigSeries = new Map()
    result.rows.forEach((row: any) => {
      cacheConfigSeries!.set(row.serie, {
        ...row,
        peso_lp: parseFloat(row.peso_lp) || 1,
        peso_mat: parseFloat(row.peso_mat) || 1,
        peso_ch: parseFloat(row.peso_ch) || 1,
        peso_cn: parseFloat(row.peso_cn) || 1,
        peso_producao: parseFloat(row.peso_producao) || 1
      })
    })
    return cacheConfigSeries
  } catch (error) {
    console.error('Erro ao carregar configurações de séries:', error)
    return new Map()
  }
}

/**
 * Extrai o número da série (ex: "8º Ano" -> "8")
 */
function extrairNumeroSerie(serie: string | null): string | null {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  return match ? match[1] : null
}

// ============================================
// VERIFICAÇÕES CRÍTICAS
// ============================================

/**
 * Verifica alunos duplicados (mesmo código)
 */
export async function verificarAlunosDuplicados(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_duplicados

    // Query para encontrar códigos duplicados
    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.escola_id, e.nome as escola_nome,
             COUNT(*) OVER (PARTITION BY a.codigo) as duplicatas
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.codigo IS NOT NULL AND a.codigo != ''
    `)

    const detalhes: DivergenciaDetalhe[] = result.rows
      .filter((row: any) => parseInt(row.duplicatas) > 1)
      .map((row: any) => ({
        id: row.id,
        entidade: 'aluno',
        entidadeId: row.id,
        codigo: row.codigo,
        nome: row.nome,
        escola: row.escola_nome || 'Sem escola',
        escolaId: row.escola_id,
        descricaoProblema: `Código "${row.codigo}" duplicado`,
        sugestaoCorrecao: 'Mesclar registros ou excluir duplicata'
      }))

    if (detalhes.length === 0) return null

    return {
      id: 'alunos_duplicados',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar alunos duplicados:', error)
    return null
  }
}

/**
 * Verifica alunos sem escola válida
 */
export async function verificarAlunosOrfaos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_orfaos

    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.serie, a.escola_id
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.ativo = true AND (a.escola_id IS NULL OR e.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'aluno',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      descricaoProblema: 'Aluno sem escola válida vinculada',
      sugestaoCorrecao: 'Vincular a uma escola ou excluir o registro'
    }))

    return {
      id: 'alunos_orfaos',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar alunos órfãos:', error)
    return null
  }
}

/**
 * Verifica resultados sem aluno ou escola correspondente
 */
export async function verificarResultadosOrfaos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.resultados_orfaos

    // Verificar resultados de provas com aluno_id NULL
    const result = await pool.query(`
      SELECT id, aluno_id, escola_id, ano_letivo, serie, disciplina
      FROM resultados_provas
      WHERE aluno_id IS NULL
      LIMIT 100
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'resultado_prova',
      entidadeId: row.id,
      anoLetivo: row.ano_letivo,
      serie: row.serie,
      descricaoProblema: 'Resultado de prova sem aluno vinculado',
      dadosExtras: { disciplina: row.disciplina },
      sugestaoCorrecao: 'Vincular ao aluno correto ou remover'
    }))

    return {
      id: 'resultados_orfaos',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar resultados órfãos:', error)
    return null
  }
}

/**
 * Verifica escolas sem polo válido
 */
export async function verificarEscolasSemPolo(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.escolas_sem_polo

    const result = await pool.query(`
      SELECT e.id, e.nome, e.codigo, e.polo_id
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true AND (e.polo_id IS NULL OR p.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'escola',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      descricaoProblema: 'Escola sem polo válido vinculado',
      sugestaoCorrecao: 'Vincular a um polo existente'
    }))

    return {
      id: 'escolas_sem_polo',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar escolas sem polo:', error)
    return null
  }
}

/**
 * Verifica turmas sem escola válida
 */
export async function verificarTurmasSemEscola(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.turmas_sem_escola

    const result = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.escola_id, t.serie, t.ano_letivo
      FROM turmas t
      LEFT JOIN escolas e ON t.escola_id = e.id
      WHERE t.ativo = true AND (t.escola_id IS NULL OR e.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'turma',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      anoLetivo: row.ano_letivo,
      descricaoProblema: 'Turma sem escola válida vinculada',
      sugestaoCorrecao: 'Vincular a uma escola ou excluir turma'
    }))

    return {
      id: 'turmas_sem_escola',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar turmas sem escola:', error)
    return null
  }
}

// ============================================
// VERIFICAÇÕES IMPORTANTES
// ============================================

/**
 * Verifica médias calculadas incorretamente
 */
export async function verificarMediasInconsistentes(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.medias_inconsistentes

    const result = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
             rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.media_aluno,
             a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.media_aluno IS NOT NULL
    `)

    const detalhes: DivergenciaDetalhe[] = []

    result.rows.forEach((r: any) => {
      const notas = [r.nota_lp, r.nota_mat, r.nota_ch, r.nota_cn].filter(n => n !== null && n !== undefined)
      if (notas.length === 0) return

      const mediaCalculada = notas.reduce((a: number, b: any) => a + (parseFloat(String(b)) || 0), 0) / notas.length
      const mediaArmazenada = parseFloat(r.media_aluno) || 0

      if (Math.abs(mediaCalculada - mediaArmazenada) > 0.01) {
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
          descricaoProblema: `Média armazenada (${mediaArmazenada?.toFixed(2)}) diferente da calculada (${mediaCalculada.toFixed(2)})`,
          valorAtual: mediaArmazenada,
          valorEsperado: Number(mediaCalculada.toFixed(2)),
          sugestaoCorrecao: 'Recalcular média do aluno'
        })
      }
    })

    if (detalhes.length === 0) return null

    return { id: 'medias_inconsistentes', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar médias inconsistentes:', error)
    return null
  }
}

/**
 * Verifica notas fora do intervalo válido (0-10)
 */
export async function verificarNotasForaRange(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.notas_fora_range

    const result = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
             rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.media_aluno,
             a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE (rc.nota_lp IS NOT NULL AND (rc.nota_lp < 0 OR rc.nota_lp > 10))
         OR (rc.nota_mat IS NOT NULL AND (rc.nota_mat < 0 OR rc.nota_mat > 10))
         OR (rc.nota_ch IS NOT NULL AND (rc.nota_ch < 0 OR rc.nota_ch > 10))
         OR (rc.nota_cn IS NOT NULL AND (rc.nota_cn < 0 OR rc.nota_cn > 10))
         OR (rc.media_aluno IS NOT NULL AND (rc.media_aluno < 0 OR rc.media_aluno > 10))
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = []
    result.rows.forEach((r: any) => {
      const campos = [
        { nome: 'nota_lp', valor: r.nota_lp, label: 'Nota LP' },
        { nome: 'nota_mat', valor: r.nota_mat, label: 'Nota MAT' },
        { nome: 'nota_ch', valor: r.nota_ch, label: 'Nota CH' },
        { nome: 'nota_cn', valor: r.nota_cn, label: 'Nota CN' },
        { nome: 'media_aluno', valor: r.media_aluno, label: 'Média' }
      ]
      campos.forEach(campo => {
        if (campo.valor !== null && (campo.valor < 0 || campo.valor > 10)) {
          detalhes.push({
            id: `${r.id}_${campo.nome}`,
            entidade: 'resultado_consolidado',
            entidadeId: r.id,
            nome: r.aluno_nome,
            codigo: r.aluno_codigo,
            escola: r.escola_nome,
            escolaId: r.escola_id,
            serie: r.serie,
            anoLetivo: r.ano_letivo,
            descricaoProblema: `${campo.label} com valor inválido: ${campo.valor}`,
            valorAtual: campo.valor,
            valorEsperado: 'Entre 0 e 10',
            dadosExtras: { campo: campo.nome },
            sugestaoCorrecao: 'Corrigir nota para valor válido'
          })
        }
      })
    })

    if (detalhes.length === 0) return null
    return { id: 'notas_fora_range', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar notas fora do range:', error)
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

/**
 * Verifica séries não configuradas
 */
export async function verificarSeriesNaoConfiguradas(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.serie_nao_configurada
    const result = await pool.query(`
      SELECT DISTINCT serie FROM (
        SELECT serie FROM alunos WHERE serie IS NOT NULL
        UNION SELECT serie FROM resultados_consolidados WHERE serie IS NOT NULL
      ) AS series_usadas
      WHERE serie NOT IN (SELECT serie FROM configuracao_series WHERE serie IS NOT NULL)
    `)
    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: `serie_${r.serie}`,
      entidade: 'serie',
      entidadeId: r.serie,
      nome: r.serie,
      descricaoProblema: `Série "${r.serie}" está sendo usada mas não possui configuração`,
      sugestaoCorrecao: 'Configurar série em Configuração de Séries'
    }))

    return { id: 'serie_nao_configurada', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar séries não configuradas:', error)
    return null
  }
}

// ============================================
// VERIFICAÇÕES DE AVISO
// ============================================

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

// ============================================
// VERIFICAÇÕES INFORMATIVAS
// ============================================

/**
 * Verifica alunos sem resultados
 */
export async function verificarAlunosSemResultados(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_sem_resultados

    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.serie, a.escola_id, e.nome as escola_nome
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id
      WHERE a.ativo = true AND rc.id IS NULL
      LIMIT 100
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
      serie: r.serie,
      descricaoProblema: 'Aluno cadastrado sem nenhum resultado de prova',
      sugestaoCorrecao: 'Importar resultados ou verificar se aluno está correto'
    }))

    return { id: 'alunos_sem_resultados', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar alunos sem resultados:', error)
    return null
  }
}

/**
 * Verifica escolas sem alunos
 */
export async function verificarEscolasSemAlunos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.escolas_sem_alunos

    const result = await pool.query(`
      SELECT e.id, e.nome, e.codigo, e.polo_id, p.nome as polo_nome
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN alunos a ON e.id = a.escola_id
      WHERE e.ativo = true
      GROUP BY e.id, e.nome, e.codigo, e.polo_id, p.nome
      HAVING COUNT(a.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'escola',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      polo: r.polo_nome,
      poloId: r.polo_id,
      descricaoProblema: 'Escola ativa sem nenhum aluno cadastrado',
      sugestaoCorrecao: 'Cadastrar alunos ou inativar escola'
    }))

    return { id: 'escolas_sem_alunos', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar escolas sem alunos:', error)
    return null
  }
}

/**
 * Verifica polos sem escolas
 */
export async function verificarPolosSemEscolas(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.polos_sem_escolas

    const result = await pool.query(`
      SELECT p.id, p.nome, p.codigo
      FROM polos p
      LEFT JOIN escolas e ON p.id = e.polo_id
      WHERE p.ativo = true
      GROUP BY p.id, p.nome, p.codigo
      HAVING COUNT(e.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'polo',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      descricaoProblema: 'Polo ativo sem nenhuma escola vinculada',
      sugestaoCorrecao: 'Vincular escolas ou inativar polo'
    }))

    return { id: 'polos_sem_escolas', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar polos sem escolas:', error)
    return null
  }
}

/**
 * Verifica turmas vazias
 */
export async function verificarTurmasVazias(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.turmas_vazias

    const result = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id, e.nome as escola_nome
      FROM turmas t
      LEFT JOIN escolas e ON t.escola_id = e.id
      LEFT JOIN alunos a ON t.id = a.turma_id
      WHERE t.ativo = true
      GROUP BY t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id, e.nome
      HAVING COUNT(a.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'turma',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      escola: r.escola_nome,
      escolaId: r.escola_id,
      serie: r.serie,
      anoLetivo: r.ano_letivo,
      descricaoProblema: 'Turma ativa sem nenhum aluno vinculado',
      sugestaoCorrecao: 'Vincular alunos ou inativar turma'
    }))

    return { id: 'turmas_vazias', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar turmas vazias:', error)
    return null
  }
}

/**
 * Executa todas as verificações e retorna resultado consolidado
 */
export async function executarTodasVerificacoes(): Promise<ResultadoVerificacao> {
  const divergencias: Divergencia[] = []

  const [
    // Críticas
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola,
    // Importantes
    mediasInconsistentes,
    notasForaRange,
    questoesSemGabarito,
    seriesNaoConfiguradas,
    // Avisos
    anoLetivoInvalido,
    presencaInconsistente,
    serieAlunoTurmaDivergente,
    importacoesErroPendente,
    // Informativos
    alunosSemResultados,
    escolasSemAlunos,
    polosSemEscolas,
    turmasVazias
  ] = await Promise.all([
    // Críticas
    verificarAlunosDuplicados(),
    verificarAlunosOrfaos(),
    verificarResultadosOrfaos(),
    verificarEscolasSemPolo(),
    verificarTurmasSemEscola(),
    // Importantes
    verificarMediasInconsistentes(),
    verificarNotasForaRange(),
    verificarQuestoesSemGabarito(),
    verificarSeriesNaoConfiguradas(),
    // Avisos
    verificarAnoLetivoInvalido(),
    verificarPresencaInconsistente(),
    verificarSerieAlunoTurmaDivergente(),
    verificarImportacoesErroPendente(),
    // Informativos
    verificarAlunosSemResultados(),
    verificarEscolasSemAlunos(),
    verificarPolosSemEscolas(),
    verificarTurmasVazias()
  ])

  const resultados = [
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola,
    mediasInconsistentes,
    notasForaRange,
    questoesSemGabarito,
    seriesNaoConfiguradas,
    anoLetivoInvalido,
    presencaInconsistente,
    serieAlunoTurmaDivergente,
    importacoesErroPendente,
    alunosSemResultados,
    escolasSemAlunos,
    polosSemEscolas,
    turmasVazias
  ]

  resultados.forEach(r => {
    if (r) divergencias.push(r)
  })

  const resumo: ResumoDivergencias = {
    criticos: divergencias.filter(d => d.nivel === 'critico').reduce((acc, d) => acc + d.quantidade, 0),
    importantes: divergencias.filter(d => d.nivel === 'importante').reduce((acc, d) => acc + d.quantidade, 0),
    avisos: divergencias.filter(d => d.nivel === 'aviso').reduce((acc, d) => acc + d.quantidade, 0),
    informativos: divergencias.filter(d => d.nivel === 'informativo').reduce((acc, d) => acc + d.quantidade, 0),
    total: divergencias.reduce((acc, d) => acc + d.quantidade, 0),
    ultimaVerificacao: new Date().toISOString()
  }

  return {
    resumo,
    divergencias,
    dataVerificacao: new Date().toISOString()
  }
}

/**
 * Verifica apenas divergências críticas (para alerta no login)
 */
export async function verificarDivergenciasCriticas(): Promise<number> {
  const [
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola
  ] = await Promise.all([
    verificarAlunosDuplicados(),
    verificarAlunosOrfaos(),
    verificarResultadosOrfaos(),
    verificarEscolasSemPolo(),
    verificarTurmasSemEscola()
  ])

  let total = 0
  if (alunosDuplicados) total += alunosDuplicados.quantidade
  if (alunosOrfaos) total += alunosOrfaos.quantidade
  if (resultadosOrfaos) total += resultadosOrfaos.quantidade
  if (escolasSemPolo) total += escolasSemPolo.quantidade
  if (turmasSemEscola) total += turmasSemEscola.quantidade

  return total
}
