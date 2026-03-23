import { X, BarChart3 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dispositivo, Estatisticas, formatarData } from './types'

interface ModalEstatisticasProps {
  dispositivo: Dispositivo
  estatisticas: Estatisticas | null
  carregando: boolean
  onClose: () => void
}

export function ModalEstatisticas({
  dispositivo,
  estatisticas,
  carregando,
  onClose,
}: ModalEstatisticasProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Estatisticas - {dispositivo.nome}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dispositivo.escola_nome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : estatisticas ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.total_hoje}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Presencas Hoje</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{estatisticas.taxa_sucesso}%</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">Taxa de Sucesso</p>
                </div>
              </div>

              {/* Scans por Hora - Bar Chart */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Registros por Hora (Hoje)
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                  {(() => {
                    const maxVal = Math.max(...estatisticas.scans_por_hora.map(s => s.total), 1)
                    const horasAtivas = estatisticas.scans_por_hora.filter(s => s.total > 0)

                    if (horasAtivas.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          Nenhum registro hoje
                        </p>
                      )
                    }

                    return (
                      <div className="flex items-end gap-1 h-32">
                        {estatisticas.scans_por_hora.map((s) => {
                          const heightPercent = maxVal > 0 ? (s.total / maxVal) * 100 : 0
                          return (
                            <div
                              key={s.hora}
                              className="flex-1 flex flex-col items-center justify-end group relative"
                            >
                              {s.total > 0 && (
                                <span className="text-[10px] text-gray-600 dark:text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {s.total}
                                </span>
                              )}
                              <div
                                className={`w-full rounded-t transition-all ${
                                  s.total > 0
                                    ? 'bg-indigo-500 dark:bg-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                }`}
                                style={{ height: `${Math.max(heightPercent, 2)}%`, minHeight: '2px' }}
                              />
                              <span className="text-[9px] text-gray-400 mt-1">{s.hora}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Ultimos 7 dias */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Ultimos 7 Dias
                </h4>
                {estatisticas.ultimos_7_dias.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum registro nos ultimos 7 dias</p>
                ) : (
                  <div className="space-y-2">
                    {estatisticas.ultimos_7_dias.map((dia) => {
                      const maxDia = Math.max(...estatisticas.ultimos_7_dias.map(d => d.total), 1)
                      const widthPercent = (dia.total / maxDia) * 100
                      return (
                        <div key={dia.data} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
                            {new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div
                              className="bg-indigo-500 dark:bg-indigo-400 h-full rounded-full transition-all"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
                            {dia.total}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Logs Recentes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Logs Recentes
                </h4>
                {estatisticas.logs_recentes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum log recente</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Evento</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Detalhes</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {estatisticas.logs_recentes.slice(0, 10).map((log, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.evento === 'erro'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                  : log.evento === 'presenca' || log.evento === 'presenca_lote'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {log.evento}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                              {log.detalhes || '-'}
                            </td>
                            <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {formatarData(log.criado_em)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
