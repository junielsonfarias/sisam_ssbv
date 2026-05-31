'use client'

import { Plus, Power, Stethoscope } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Nutricionista } from './types'

interface Props {
  nutricionistas: Nutricionista[]
  incluirInativos: boolean
  carregando: boolean
  onToggleInativos: (v: boolean) => void
  onNova: () => void
  onAlterarStatus: (n: Nutricionista) => void
}

export function AbaNutricionistas({
  nutricionistas, incluirInativos, carregando, onToggleInativos, onNova, onAlterarStatus,
}: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => onToggleInativos(e.target.checked)}
            className="rounded text-green-600"
          />
          Incluir inativas
        </label>
        <button
          onClick={onNova}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Nova nutricionista
        </button>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : nutricionistas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma nutricionista cadastrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/30">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">CRN</th>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Contato</th>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">RT</th>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ação</th>
              </tr>
            </thead>
            <tbody>
              {nutricionistas.map((n) => (
                <tr key={n.id} className="border-b border-gray-100 dark:border-slate-700/50">
                  <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{n.nome}</td>
                  <td className="py-2 px-4 font-mono text-xs text-gray-500">{n.crn}</td>
                  <td className="py-2 px-4 text-xs text-gray-500">
                    {n.email && <div>{n.email}</div>}
                    {n.telefone && <div>{n.telefone}</div>}
                    {!n.email && !n.telefone && '—'}
                  </td>
                  <td className="py-2 px-4">
                    {n.responsavel_tecnico && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">RT FNDE</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      n.ativa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {n.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      onClick={() => onAlterarStatus(n)}
                      aria-label={`${n.ativa ? 'Inativar' : 'Reativar'} ${n.nome}`}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ml-auto ${
                        n.ativa
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                      }`}
                    >
                      <Power className="w-3 h-3" /> {n.ativa ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
