/**
 * Funções de produção textual
 *
 * @module config-series/producao
 */

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
      const valorRaw = (linha[variacao] as string | number).toString().trim().toUpperCase()

      // Tratar valor vazio, "-" ou "0" como 0 pontos (ERRO)
      if (valorRaw === '' || valorRaw === '-' || valorRaw === '0') {
        return 0
      }

      // Tratar valor "X" como 1 ponto (ACERTO)
      if (valorRaw === 'X') {
        return 1
      }

      // Tentar converter para número (para casos com valores numéricos diretos)
      const valorNumerico = (linha[variacao] as string | number).toString().replace(',', '.').trim()
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
