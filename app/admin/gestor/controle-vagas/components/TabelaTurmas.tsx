import { Users, Edit3, Save, X, Plus } from 'lucide-react'
import { TurmaVaga, ItemFila, ResumoFila } from './types'
import { getCorOcupacao, getCorTextoOcupacao } from './helpers'
import FilaEspera, { FilaBotao } from './FilaEspera'

interface TabelaTurmasProps {
  turmasFiltradas: TurmaVaga[]
  formatSerie: (s: string) => string
  modoLote: boolean
  capacidadesLote: Record<string, number>
  setCapacidadesLote: (v: Record<string, number>) => void
  editandoId: string
  setEditandoId: (v: string) => void
  novaCapacidade: number
  setNovaCapacidade: (v: number) => void
  salvando: boolean
  salvarCapacidade: (turmaId: string) => void
  isAdmin: boolean
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
}

export default function TabelaTurmas({
  turmasFiltradas, formatSerie, modoLote, capacidadesLote, setCapacidadesLote,
  editandoId, setEditandoId, novaCapacidade, setNovaCapacidade,
  salvando, salvarCapacidade, isAdmin,
  filaAberta, fila, resumoFila, carregandoFila,
  confirmandoRemocao, setConfirmandoRemocao,
  abrirFila, atualizarStatusFila, removerDaFila, setModalFila
}: TabelaTurmasProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700 border-b dark:border-slate-600">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Turma</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Escola</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Série</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Capacidade</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Matriculados</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Vagas</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Ocupação</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Fila</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmasFiltradas.map(t => (
              <>
                <tr key={t.id} className={`border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                  t.vagas_disponiveis <= 0 ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                }`}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{t.codigo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden lg:table-cell">{t.escola_nome}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{formatSerie(t.serie)}</td>
                  <td className="px-4 py-3 text-center">
                    {modoLote ? (
                      <input
                        type="number"
                        value={capacidadesLote[t.id] || t.capacidade_maxima}
                        onChange={e => setCapacidadesLote({ ...capacidadesLote, [t.id]: parseInt(e.target.value) || 0 })}
                        className="w-16 border rounded px-2 py-0.5 text-center text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        min={1} max={100}
                      />
                    ) : editandoId === t.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={novaCapacidade}
                          onChange={e => setNovaCapacidade(parseInt(e.target.value) || 0)}
                          className="w-16 border rounded px-2 py-0.5 text-center text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          min={1} max={100}
                        />
                        <button onClick={() => salvarCapacidade(t.id)} disabled={salvando} className="text-emerald-600 hover:text-emerald-700 p-1">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditandoId('')} className="text-gray-400 hover:text-gray-600 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{t.capacidade_maxima}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200">{t.alunos_matriculados}</td>
                  <td className={`px-4 py-3 text-center font-bold ${
                    t.vagas_disponiveis <= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {t.vagas_disponiveis}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${getCorOcupacao(t.percentual_ocupacao)}`}
                          style={{ width: `${Math.min(100, t.percentual_ocupacao)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-9 text-right ${getCorTextoOcupacao(t.percentual_ocupacao)}`}>
                        {t.percentual_ocupacao}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FilaBotao
                      filaEspera={t.fila_espera}
                      turmaId={t.id}
                      filaAberta={filaAberta}
                      abrirFila={abrirFila}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isAdmin && !modoLote && (
                        <button
                          onClick={() => { setEditandoId(t.id); setNovaCapacidade(t.capacidade_maxima) }}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1"
                          title="Editar capacidade"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setModalFila({ turmaId: t.id, turmaCode: t.codigo, escolaId: t.escola_id })}
                        className="text-orange-600 hover:text-orange-700 dark:text-orange-400 p-1"
                        title="Adicionar à fila de espera"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Fila de espera expandida */}
                <FilaEspera
                  turmaId={t.id}
                  turmaCodigo={t.codigo}
                  turmaEscolaId={t.escola_id}
                  filaAberta={filaAberta}
                  fila={fila}
                  resumoFila={resumoFila}
                  carregandoFila={carregandoFila}
                  confirmandoRemocao={confirmandoRemocao}
                  setConfirmandoRemocao={setConfirmandoRemocao}
                  abrirFila={abrirFila}
                  atualizarStatusFila={atualizarStatusFila}
                  removerDaFila={removerDaFila}
                  setModalFila={setModalFila}
                  filaEspera={t.fila_espera}
                />
              </>
            ))}
          </tbody>
        </table>
      </div>

      {turmasFiltradas.length === 0 && (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma turma encontrada</p>
        </div>
      )}
    </div>
  )
}
