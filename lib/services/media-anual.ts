/**
 * Cálculo da MÉDIA ANUAL de uma disciplina a partir das notas finais de cada
 * período letivo, honrando a regra de avaliação da série
 * (`regras_avaliacao.formula_media` + `pesos_periodos` + arredondamento).
 *
 * Usado pelo fechamento do ano (decisão de aprovação). Mantido como função
 * pura, sem acesso ao banco, para ser unit-testável e reusável (boletim).
 *
 * Fórmulas (formula_media):
 *  - media_aritmetica: soma das notas ÷ nº de períodos COM nota (pesos ignorados)
 *  - media_ponderada:  Σ(nota·peso) ÷ Σ(pesos)  (usa pesos_periodos)
 *  - maior_nota:       a maior nota entre os períodos
 *  - soma_dividida:    soma das notas ÷ nº TOTAL de períodos (divisor fixo)
 */

export type FormulaMedia =
  | 'media_aritmetica'
  | 'media_ponderada'
  | 'maior_nota'
  | 'soma_dividida'

export type Arredondamento = 'normal' | 'cima' | 'baixo' | 'nenhum'

export interface PesoPeriodo {
  periodo: number
  peso: number
}

export interface OpcoesMediaAnual {
  /** Fórmula da média (default media_aritmetica). */
  formula?: string | null
  /** Lista de períodos + pesos (define também o nº total de períodos). */
  pesosPeriodos: PesoPeriodo[]
  /** Casas decimais para arredondar (default 1). */
  casasDecimais?: number | null
  /** Modo de arredondamento (default normal). */
  arredondamento?: string | null
}

export interface ResultadoMediaAnual {
  media: number
  periodos_com_nota: number
  periodos_total: number
}

/**
 * Aplica o arredondamento configurado a um valor.
 *  - normal: arredondamento padrão (round half away from zero por casa)
 *  - cima:   teto (Math.ceil) na casa
 *  - baixo:  piso (Math.floor) na casa
 *  - nenhum: sem arredondamento (limpa apenas ruído de ponto flutuante)
 */
export function aplicarArredondamento(
  valor: number,
  casas: number,
  modo: Arredondamento
): number {
  if (!isFinite(valor)) return 0
  if (modo === 'nenhum') {
    // Mantém o valor; remove ruído de float (ex.: 6.300000000000001)
    return Math.round(valor * 1e6) / 1e6
  }
  const c = Math.max(0, Math.min(casas, 6))
  const fator = Math.pow(10, c)
  // Corrige ruído de float antes de aplicar o modo (evita 5.999999 -> 5.9)
  const ajustado = Math.round(valor * 1e8) / 1e8
  if (modo === 'cima') return Math.ceil(ajustado * fator) / fator
  if (modo === 'baixo') return Math.floor(ajustado * fator) / fator
  return Math.round(ajustado * fator) / fator
}

/**
 * Calcula a média anual de uma disciplina conforme a fórmula da regra.
 * `notasPorPeriodo`: Map<numero_periodo, nota_final_do_periodo>.
 * Retorna a média já arredondada e a contagem de períodos com/total.
 */
export function calcularMediaAnual(
  notasPorPeriodo: Map<number, number>,
  opcoes: OpcoesMediaAnual
): ResultadoMediaAnual {
  const { pesosPeriodos } = opcoes
  const formula = (opcoes.formula || 'media_aritmetica') as FormulaMedia
  const casas = opcoes.casasDecimais ?? 1
  const modo = (opcoes.arredondamento || 'normal') as Arredondamento

  // Coleta as notas dos períodos definidos na regra (na ordem dos pesos)
  const valores: { nota: number; peso: number }[] = []
  for (const pp of pesosPeriodos) {
    const nota = notasPorPeriodo.get(pp.periodo)
    if (nota !== undefined && nota !== null && !isNaN(nota)) {
      valores.push({ nota, peso: pp.peso })
    }
  }

  const periodosComNota = valores.length
  const periodosTotal = pesosPeriodos.length

  let media = 0
  if (periodosComNota > 0) {
    switch (formula) {
      case 'media_ponderada': {
        const somaPesos = valores.reduce((s, v) => s + v.peso, 0)
        media = somaPesos > 0
          ? valores.reduce((s, v) => s + v.nota * v.peso, 0) / somaPesos
          : 0
        break
      }
      case 'maior_nota':
        media = Math.max(...valores.map(v => v.nota))
        break
      case 'soma_dividida':
        // Divisor fixo = total de períodos da regra (penaliza ausência de nota)
        media = periodosTotal > 0
          ? valores.reduce((s, v) => s + v.nota, 0) / periodosTotal
          : 0
        break
      case 'media_aritmetica':
      default:
        media = valores.reduce((s, v) => s + v.nota, 0) / periodosComNota
        break
    }
  }

  return {
    media: aplicarArredondamento(media, casas, modo),
    periodos_com_nota: periodosComNota,
    periodos_total: periodosTotal,
  }
}
