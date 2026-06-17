import { Clock, Plus, ChevronUp, ChevronDown, Send, CheckCircle, Ban, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ItemFila, ResumoFila } from './types'
import { formatarDiasEspera } from './helpers'

interface FilaEsperaProps {
  turmaId: string
  turmaCodigo: string
  turmaEscolaId: string
  filaAberta: string
  fila: ItemFila[]
  resumoFila: ResumoFila | null
  carregandoFila: boolean
  confirmandoRemocao: string | null
  setConfirmandoRemocao: (v: string | null) => void
  abrirFila: (turmaId: string) => void
  atualizarStatusFila: (id: string, status: string) => void
  removerDaFila: (id: string) => void
  setModalFila: (v: { turmaId: string; turmaCode: string; escolaId: string } | null) => void
  filaEspera: number
}

export function FilaBotao({ filaEspera, turmaId, filaAberta, abrirFila }: {
  filaEspera: number; turmaId: string; filaAberta: string; abrirFila: (id: string) => void
}) {
  return (
    <button
      onClick={() => abrirFila(turmaId)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
        filaEspera > 0
          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'
          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
      }`}
    >
      {filaEspera > 0 ? filaEspera : '0'}
      {filaAberta === turmaId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  )
}

export default function FilaEspera({
  turmaId, turmaCodigo, turmaEscolaId, filaAberta,
  fila, resumoFila, carregandoFila,
  confirmandoRemocao, setConfirmandoRemocao,
  abrirFila, atualizarStatusFila, removerDaFila, setModalFila
}: FilaEsperaProps) {
  if (filaAberta !== turmaId) return null

  return (
    <tr key={`fila-${turmaId}`}>
      <td colSpan={9} className="px-4 py-3 bg-orange-50/50 dark:bg-orange-900/5">
        {carregandoFila ? (
          <LoadingSpinner text="Carregando fila..." centered />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Fila de Espera — {turmaCodigo}
              </h4>
              {resumoFila && (
                <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-yellow-600">{resumoFila.aguardando} aguardando</span>
                  <span className="text-blue-600">{resumoFila.convocados} convocados</span>
                  <span className="text-emerald-600">{resumoFila.matriculados} matriculados</span>
                  <span className="text-gray-400">{resumoFila.desistentes} desistentes</span>
                </div>
              )}
            </div>

            {fila.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Nenhum aluno na fila</p>
                <button
                  onClick={() => setModalFila({ turmaId, turmaCode: turmaCodigo, escolaId: turmaEscolaId })}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-4 h-4" /> Adicionar aluno à fila
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {fila.map(f => (
                  <div key={f.id} className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm shadow-sm transition ${
                    f.status === 'aguardando' ? 'bg-white dark:bg-slate-800' :
                    f.status === 'convocado' ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' :
                    f.status === 'matriculado' ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800' :
                    'bg-gray-50 dark:bg-slate-700/50 opacity-60'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        f.status === 'aguardando' ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' :
                        f.status === 'convocado' ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                        f.status === 'matriculado' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {f.posicao}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{f.aluno_nome}</span>
                          <span className="text-gray-400 text-xs flex-shrink-0">{f.aluno_codigo}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatarDiasEspera(f.dias_espera)}
                          </span>
                          {f.observacao && (
                            <span className="italic truncate max-w-[200px]" title={f.observacao}>
                              &quot;{f.observacao}&quot;
                            </span>
                          )}
                          {f.data_convocacao && f.status === 'convocado' && (
                            <span className="text-blue-500">
                              Convocado em {new Date(f.data_convocacao).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        f.status === 'aguardando' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        f.status === 'convocado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        f.status === 'matriculado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {f.status === 'aguardando' ? 'Aguardando' :
                         f.status === 'convocado' ? 'Convocado' :
                         f.status === 'matriculado' ? 'Matriculado' : 'Desistente'}
                      </span>

                      {f.status === 'aguardando' && (
                        <button
                          onClick={() => atualizarStatusFila(f.id, 'convocado')}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 transition"
                          title="Convocar aluno"
                        >
                          <Send className="w-3 h-3" /> Convocar
                        </button>
                      )}
                      {f.status === 'convocado' && (
                        <>
                          <button
                            onClick={() => atualizarStatusFila(f.id, 'matriculado')}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded hover:bg-emerald-100 transition"
                            title="Matricular (vincula à turma)"
                          >
                            <CheckCircle className="w-3 h-3" /> Matricular
                          </button>
                          <button
                            onClick={() => atualizarStatusFila(f.id, 'desistente')}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                            title="Marcar desistência"
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {(f.status === 'aguardando' || f.status === 'convocado') && (
                        confirmandoRemocao === f.id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button onClick={() => removerDaFila(f.id)} className="text-red-600 font-medium hover:text-red-700">Confirmar</button>
                            <button onClick={() => setConfirmandoRemocao(null)} className="text-gray-500">Cancelar</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmandoRemocao(f.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remover da fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
