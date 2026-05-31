/**
 * Parsers de colunas variáveis da planilha:
 * - Presença / falta com múltiplas convenções
 * - 8 itens de produção textual
 * - Notas pré-calculadas (LP, MAT, Produção, Nível Produção)
 */

/**
 * Extrai presença a partir das colunas P/F, FALTA ou PRESENÇA (planilhas
 * municipais usam convenções diferentes).
 *
 * @returns 'P' | 'F' | null (null = sem coluna preenchida)
 */
export function extrairPresenca(linha: Record<string, unknown>): 'P' | 'F' | null {
  const colunaPF = linha['P/F'] || linha['p/f']
  const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
  const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']

  const temColunaPF = colunaPF !== undefined && colunaPF !== null && colunaPF !== ''
  const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
  const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''

  if (temColunaPF) {
    const v = String(colunaPF).trim().toUpperCase()
    if (v === 'P' || v === 'PRESENTE') return 'P'
    if (v === 'F' || v === 'FALTA' || v === 'FALTOU') return 'F'
    return null
  }

  if (temColunaFalta) {
    const v = String(colunaFalta).trim().toUpperCase()
    if (['F', 'X', 'FALTOU', 'AUSENTE', 'SIM', '1', 'S'].includes(v)) return 'F'
    if (['P', 'PRESENTE', 'NAO', 'NÃO', '0', 'N'].includes(v)) return 'P'
    return 'F'
  }

  if (temColunaPresenca) {
    const v = String(colunaPresenca).trim().toUpperCase()
    if (['P', 'PRESENTE', 'SIM', '1', 'S'].includes(v)) return 'P'
    if (['F', 'FALTOU', 'AUSENTE', 'NAO', 'NÃO', '0', 'N'].includes(v)) return 'F'
    return null
  }

  return null
}

/**
 * Lê os 8 itens de produção textual (variantes: Item1, ITEM1, item1, I1, etc.).
 * Cada posição é 1 (marcado), 0 (não marcado) ou null (coluna ausente/vazia).
 */
export function lerItensProducao(linha: Record<string, unknown>): (number | null)[] {
  const itens: (number | null)[] = []
  for (let itemNum = 1; itemNum <= 8; itemNum++) {
    const variacoes = [
      `Item${itemNum}`, `ITEM${itemNum}`, `item${itemNum}`,
      `Item ${itemNum}`, `ITEM ${itemNum}`, `item ${itemNum}`,
      `Item_${itemNum}`, `ITEM_${itemNum}`, `item_${itemNum}`,
      `I${itemNum}`, `i${itemNum}`,
    ]

    let colunaItem: unknown = undefined
    for (const variacao of variacoes) {
      if (linha[variacao] !== undefined) {
        colunaItem = linha[variacao]
        break
      }
    }

    if (colunaItem !== undefined && colunaItem !== null && colunaItem !== '') {
      const v = String(colunaItem).trim().toUpperCase()
      itens.push(v === 'X' || v === '1' ? 1 : 0)
    } else {
      itens.push(null)
    }
  }
  return itens
}

export interface NotasPlanilha {
  notaLP: number | null
  notaMAT: number | null
  notaProducao: number | null
  nivelProducao: string | null
}

export function lerNotasPlanilha(linha: Record<string, unknown>): NotasPlanilha {
  const notaLPRaw = linha['NOTA_LP'] || linha['Nota_LP'] || linha['nota_lp']
  const notaMATRaw = linha['NOTA_MAT'] || linha['Nota_MAT'] || linha['nota_mat']
  const notaProdRaw = linha['PRODUÇÃO'] || linha['Produção'] || linha['producao'] || linha['PRODUCAO']
  const nivelProdRaw = linha['NÍVEL_PROD'] || linha['Nível_Prod'] || linha['nivel_prod'] || linha['NIVEL_PROD']

  return {
    notaLP: notaLPRaw ? parseFloat(String(notaLPRaw)) || null : null,
    notaMAT: notaMATRaw ? parseFloat(String(notaMATRaw)) || null : null,
    notaProducao: notaProdRaw ? parseFloat(String(notaProdRaw)) || null : null,
    nivelProducao: nivelProdRaw ? String(nivelProdRaw).trim() || null : null,
  }
}
