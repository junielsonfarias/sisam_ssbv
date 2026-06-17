import { Users, ChevronLeft, ChevronRight, Trash2, MessageSquare } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getMetodoBadge, getStatusBadge, formatarHora, formatarConfianca } from './helpers'

interface RegistroFrequencia {
  id: string
  aluno_nome: string
  aluno_codigo: string
  turma_codigo: string
  hora_entrada: string | null
  hora_saida: string | null
  metodo: 'facial' | 'manual' | 'qrcode'
  confianca: number | null
  dispositivo: string | null
  status: 'presente' | 'ausente'
  justificativa: string | null
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

interface AttendanceTableProps {
  registros: RegistroFrequencia[]
  paginacao: Paginacao
  carregando: boolean
  excluindoId: string | null
  onExcluir: (id: string, nomeAluno: string) => void
  onAbrirJustificativa: (reg: RegistroFrequencia) => void
  onPaginar: (pagina: number) => void
}

export function AttendanceTable({
  registros, paginacao, carregando, excluindoId,
  onExcluir, onAbrirJustificativa, onPaginar,
}: AttendanceTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Registros de Frequencia
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {paginacao.total} registro(s)
        </span>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : registros.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">Nenhum registro encontrado</p>
          <p className="text-xs mt-1">Selecione os filtros e clique em Buscar</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Nome do Aluno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Codigo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Turma
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Hora Entrada
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Hora Saida
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Metodo
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Confianca
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Justificativa
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
                {registros.map((reg, idx) => {
                  const conf = formatarConfianca(reg.confianca)
                  return (
                    <tr
                      key={reg.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                        reg.status === 'ausente'
                          ? 'bg-red-50/50 dark:bg-red-900/10'
                          : idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {reg.aluno_nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {reg.aluno_codigo || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {reg.turma_codigo || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(reg.status || 'presente')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatarHora(reg.hora_entrada)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatarHora(reg.hora_saida)}
                      </td>
                      <td className="px-4 py-3">
                        {getMetodoBadge(reg.metodo)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {conf !== null ? (
                          <span className={`text-sm font-semibold ${
                            conf >= 90 ? 'text-green-600 dark:text-green-400' :
                            conf >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {Number(conf).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px]">
                        {reg.status === 'ausente' ? (
                          reg.justificativa ? (
                            <span
                              className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
                              title={reg.justificativa}
                              onClick={() => onAbrirJustificativa(reg)}
                            >
                              {reg.justificativa}
                            </span>
                          ) : (
                            <button
                              onClick={() => onAbrirJustificativa(reg)}
                              className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Justificar
                            </button>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onExcluir(reg.id, reg.aluno_nome)}
                          disabled={excluindoId === reg.id}
                          title="Excluir registro"
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {excluindoId === reg.id ? (
                            <LoadingSpinner />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginacao */}
          {paginacao.totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pagina {paginacao.pagina} de {paginacao.totalPaginas}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPaginar(paginacao.pagina - 1)}
                  disabled={paginacao.pagina <= 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {/* Numeros de paginas */}
                {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                  let pg: number
                  if (paginacao.totalPaginas <= 5) {
                    pg = i + 1
                  } else if (paginacao.pagina <= 3) {
                    pg = i + 1
                  } else if (paginacao.pagina >= paginacao.totalPaginas - 2) {
                    pg = paginacao.totalPaginas - 4 + i
                  } else {
                    pg = paginacao.pagina - 2 + i
                  }
                  return (
                    <button
                      key={pg}
                      onClick={() => onPaginar(pg)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                        pg === paginacao.pagina
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pg}
                    </button>
                  )
                })}
                <button
                  onClick={() => onPaginar(paginacao.pagina + 1)}
                  disabled={paginacao.pagina >= paginacao.totalPaginas}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
