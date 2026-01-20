'use client'

import { formatarNota, getNotaBgColor, getNotaColor } from '@/lib/dados/utils'
import NivelBadge from './NivelBadge'

interface CelulaNotaComNivelProps {
  nota: number | string | null | undefined
  acertos?: number | null
  totalQuestoes?: number | null
  nivel?: string | null
  presenca?: string
  naoAplicavel?: boolean
  className?: string
}

/**
 * Componente reutilizavel para exibir celula de nota com nivel
 * Usado em tabelas de resultados para padronizar a exibicao
 */
export default function CelulaNotaComNivel({
  nota,
  acertos,
  totalQuestoes,
  nivel,
  presenca,
  naoAplicavel = false,
  className = ''
}: CelulaNotaComNivelProps) {
  // Se nao aplicavel (ex: disciplina nao existe para esta serie)
  if (naoAplicavel) {
    return (
      <div className={`inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 w-full max-w-[55px] sm:max-w-[65px] ${className}`}>
        <div className="text-xs sm:text-sm font-bold text-gray-400">N/A</div>
      </div>
    )
  }

  const notaNum = typeof nota === 'string' ? parseFloat(nota) || 0 : (nota || 0)
  const temAcertos = totalQuestoes && acertos !== null && acertos !== undefined

  return (
    <div className={`inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg ${getNotaBgColor(notaNum)} dark:bg-slate-700 border w-full max-w-[55px] sm:max-w-[65px] ${className}`}>
      {/* Acertos/Total */}
      {temAcertos && (
        <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
          {acertos}/{totalQuestoes}
        </div>
      )}

      {/* Nota */}
      <div className={`text-sm sm:text-base font-bold ${getNotaColor(notaNum)}`}>
        {formatarNota(nota, presenca)}
      </div>

      {/* Badge de nivel */}
      {nivel && (
        <NivelBadge nivel={nivel} className="mt-0.5" tamanho="xs" />
      )}
    </div>
  )
}
