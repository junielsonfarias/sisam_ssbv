/**
 * SISAM - Configuração de Séries
 *
 * Funções utilitárias para trabalhar com as diferentes estruturas de avaliação por série
 */

import pool from '@/database/connection'
import { ConfiguracaoSerie, NivelAprendizagem } from './types'

/** Row retornado pela query de configuração de séries */
interface ConfigSerieRow {
  id: string
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
  peso_lp: string  // PostgreSQL DECIMAL retorna como string
  peso_mat: string
  peso_ch: string
  peso_cn: string
  peso_producao: string
  usa_nivel_aprendizagem: boolean
  ativo: boolean
  criado_em: Date
  atualizado_em: Date
}

/** Row retornado pela query de níveis de aprendizagem */
interface NivelAprendizagemRow {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  cor: string | null
  nota_minima: string
  nota_maxima: string
  ordem: number
  serie_aplicavel: string | null
  ativo: boolean
  criado_em: Date
}

// Cache em memória para evitar consultas repetidas
let cacheConfigSeries: Map<string, ConfiguracaoSerie> | null = null
let cacheNiveis: NivelAprendizagem[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Extrai apenas o número da série (ex: "8º Ano" -> "8", "5º" -> "5")
 */
export function extrairNumeroSerie(serie: string | null | undefined): string | null {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  return match ? match[1] : null
}

/**
 * Carrega todas as configurações de séries do banco (com cache)
 */
export async function carregarConfigSeries(): Promise<Map<string, ConfiguracaoSerie>> {
  const agora = Date.now()

  // Retornar cache se ainda válido
  if (cacheConfigSeries && (agora - cacheTimestamp) < CACHE_TTL) {
    return cacheConfigSeries
  }

  try {
    const result = await pool.query(`
      SELECT
        id, serie, nome_serie,
        qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
        total_questoes_objetivas,
        tem_producao_textual, qtd_itens_producao,
        avalia_lp, avalia_mat, avalia_ch, avalia_cn,
        peso_lp, peso_mat, peso_ch, peso_cn, peso_producao,
        usa_nivel_aprendizagem, ativo,
        criado_em, atualizado_em
      FROM configuracao_series
      WHERE ativo = true
    `)

    cacheConfigSeries = new Map()
    result.rows.forEach((row: ConfigSerieRow) => {
      cacheConfigSeries!.set(row.serie, {
        id: row.id,
        serie: row.serie,
        nome_serie: row.nome_serie,
        qtd_questoes_lp: row.qtd_questoes_lp,
        qtd_questoes_mat: row.qtd_questoes_mat,
        qtd_questoes_ch: row.qtd_questoes_ch,
        qtd_questoes_cn: row.qtd_questoes_cn,
        total_questoes_objetivas: row.total_questoes_objetivas,
        tem_producao_textual: row.tem_producao_textual,
        qtd_itens_producao: row.qtd_itens_producao,
        avalia_lp: row.avalia_lp,
        avalia_mat: row.avalia_mat,
        avalia_ch: row.avalia_ch,
        avalia_cn: row.avalia_cn,
        peso_lp: parseFloat(row.peso_lp),
        peso_mat: parseFloat(row.peso_mat),
        peso_ch: parseFloat(row.peso_ch),
        peso_cn: parseFloat(row.peso_cn),
        peso_producao: parseFloat(row.peso_producao),
        usa_nivel_aprendizagem: row.usa_nivel_aprendizagem,
        ativo: row.ativo,
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
      })
    })

    cacheTimestamp = agora
    return cacheConfigSeries
  } catch (error) {
    console.error('Erro ao carregar configurações de séries:', error)
    // Retornar configuração padrão (8º/9º ano) em caso de erro
    return getConfigPadrao()
  }
}

/**
 * Obtém a configuração de uma série específica
 * Se não encontrar no banco, usa os valores padrão hardcoded
 */
export async function obterConfigSerie(serie: string | null | undefined): Promise<ConfiguracaoSerie | null> {
  const numeroSerie = extrairNumeroSerie(serie)
  if (!numeroSerie) return null

  const configs = await carregarConfigSeries()
  const configBanco = configs.get(numeroSerie)

  // Se encontrou no banco, retorna
  if (configBanco) {
    return configBanco
  }

  // Se não encontrou, usa o fallback padrão
  const configsPadrao = getConfigPadrao()
  return configsPadrao.get(numeroSerie) || null
}

/**
 * Retorna configuração padrão para todas as séries (fallback)
 */
function getConfigPadrao(): Map<string, ConfiguracaoSerie> {
  const map = new Map<string, ConfiguracaoSerie>()
  const agora = new Date()

  // Configuração para 2º e 3º Ano (Anos Iniciais)
  // LP: 14 questões (Q1-Q14), MAT: 14 questões (Q15-Q28)
  const configAnosIniciais23: ConfiguracaoSerie = {
    id: '',
    serie: '',
    nome_serie: '',
    qtd_questoes_lp: 14,
    qtd_questoes_mat: 14,
    qtd_questoes_ch: 0,
    qtd_questoes_cn: 0,
    total_questoes_objetivas: 28,
    tem_producao_textual: true,
    qtd_itens_producao: 8,
    avalia_lp: true,
    avalia_mat: true,
    avalia_ch: false,
    avalia_cn: false,
    peso_lp: 1,
    peso_mat: 1,
    peso_ch: 0,
    peso_cn: 0,
    peso_producao: 1,
    usa_nivel_aprendizagem: true,
    ativo: true,
    criado_em: agora,
    atualizado_em: agora,
  }

  map.set('2', { ...configAnosIniciais23, id: '2', serie: '2', nome_serie: '2º Ano' })
  map.set('3', { ...configAnosIniciais23, id: '3', serie: '3', nome_serie: '3º Ano' })

  // Configuração para 5º Ano (Anos Iniciais)
  // LP: 14 questões (Q1-Q14), MAT: 20 questões (Q15-Q34)
  const config5Ano: ConfiguracaoSerie = {
    id: '5',
    serie: '5',
    nome_serie: '5º Ano',
    qtd_questoes_lp: 14,
    qtd_questoes_mat: 20,
    qtd_questoes_ch: 0,
    qtd_questoes_cn: 0,
    total_questoes_objetivas: 34,
    tem_producao_textual: true,
    qtd_itens_producao: 8,
    avalia_lp: true,
    avalia_mat: true,
    avalia_ch: false,
    avalia_cn: false,
    peso_lp: 1,
    peso_mat: 1,
    peso_ch: 0,
    peso_cn: 0,
    peso_producao: 1,
    usa_nivel_aprendizagem: true,
    ativo: true,
    criado_em: agora,
    atualizado_em: agora,
  }

  map.set('5', config5Ano)

  // Configuração para 8º e 9º Ano (Anos Finais)
  // LP: 20, CH: 10, MAT: 20, CN: 10
  const configAnosFinais: ConfiguracaoSerie = {
    id: '',
    serie: '',
    nome_serie: '',
    qtd_questoes_lp: 20,
    qtd_questoes_mat: 20,
    qtd_questoes_ch: 10,
    qtd_questoes_cn: 10,
    total_questoes_objetivas: 60,
    tem_producao_textual: false,
    qtd_itens_producao: 0,
    avalia_lp: true,
    avalia_mat: true,
    avalia_ch: true,
    avalia_cn: true,
    peso_lp: 1,
    peso_mat: 1,
    peso_ch: 1,
    peso_cn: 1,
    peso_producao: 0,
    usa_nivel_aprendizagem: false,
    ativo: true,
    criado_em: agora,
    atualizado_em: agora,
  }

  map.set('8', { ...configAnosFinais, id: '8', serie: '8', nome_serie: '8º Ano' })
  map.set('9', { ...configAnosFinais, id: '9', serie: '9', nome_serie: '9º Ano' })

  return map
}

/**
 * Gera a estrutura de áreas/questões baseada na configuração da série
 */
export function gerarAreasQuestoes(config: ConfiguracaoSerie): { inicio: number, fim: number, area: string, disciplina: string }[] {
  const areas: { inicio: number, fim: number, area: string, disciplina: string }[] = []
  let questaoAtual = 1

  // Língua Portuguesa
  if (config.qtd_questoes_lp > 0) {
    areas.push({
      inicio: questaoAtual,
      fim: questaoAtual + config.qtd_questoes_lp - 1,
      area: 'Língua Portuguesa',
      disciplina: 'Língua Portuguesa'
    })
    questaoAtual += config.qtd_questoes_lp
  }

  // Ciências Humanas (apenas 8º e 9º ano)
  if (config.avalia_ch && config.qtd_questoes_ch > 0) {
    areas.push({
      inicio: questaoAtual,
      fim: questaoAtual + config.qtd_questoes_ch - 1,
      area: 'Ciências Humanas',
      disciplina: 'Ciências Humanas'
    })
    questaoAtual += config.qtd_questoes_ch
  }

  // Matemática
  if (config.qtd_questoes_mat > 0) {
    areas.push({
      inicio: questaoAtual,
      fim: questaoAtual + config.qtd_questoes_mat - 1,
      area: 'Matemática',
      disciplina: 'Matemática'
    })
    questaoAtual += config.qtd_questoes_mat
  }

  // Ciências da Natureza (apenas 8º e 9º ano)
  if (config.avalia_cn && config.qtd_questoes_cn > 0) {
    areas.push({
      inicio: questaoAtual,
      fim: questaoAtual + config.qtd_questoes_cn - 1,
      area: 'Ciências da Natureza',
      disciplina: 'Ciências da Natureza'
    })
  }

  return areas
}

/**
 * Carrega os níveis de aprendizagem do banco (com cache)
 */
export async function carregarNiveisAprendizagem(): Promise<NivelAprendizagem[]> {
  const agora = Date.now()

  if (cacheNiveis && (agora - cacheTimestamp) < CACHE_TTL) {
    return cacheNiveis
  }

  try {
    const result = await pool.query(`
      SELECT id, codigo, nome, descricao, cor, nota_minima, nota_maxima, ordem, serie_aplicavel, ativo
      FROM niveis_aprendizagem
      WHERE ativo = true
      ORDER BY ordem
    `)

    cacheNiveis = result.rows.map((row: NivelAprendizagemRow) => ({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      descricao: row.descricao,
      cor: row.cor,
      nota_minima: parseFloat(row.nota_minima),
      nota_maxima: parseFloat(row.nota_maxima),
      ordem: row.ordem,
      serie_aplicavel: row.serie_aplicavel,
      ativo: row.ativo,
      criado_em: row.criado_em,
    }))

    return cacheNiveis
  } catch (error) {
    console.error('Erro ao carregar níveis de aprendizagem:', error)
    return []
  }
}

/**
 * Calcula o nível de aprendizagem baseado na média
 */
export async function calcularNivelAprendizagem(media: number | null, serie?: string): Promise<{ id: string, nome: string, cor: string } | null> {
  if (media === null || media === undefined) return null

  const niveis = await carregarNiveisAprendizagem()
  const numeroSerie = extrairNumeroSerie(serie)

  // Filtrar níveis aplicáveis à série (ou gerais)
  const niveisAplicaveis = niveis.filter(n =>
    n.serie_aplicavel === null || n.serie_aplicavel === numeroSerie
  )

  // Encontrar o nível correspondente à média
  const nivel = niveisAplicaveis.find(n =>
    media >= n.nota_minima && media <= n.nota_maxima
  )

  if (nivel) {
    return {
      id: nivel.id,
      nome: nivel.nome,
      cor: nivel.cor || '#6B7280'
    }
  }

  return null
}

/**
 * Limpa o cache (útil após alterações nas configurações)
 */
export function limparCacheConfigSeries(): void {
  cacheConfigSeries = null
  cacheNiveis = null
  cacheTimestamp = 0
}

/**
 * Retorna os nomes das colunas de produção textual esperadas no Excel
 */
export function getColunasProducao(): string[] {
  return [
    // Formato sem espaço (mais comum)
    'Item1', 'Item2', 'Item3', 'Item4', 'Item5', 'Item6', 'Item7', 'Item8',
    'ITEM1', 'ITEM2', 'ITEM3', 'ITEM4', 'ITEM5', 'ITEM6', 'ITEM7', 'ITEM8',
    'item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8',
    // Formato com underscore
    'ITEM_1', 'ITEM_2', 'ITEM_3', 'ITEM_4', 'ITEM_5', 'ITEM_6', 'ITEM_7', 'ITEM_8',
    'item_1', 'item_2', 'item_3', 'item_4', 'item_5', 'item_6', 'item_7', 'item_8',
    // Formato com espaço
    'ITEM 1', 'Item 1', 'item 1',
    'ITEM 2', 'Item 2', 'item 2',
    'ITEM 3', 'Item 3', 'item 3',
    'ITEM 4', 'Item 4', 'item 4',
    'ITEM 5', 'Item 5', 'item 5',
    'ITEM 6', 'Item 6', 'item 6',
    'ITEM 7', 'Item 7', 'item 7',
    'ITEM 8', 'Item 8', 'item 8',
    // Notas de produção
    'Produção', 'PRODUÇÃO', 'producao', 'PRODUCAO',
    'Nota Produção', 'NOTA PRODUÇÃO', 'nota_producao',
  ]
}

/**
 * Extrai a nota de um item de produção do Excel
 * Suporta formatos: Item1, Item 1, ITEM_1, etc.
 * Valores aceitos:
 * - "X" ou "x" = 1 ponto (ACERTO)
 * - "-", "0", vazio = 0 pontos (ERRO)
 * - Valores numéricos = mantidos como estão
 */
export function extrairNotaProducao(linha: Record<string, unknown>, itemNumero: number): number | null {
  // Variações de nomes de colunas no Excel
  const variacoes = [
    // Formato sem espaço (ex: Item1, Item2) - mais comum nos arquivos
    `Item${itemNumero}`,
    `ITEM${itemNumero}`,
    `item${itemNumero}`,
    // Formato com espaço (ex: Item 1, Item 2)
    `Item ${itemNumero}`,
    `ITEM ${itemNumero}`,
    `item ${itemNumero}`,
    // Formato com underscore (ex: ITEM_1, item_1)
    `ITEM_${itemNumero}`,
    `Item_${itemNumero}`,
    `item_${itemNumero}`,
    // Formato abreviado (ex: I1, i1)
    `I${itemNumero}`,
    `i${itemNumero}`,
  ]

  for (const variacao of variacoes) {
    if (linha[variacao] !== undefined && linha[variacao] !== null) {
      const valorRaw = linha[variacao].toString().trim().toUpperCase()

      // Tratar valor vazio, "-" ou "0" como 0 pontos (ERRO)
      if (valorRaw === '' || valorRaw === '-' || valorRaw === '0') {
        return 0
      }

      // Tratar valor "X" como 1 ponto (ACERTO)
      if (valorRaw === 'X') {
        return 1
      }

      // Tentar converter para número (para casos com valores numéricos diretos)
      const valorNumerico = linha[variacao].toString().replace(',', '.').trim()
      const nota = parseFloat(valorNumerico)
      return isNaN(nota) ? null : nota
    }
  }

  return null
}

/**
 * Calcula a média dos itens de produção
 */
export function calcularMediaProducao(itens: (number | null)[]): number | null {
  const itensValidos = itens.filter(i => i !== null) as number[]
  if (itensValidos.length === 0) return null

  const soma = itensValidos.reduce((acc, val) => acc + val, 0)
  return soma / itensValidos.length
}

// ============================================================================
// FUNÇÕES PARA CÁLCULO DE NÍVEIS POR DISCIPLINA (LP, MAT, PRODUÇÃO)
// Anos Iniciais: 2º, 3º e 5º Anos
// ============================================================================

/**
 * Calcula o nível (N1, N2, N3, N4) baseado em acertos por disciplina
 *
 * Regras:
 * - 2º e 3º Anos (14 questões LP, 14 questões MAT):
 *   N1: 1-3 acertos, N2: 4-7 acertos, N3: 8-11 acertos, N4: 12-14 acertos
 *
 * - 5º Ano LP (14 questões): mesma regra do 2º/3º
 * - 5º Ano MAT (20 questões):
 *   N1: 1-5 acertos, N2: 6-10 acertos, N3: 11-15 acertos, N4: 16-20 acertos
 */
export function calcularNivelPorAcertos(
  acertos: number | null | undefined,
  serie: string | null | undefined,
  disciplina: 'LP' | 'MAT'
): string | null {
  // Se acertos for null, undefined ou 0, retornar null
  if (acertos === null || acertos === undefined || acertos <= 0) {
    return null
  }

  const numeroSerie = extrairNumeroSerie(serie)
  if (!numeroSerie) return null

  // Regras para 2º e 3º Anos (LP e MAT: 14 questões cada)
  if (numeroSerie === '2' || numeroSerie === '3') {
    if (acertos >= 1 && acertos <= 3) return 'N1'
    if (acertos >= 4 && acertos <= 7) return 'N2'
    if (acertos >= 8 && acertos <= 11) return 'N3'
    if (acertos >= 12 && acertos <= 14) return 'N4'
    // Se passou de 14, ainda é N4
    if (acertos > 14) return 'N4'
  }

  // Regras para 5º Ano
  if (numeroSerie === '5') {
    // LP: 14 questões (mesma regra do 2º/3º)
    if (disciplina === 'LP') {
      if (acertos >= 1 && acertos <= 3) return 'N1'
      if (acertos >= 4 && acertos <= 7) return 'N2'
      if (acertos >= 8 && acertos <= 11) return 'N3'
      if (acertos >= 12 && acertos <= 14) return 'N4'
      if (acertos > 14) return 'N4'
    }
    // MAT: 20 questões
    if (disciplina === 'MAT') {
      if (acertos >= 1 && acertos <= 5) return 'N1'
      if (acertos >= 6 && acertos <= 10) return 'N2'
      if (acertos >= 11 && acertos <= 15) return 'N3'
      if (acertos >= 16 && acertos <= 20) return 'N4'
      if (acertos > 20) return 'N4'
    }
  }

  return null
}

/**
 * Converte o nível de aprendizagem da produção textual para o formato N1-N4
 *
 * Mapeamento:
 * - INSUFICIENTE -> N1
 * - BÁSICO -> N2
 * - ADEQUADO -> N3
 * - AVANÇADO -> N4
 */
export function converterNivelProducao(nivelAtual: string | null | undefined): string | null {
  if (!nivelAtual) return null

  const nivelNormalizado = nivelAtual.toUpperCase().trim()

  // Mapeamento direto
  const mapeamento: Record<string, string> = {
    'INSUFICIENTE': 'N1',
    'BÁSICO': 'N2',
    'BASICO': 'N2',  // Sem acento
    'ADEQUADO': 'N3',
    'AVANÇADO': 'N4',
    'AVANCADO': 'N4', // Sem acento
    // Também aceitar formato já convertido
    'N1': 'N1',
    'N2': 'N2',
    'N3': 'N3',
    'N4': 'N4',
  }

  return mapeamento[nivelNormalizado] || null
}

/**
 * Calcula o nível de produção textual baseado na nota (0-10)
 * Usado como fallback quando nivel_aprendizagem não está disponível
 *
 * Regras:
 * - N1 (Insuficiente): 0 - 2.99
 * - N2 (Básico): 3 - 4.99
 * - N3 (Adequado): 5 - 7.49
 * - N4 (Avançado): 7.5 - 10
 */
export function calcularNivelPorNota(nota: number | null | undefined): string | null {
  if (nota === null || nota === undefined || nota <= 0) {
    return null
  }

  if (nota < 3) return 'N1'
  if (nota < 5) return 'N2'
  if (nota < 7.5) return 'N3'
  return 'N4'
}

/**
 * Converte um nível (N1, N2, N3, N4) para valor numérico
 */
export function nivelParaValor(nivel: string | null | undefined): number | null {
  if (!nivel) return null

  const mapeamento: Record<string, number> = {
    'N1': 1,
    'N2': 2,
    'N3': 3,
    'N4': 4,
  }

  return mapeamento[nivel.toUpperCase().trim()] || null
}

/**
 * Converte um valor numérico para nível (N1, N2, N3, N4)
 */
export function valorParaNivel(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null

  // Arredondar para o inteiro mais próximo
  const valorArredondado = Math.round(valor)

  // Garantir que está no intervalo 1-4
  const valorLimitado = Math.max(1, Math.min(4, valorArredondado))

  const mapeamento: Record<number, string> = {
    1: 'N1',
    2: 'N2',
    3: 'N3',
    4: 'N4',
  }

  return mapeamento[valorLimitado] || null
}

/**
 * Calcula o nível geral do aluno como média dos 3 níveis (LP, MAT, Produção)
 *
 * - Converte cada nível para valor numérico (N1=1, N2=2, N3=3, N4=4)
 * - Calcula a média dos níveis disponíveis
 * - Arredonda para o nível mais próximo
 *
 * @param nivelLp Nível de LP (N1, N2, N3, N4)
 * @param nivelMat Nível de MAT (N1, N2, N3, N4)
 * @param nivelProd Nível de Produção (N1, N2, N3, N4)
 * @returns Nível geral do aluno (N1, N2, N3, N4) ou null se não houver níveis válidos
 */
export function calcularNivelAluno(
  nivelLp: string | null | undefined,
  nivelMat: string | null | undefined,
  nivelProd: string | null | undefined
): string | null {
  const valorLp = nivelParaValor(nivelLp)
  const valorMat = nivelParaValor(nivelMat)
  const valorProd = nivelParaValor(nivelProd)

  // Coletar apenas valores válidos
  const valoresValidos = [valorLp, valorMat, valorProd].filter(
    (v): v is number => v !== null && v !== undefined
  )

  // Se não houver nenhum valor válido, retornar null
  if (valoresValidos.length === 0) return null

  // Calcular média
  const soma = valoresValidos.reduce((acc, v) => acc + v, 0)
  const media = soma / valoresValidos.length

  // Converter média para nível
  return valorParaNivel(media)
}

/**
 * Verifica se uma série é dos Anos Iniciais (2º, 3º ou 5º)
 */
export function isAnosIniciais(serie: string | null | undefined): boolean {
  const numero = extrairNumeroSerie(serie)
  return numero === '2' || numero === '3' || numero === '5'
}

/**
 * Obtém a cor do badge para um nível
 */
export function getCorNivel(nivel: string | null | undefined): string {
  if (!nivel) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'

  const cores: Record<string, string> = {
    'N1': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'N2': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'N3': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'N4': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  return cores[nivel.toUpperCase().trim()] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
}
