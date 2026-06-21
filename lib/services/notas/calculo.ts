import type { ConfigNotas } from './types'

/**
 * Calcula nota_final com base em nota, recuperação e config.
 * Lógica centralizada — usada por admin e professor.
 *
 * Se pesos estão configurados (peso_avaliacao + peso_recuperacao = 1):
 *   nota_final = (nota * peso_avaliacao) + (recuperacao * peso_recuperacao)
 * Senão: usa regra "maior nota" (substituição simples)
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

      if (pesoAv && pesoRec && Math.abs((pesoAv + pesoRec) - 1) < 0.01) {
        // Usar fórmula com pesos: nota_final = (nota * peso) + (rec * peso)
        notaFinal = (notaNum * pesoAv) + (recNum * pesoRec)
      } else {
        // Sem pesos: usar maior nota (substituição simples)
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
