// SISAM - Verificadores de Divergências: Helpers compartilhados
// Funções auxiliares usadas por múltiplos módulos de verificação

import pool from '@/database/connection'

// Interface para configuração de série
export interface ConfigSerie {
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
export async function carregarConfigSeries(): Promise<Map<string, ConfigSerie>> {
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
export function extrairNumeroSerie(serie: string | null): string | null {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  return match ? match[1] : null
}

/**
 * Limpa o cache de configurações de séries
 */
export function limparCacheConfigSeries(): void {
  cacheConfigSeries = null
}
