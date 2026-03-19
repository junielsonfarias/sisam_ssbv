import { History } from 'lucide-react'
import { Secao } from './shared'
import { SITUACAO_CORES } from './types'

export function AbaHistorico({ dados }: any) {
  const historico = dados.historico_situacao || []

  if (historico.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma movimentação registrada</p>
    </div>
  )

  return (
    <Secao titulo="Histórico de Movimentações" icon={History} cor="orange">
      <div className="relative">
        {/* Timeline */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700"></div>
        <div className="space-y-4">
          {historico.map((h: any, i: number) => {
            const sitNova = SITUACAO_CORES[h.situacao || h.situacao_nova] || SITUACAO_CORES.cursando
            const sitField = h.situacao || h.situacao_nova
            const dataField = h.data || h.data_mudanca
            const obsField = h.observacao || h.motivo
            return (
              <div key={i} className="relative pl-10">
                <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${sitField === 'transferido' ? 'bg-orange-500' : sitField === 'cursando' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sitNova.bg} ${sitNova.text}`}>{sitNova.label}</span>
                    <span className="text-xs text-gray-400">{dataField ? new Date(dataField).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  {h.situacao_anterior && <p className="text-xs text-gray-500">De: <span className="capitalize">{h.situacao_anterior}</span></p>}
                  {obsField && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{obsField}</p>}
                  {(h.escola_destino_nome || h.escola_destino_ref_nome) && (
                    <p className="text-xs text-gray-500 mt-0.5">Destino: {h.escola_destino_nome || h.escola_destino_ref_nome}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Secao>
  )
}
