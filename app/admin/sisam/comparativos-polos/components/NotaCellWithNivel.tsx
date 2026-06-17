'use client'

import { formatarNumero, getNotaColor, calcularNivelPorMedia } from '../utils'

interface NotaCellWithNivelProps {
  valor: number | string | null | undefined
  isMediaGeral?: boolean
}

export function NotaCellWithNivel({ valor, isMediaGeral }: NotaCellWithNivelProps) {
  const nivel = calcularNivelPorMedia(valor)

  if (isMediaGeral) {
    return (
      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
        <div className={`inline-flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${getNotaColor(valor).includes('green') ? 'bg-green-50' : getNotaColor(valor).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <span className={`text-sm sm:text-base lg:text-lg font-extrabold ${getNotaColor(valor)}`}>
            {formatarNumero(valor)}
          </span>
          {nivel.codigo !== '-' && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
              {nivel.codigo}
            </span>
          )}
        </div>
      </td>
    )
  }

  return (
    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-xs sm:text-sm font-bold ${getNotaColor(valor)}`}>
          {formatarNumero(valor)}
        </span>
        {nivel.codigo !== '-' && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
            {nivel.codigo}
          </span>
        )}
      </div>
    </td>
  )
}
