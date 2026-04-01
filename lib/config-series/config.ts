/**
 * Configuração de séries — carregamento e cache
 *
 * @module config-series/config
 */

import pool from '@/database/connection'
import type { ConfiguracaoSerie } from '@/lib/types'
import { extrairNumeroSerie } from './utils'
import { limparCacheNiveis } from './niveis'

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

// Cache em memória para evitar consultas repetidas
let cacheConfigSeries: Map<string, ConfiguracaoSerie> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

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
 * Limpa o cache (útil após alterações nas configurações)
 */
export function limparCacheConfigSeries(): void {
  cacheConfigSeries = null
  cacheTimestamp = 0
  limparCacheNiveis()
}
