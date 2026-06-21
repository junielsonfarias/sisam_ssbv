import { REGRA_RECUPERACAO_PADRAO } from './types'
import type { ConfigNotas } from './types'

/**
 * Calcula nota_final com base em nota, recuperação e config.
 * Lógica centralizada — usada por admin e professor.
 *
 * A regra de recuperação é EXPLÍCITA via `config.regra_recuperacao`
 * (default 'substituicao'):
 *   - 'ponderada': nota_final = (nota * peso_avaliacao) + (recuperacao * peso_recuperacao),
 *     aplicada apenas quando ambos os pesos existem e somam ~1.0.
 *   - 'substituicao' (default): nota_final = MAX(nota, recuperacao).
 *
 * Importante: a presença dos pesos padrão (0.60/0.40) NÃO liga a ponderação
 * sozinha — só `regra_recuperacao === 'ponderada'` ativa o cálculo ponderado.
 */
export function calcularNotaFinal(
  nota: number | null | undefined,
  notaRecuperacao: number | null | undefined,
  config: ConfigNotas
): number | null {
  if (nota === null || nota === undefined) return null

  const notaNum = typeof nota === 'number' ? nota : parseFloat(String(nota))
  if (isNaN(notaNum)) return null

  let notaFinal = Math.max(0, notaNum)

  if (notaRecuperacao !== null && notaRecuperacao !== undefined && config.permite_recuperacao) {
    const recNum = typeof notaRecuperacao === 'number' ? notaRecuperacao : parseFloat(String(notaRecuperacao))
    if (!isNaN(recNum)) {
      const pesoAv = config.peso_avaliacao
      const pesoRec = config.peso_recuperacao
      const regra = config.regra_recuperacao ?? REGRA_RECUPERACAO_PADRAO
      const pesosValidos = !!pesoAv && !!pesoRec && Math.abs((pesoAv + pesoRec) - 1) < 0.01

      if (regra === 'ponderada' && pesosValidos) {
        // Regra explícita ponderada: nota_final = (nota * peso) + (rec * peso)
        notaFinal = (notaNum * pesoAv!) + (recNum * pesoRec!)
      } else {
        // Default (substituição): usa a maior nota
        if (recNum > notaFinal) {
          notaFinal = recNum
        }
      }
    }
  }

  notaFinal = Math.max(0, Math.min(notaFinal, config.nota_maxima))
  notaFinal = Math.round(notaFinal * 100) / 100

  return isNaN(notaFinal) ? null : notaFinal
}
