/**
 * Helpers de resolucao de areas de questoes e leitura de celula de questao (Fase 5).
 *
 * @module services/importacao/process/questoes
 */

import { gerarAreasQuestoes } from '@/lib/config-series'
import { createLogger } from '@/lib/logger'
import type { ConfiguracaoSerie } from '@/lib/types'

const log = createLogger('Importacao')

export interface AreaQuestao {
  inicio: number
  fim: number
  area: string
  disciplina: string
}

/**
 * Determina as areas de questoes do aluno a partir da configuracao da serie.
 * Quando nao ha configuracao, usa fallbacks por numero de serie (anos iniciais/finais).
 */
export function resolverAreasQuestoes(
  configSerieAluno: ConfiguracaoSerie | null | undefined,
  numeroSerie: string | null,
  serie: string | null
): AreaQuestao[] {
  if (configSerieAluno) {
    return gerarAreasQuestoes(configSerieAluno)
  }

  const serieNumFallback = parseInt(numeroSerie || '0')

  if (serieNumFallback === 2 || serieNumFallback === 3) {
    log.warn(`Fallback ANOS INICIAIS (2o/3o) para serie: "${serie}"`)
    return [
      { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 15, fim: 28, area: 'Matemática', disciplina: 'Matemática' },
    ]
  } else if (serieNumFallback === 5) {
    log.warn(`Fallback ANOS INICIAIS (5o) para serie: "${serie}"`)
    return [
      { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 15, fim: 34, area: 'Matemática', disciplina: 'Matemática' },
    ]
  } else {
    log.warn(`Fallback ANOS FINAIS para serie: "${serie}"`)
    return [
      { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
      { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
      { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
    ]
  }
}

/**
 * Le o valor de uma questao da linha, testando as variacoes de nome de coluna
 * (Q1, Q 1, q1, q 1, Questao N, Questão N) e, por fim, comparacao normalizada.
 */
export function lerCelulaQuestao(linha: Record<string, unknown>, num: number): unknown {
  const variacoesColuna = [
    `Q${num}`,
    `Q ${num}`,
    `q${num}`,
    `q ${num}`,
    `Questão ${num}`,
    `Questao ${num}`,
  ]

  for (const variacao of variacoesColuna) {
    if (linha[variacao] !== undefined) {
      return linha[variacao]
    }
  }

  const todasColunas = Object.keys(linha)
  const colunaEncontrada = todasColunas.find(c =>
    c.replace(/\s+/g, '').toUpperCase() === `Q${num}`.toUpperCase()
  )
  if (colunaEncontrada) {
    return linha[colunaEncontrada]
  }

  return undefined
}
