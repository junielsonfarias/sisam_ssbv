'use client'

import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RegistroDiario } from './types'

interface DiarioListaProps {
  nomeMes: string
  carregandoRegistros: boolean
  registros: RegistroDiario[]
  onMudarMes: (delta: number) => void
  onAbrirModal: (data?: string, registro?: RegistroDiario) => void
  onExcluir: (id: string) => void
}

export function DiarioLista({
  nomeMes, carregandoRegistros, registros, onMudarMes, onAbrirModal, onExcluir,
}: DiarioListaProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={() => onMudarMes(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">{nomeMes}</span>
          <button onClick={() => onMudarMes(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => onAbrirModal()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>
      {carregandoRegistros ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        </div>
      ) : registros.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum registro neste mês</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Disciplina</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Conteúdo</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                    {new Date(r.data_aula + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {r.disciplina_nome || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                    <div className="truncate">{r.conteudo}</div>
                    {r.habilidades_bncc && r.habilidades_bncc.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.habilidades_bncc.slice(0, 4).map(codigo => (
                          <code
                            key={codigo}
                            className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-mono"
                            title={`Habilidade BNCC ${codigo}`}
                          >
                            {codigo}
                          </code>
                        ))}
                        {r.habilidades_bncc.length > 4 && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 self-center">
                            +{r.habilidades_bncc.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onAbrirModal(undefined, r)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => onExcluir(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
