'use client'

import { formatarNota, getNotaBgColor, getNotaColor } from '@/lib/dados/utils'
import NivelBadge from './NivelBadge'

/**
 * Calcula o nível baseado na nota (fallback quando nivel não é fornecido)
 * Faixas: 0-4 = N1, 4-6 = N2, 6-8 = N3, 8-10 = N4
 */
function calcularNivelPorNota(nota: number | string | null | undefined): string | null {
  if (nota === null || nota === undefined) return null

  const notaNum = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(notaNum) || notaNum <= 0) return null

  if (notaNum < 4) return 'N1'
  if (notaNum < 6) return 'N2'
  if (notaNum < 8) return 'N3'
  return 'N4'
}

type TamanhoCelula = 'sm' | 'md'

interface CelulaNotaComNivelProps {
  nota: number | string | null | undefined
  acertos?: number | string | null
  totalQuestoes?: number | null
  nivel?: string | null
  presenca?: string
  naoAplicavel?: boolean
  tamanho?: TamanhoCelula
  className?: string
}

const tamanhoClasses: Record<TamanhoCelula, { container: string; acertos: string; nota: string }> = {
  sm: {
    container: 'p-1 sm:p-1.5 max-w-[55px] sm:max-w-[65px]',
    acertos: 'text-[9px] sm:text-[10px]',
    nota: 'text-xs sm:text-sm'
  },
  md: {
    container: 'p-1.5',
    acertos: 'text-[10px]',
    nota: 'text-sm'
  }
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
  tamanho = 'sm',
  className = ''
}: CelulaNotaComNivelProps) {
  const classes = tamanhoClasses[tamanho]

  // Se nao aplicavel (ex: disciplina nao existe para esta serie)
  if (naoAplicavel) {
    return (
      <span className="text-gray-400">N/A</span>
    )
  }

  const notaNum = typeof nota === 'string' ? parseFloat(nota) || 0 : (nota || 0)
  const temAcertos = totalQuestoes && acertos !== null && acertos !== undefined

  // Usa o nível fornecido ou calcula baseado na nota como fallback
  const nivelExibir = nivel || calcularNivelPorNota(nota)

  return (
    <div className={`inline-flex flex-col items-center rounded-lg ${getNotaBgColor(notaNum)} border ${classes.container} ${className}`}>
      {/* Acertos/Total */}
      {temAcertos && (
        <div className={`text-gray-500 dark:text-gray-400 mb-0.5 ${classes.acertos}`}>
          {acertos}/{totalQuestoes}
        </div>
      )}

      {/* Nota */}
      <div className={`font-bold ${getNotaColor(notaNum)} ${classes.nota}`}>
        {formatarNota(nota, presenca)}
      </div>

      {/* Badge de nivel - usa nível fornecido ou calculado */}
      {nivelExibir && (
        <NivelBadge nivel={nivelExibir} className="mt-1" />
      )}
    </div>
  )
}
