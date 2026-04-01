/**
 * Funções de cálculo e conversão de níveis de aprendizagem
 *
 * @module config-series/niveis
 */

import pool from '@/database/connection'
import type { NivelAprendizagem } from '@/lib/types'
import { extrairNumeroSerie } from './utils'

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

// Cache em memória para níveis
let cacheNiveis: NivelAprendizagem[] | null = null
let cacheNiveisTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Carrega os níveis de aprendizagem do banco (com cache)
 */
export async function carregarNiveisAprendizagem(): Promise<NivelAprendizagem[]> {
  const agora = Date.now()

  if (cacheNiveis && (agora - cacheNiveisTimestamp) < CACHE_TTL) {
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

    cacheNiveisTimestamp = agora
    return cacheNiveis
  } catch (error) {
    console.error('Erro ao carregar níveis de aprendizagem:', error)
    return []
  }
}

/**
 * Limpa o cache de níveis (chamado por limparCacheConfigSeries)
 */
export function limparCacheNiveis(): void {
  cacheNiveis = null
  cacheNiveisTimestamp = 0
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
