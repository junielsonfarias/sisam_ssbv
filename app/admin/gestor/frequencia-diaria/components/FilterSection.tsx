import { Calendar, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import type { TurmaSimples } from '@/lib/types/common'

interface Escola {
  id: string
  nome: string
}

interface FilterSectionProps {
  data: string
  setData: (v: string) => void
  escolaId: string
  setEscolaId: (v: string) => void
  turmaId: string
  setTurmaId: (v: string) => void
  metodo: string
  setMetodo: (v: string) => void
  tipoUsuario: string | null
  escolas: Escola[]
  turmas: TurmaSimples[]
  carregando: boolean
  onBuscar: () => void
}

export function FilterSection({
  data, setData,
  escolaId, setEscolaId,
  turmaId, setTurmaId,
  metodo, setMetodo,
  tipoUsuario,
  escolas, turmas,
  carregando,
  onBuscar,
}: FilterSectionProps) {
  const { formatSerie } = useSeries()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Data */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Escola */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
          {tipoUsuario === 'escola' ? (
            <input
              type="text"
              value="Minha Escola"
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          ) : (
            <select
              value={escolaId}
              onChange={e => setEscolaId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {escolas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Turma */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma</label>
          <select
            value={turmaId}
            onChange={e => setTurmaId(e.target.value)}
            disabled={!escolaId}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todas</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({formatSerie(t.serie)})
              </option>
            ))}
          </select>
        </div>

        {/* Metodo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Metodo</label>
          <select
            value={metodo}
            onChange={e => setMetodo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="facial">Facial</option>
            <option value="manual">Manual</option>
            <option value="qrcode">QR Code</option>
          </select>
        </div>

        {/* Botao buscar */}
        <div className="flex items-end">
          <button
            onClick={onBuscar}
            disabled={carregando}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? <LoadingSpinner /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>
      </div>
    </div>
  )
}
