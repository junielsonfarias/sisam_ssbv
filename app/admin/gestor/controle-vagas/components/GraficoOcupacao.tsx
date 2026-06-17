import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { DadosSerie } from './types'
import { getCorOcupacao, getCorTextoOcupacao } from './helpers'

interface GraficoOcupacaoProps {
  porSerie: DadosSerie[]
  mostrarGrafico: boolean
  setMostrarGrafico: (v: boolean) => void
  formatSerie: (s: string) => string
}

export default function GraficoOcupacao({ porSerie, mostrarGrafico, setMostrarGrafico, formatSerie }: GraficoOcupacaoProps) {
  if (porSerie.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
      <button
        onClick={() => setMostrarGrafico(!mostrarGrafico)}
        className="flex items-center justify-between w-full"
      >
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Ocupação por Série
        </h3>
        {mostrarGrafico ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {mostrarGrafico && (
        <div className="mt-4 space-y-3">
          {porSerie.map(s => {
            const pct = s.capacidade > 0 ? Math.round((s.matriculados / s.capacidade) * 100) : 0
            return (
              <div key={s.serie} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-right flex-shrink-0">
                  {formatSerie(s.serie)}
                </span>
                <div className="flex-1 relative">
                  <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${getCorOcupacao(pct)}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    >
                      {pct >= 20 && (
                        <span className="text-white text-xs font-bold">{pct}%</span>
                      )}
                    </div>
                  </div>
                  {pct < 20 && (
                    <span className={`absolute right-2 top-0.5 text-xs font-bold ${getCorTextoOcupacao(pct)}`}>{pct}%</span>
                  )}
                </div>
                <div className="w-32 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                  <span>{s.matriculados}/{s.capacidade}</span>
                  {s.fila > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      +{s.fila} fila
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
