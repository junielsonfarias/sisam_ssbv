/**
 * Extracao de itens de producao textual e calculo da nota de producao (Fase 5).
 *
 * @module services/importacao/process/producao-textual
 */

import { extrairNotaProducao, calcularMediaProducao } from '@/lib/config-series'
import { createLogger } from '@/lib/logger'
import type { ConfiguracaoSerie } from '@/lib/types'
import { cel, extrairDecimal } from './celula'

const log = createLogger('Importacao')

export interface ProducaoTextual {
  notaProducao: number | null
  itensProducaoNotas: (number | null)[]
}

/**
 * Extrai as notas dos 8 itens de producao textual e calcula a nota agregada.
 * So extrai quando a serie possui producao textual; caso contrario retorna vazio.
 */
export function extrairProducaoTextual(
  linha: Record<string, unknown>,
  configSerieAluno: ConfiguracaoSerie | null | undefined,
  serie: string | null,
  alunoNome: string,
  indiceLinha: number
): ProducaoTextual {
  const i = indiceLinha
  let notaProducao: number | null = null
  const itensProducaoNotas: (number | null)[] = []

  if (configSerieAluno?.tem_producao_textual) {
    for (let itemNum = 1; itemNum <= 8; itemNum++) {
      itensProducaoNotas.push(extrairNotaProducao(linha, itemNum))
    }

    if (i < 3) {
      log.debug(`Aluno: ${alunoNome}, Serie: ${serie}`)
      log.debug(`  - configSerieAluno.tem_producao_textual: ${configSerieAluno.tem_producao_textual}`)
      log.debug(`  - Colunas no Excel: ${Object.keys(linha).filter(k => k.toLowerCase().includes('item'))}`)
      log.debug(`  - itensProducaoNotas extraidos: ${JSON.stringify(itensProducaoNotas)}`)
    }

    notaProducao = calcularMediaProducao(itensProducaoNotas)

    if (notaProducao === null) {
      notaProducao = extrairDecimal(cel(
        linha['PRODUÇÃO'] || linha['Produção'] || linha['PRODUCAO'] ||
        linha['Nota Produção'] || linha['NOTA PRODUÇÃO'] || linha['nota_producao']
      ))
    }

    if (i < 3) {
      log.debug(`  - notaProducao calculada: ${notaProducao}`)
    }
  } else if (i < 3) {
    log.debug(`Aluno: ${alunoNome}, Serie: ${serie} - SEM PRODUCAO TEXTUAL`)
    log.debug(`  - configSerieAluno: ${configSerieAluno ? 'existe' : 'NULL'}`)
    log.debug(`  - tem_producao_textual: ${configSerieAluno?.tem_producao_textual}`)
  }

  return { notaProducao, itensProducaoNotas }
}
