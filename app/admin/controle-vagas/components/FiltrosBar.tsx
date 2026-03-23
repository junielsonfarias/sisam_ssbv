import { Save, X, Settings } from 'lucide-react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { FiltroOcupacao } from './types'

interface FiltrosBarProps {
  filtroSerie: string
  setFiltroSerie: (v: string) => void
  filtroOcupacao: FiltroOcupacao
  setFiltroOcupacao: (v: FiltroOcupacao) => void
  seriesUnicas: string[]
  formatSerie: (s: string) => string
  isAdmin: boolean
  modoLote: boolean
  salvando: boolean
  salvarLote: () => void
  iniciarModoLote: () => void
  cancelarLote: () => void
}

export default function FiltrosBar({
  filtroSerie, setFiltroSerie, filtroOcupacao, setFiltroOcupacao,
  seriesUnicas, formatSerie, isAdmin, modoLote, salvando,
  salvarLote, iniciarModoLote, cancelarLote
}: FiltrosBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Filtrar:</span>

      {/* Série */}
      <button
        onClick={() => setFiltroSerie('')}
        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
          !filtroSerie ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
        }`}
      >
        Todas
      </button>
      {seriesUnicas.map(s => (
        <button
          key={s}
          onClick={() => setFiltroSerie(s)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            filtroSerie === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
          }`}
        >
          {formatSerie(s)}
        </button>
      ))}

      <span className="text-gray-300 dark:text-gray-600">|</span>

      {/* Status ocupação */}
      {[
        { value: '' as FiltroOcupacao, label: 'Todas', cor: '' },
        { value: 'lotada' as FiltroOcupacao, label: 'Lotadas', cor: 'text-red-600' },
        { value: 'com_vagas' as FiltroOcupacao, label: 'Com vagas', cor: 'text-emerald-600' },
        { value: 'com_fila' as FiltroOcupacao, label: 'Com fila', cor: 'text-orange-600' }
      ].map(f => (
        <button
          key={f.value}
          onClick={() => setFiltroOcupacao(f.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            filtroOcupacao === f.value
              ? 'bg-slate-700 text-white dark:bg-slate-500'
              : `bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 ${f.cor}`
          }`}
        >
          {f.label}
        </button>
      ))}

      {isAdmin && (
        <div className="ml-auto">
          {modoLote ? (
            <div className="flex gap-2">
              <button
                onClick={salvarLote}
                disabled={salvando}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {salvando ? <ButtonSpinner /> : <Save className="w-3.5 h-3.5" />}
                Salvar Lote
              </button>
              <button
                onClick={cancelarLote}
                className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-300"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={iniciarModoLote}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
            >
              <Settings className="w-3.5 h-3.5" /> Editar Capacidades em Lote
            </button>
          )}
        </div>
      )}
    </div>
  )
}
