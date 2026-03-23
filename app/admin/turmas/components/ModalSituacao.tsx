'use client'

import { X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Situacao, SITUACOES } from '@/lib/situacoes-config'
import { Aluno, TurmaDetalhe, getSituacaoConfig } from './types'

interface ModalSituacaoProps {
  mostrarModalSituacao: boolean
  alunoSituacao: Aluno | null
  novaSituacao: Situacao
  setNovaSituacao: (s: Situacao) => void
  dataSituacao: string
  setDataSituacao: (d: string) => void
  observacaoSituacao: string
  setObservacaoSituacao: (o: string) => void
  salvandoSituacao: boolean
  historicoSituacao: any[]
  carregandoHistorico: boolean
  tipoTransferencia: 'dentro_municipio' | 'fora_municipio'
  setTipoTransferencia: (t: 'dentro_municipio' | 'fora_municipio') => void
  escolaDestinoId: string
  setEscolaDestinoId: (id: string) => void
  escolaDestinoNome: string
  setEscolaDestinoNome: (nome: string) => void
  escolaOrigemId: string
  setEscolaOrigemId: (id: string) => void
  escolaOrigemNome: string
  setEscolaOrigemNome: (nome: string) => void
  escolasLista: { id: string; nome: string }[]
  detalhesTurma: TurmaDetalhe | null
  onFechar: () => void
  onSalvar: () => void
}

export function ModalSituacao({
  mostrarModalSituacao,
  alunoSituacao,
  novaSituacao,
  setNovaSituacao,
  dataSituacao,
  setDataSituacao,
  observacaoSituacao,
  setObservacaoSituacao,
  salvandoSituacao,
  historicoSituacao,
  carregandoHistorico,
  tipoTransferencia,
  setTipoTransferencia,
  escolaDestinoId,
  setEscolaDestinoId,
  escolaDestinoNome,
  setEscolaDestinoNome,
  escolaOrigemId,
  setEscolaOrigemId,
  escolaOrigemNome,
  setEscolaOrigemNome,
  escolasLista,
  detalhesTurma,
  onFechar,
  onSalvar,
}: ModalSituacaoProps) {
  if (!mostrarModalSituacao || !alunoSituacao) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4" onClick={onFechar}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Situação do Aluno</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{alunoSituacao.nome}</p>
            </div>
            <button
              onClick={onFechar}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Situação atual e datas */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Atual:</span>
              {(() => {
                const cfg = getSituacaoConfig(alunoSituacao.situacao)
                return (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cor} ${cfg.corDark}`}>
                    {cfg.label}
                  </span>
                )
              })()}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
              {alunoSituacao.data_matricula && (
                <span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Matrícula:</span>{' '}
                  {new Date(alunoSituacao.data_matricula).toLocaleDateString('pt-BR')}
                </span>
              )}
              {alunoSituacao.data_transferencia && (
                <span>
                  <span className="font-medium text-red-600 dark:text-red-400">Saída:</span>{' '}
                  {new Date(alunoSituacao.data_transferencia).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Formulário de mudança */}
          <div className="px-5 py-4 space-y-3 border-b border-gray-100 dark:border-slate-700/50">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alterar Situação</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SITUACOES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setNovaSituacao(s.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                    novaSituacao === s.value
                      ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 ' + s.cor + ' ' + s.corDark
                      : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Campos de transferência */}
            {novaSituacao === 'transferido' && (
              <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Dados da Transferência</h4>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoTransferencia('dentro_municipio')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      tipoTransferencia === 'dentro_municipio'
                        ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Dentro do Município
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoTransferencia('fora_municipio')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      tipoTransferencia === 'fora_municipio'
                        ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Fora do Município
                  </button>
                </div>

                {tipoTransferencia === 'dentro_municipio' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola Destino</label>
                    <select
                      value={escolaDestinoId}
                      onChange={e => setEscolaDestinoId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione a escola destino</option>
                      {escolasLista
                        .filter(e => detalhesTurma && e.id !== detalhesTurma.turma.escola_id)
                        .map(e => (
                          <option key={e.id} value={e.id}>{e.nome}</option>
                        ))
                      }
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da Escola Destino</label>
                    <input
                      type="text"
                      value={escolaDestinoNome}
                      onChange={e => setEscolaDestinoNome(e.target.value)}
                      placeholder="Nome da escola fora do município"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Campos de reingresso (entrada de aluno transferido) */}
            {novaSituacao === 'cursando' && alunoSituacao.situacao === 'transferido' && (
              <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Dados de Origem (Reingresso)</h4>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoTransferencia('dentro_municipio')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      tipoTransferencia === 'dentro_municipio'
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Dentro do Município
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoTransferencia('fora_municipio')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      tipoTransferencia === 'fora_municipio'
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Fora do Município
                  </button>
                </div>

                {tipoTransferencia === 'dentro_municipio' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola de Origem</label>
                    <select
                      value={escolaOrigemId}
                      onChange={e => setEscolaOrigemId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione a escola de origem</option>
                      {escolasLista
                        .filter(e => detalhesTurma && e.id !== detalhesTurma.turma.escola_id)
                        .map(e => (
                          <option key={e.id} value={e.id}>{e.nome}</option>
                        ))
                      }
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da Escola de Origem</label>
                    <input
                      type="text"
                      value={escolaOrigemNome}
                      onChange={e => setEscolaOrigemNome(e.target.value)}
                      placeholder="Nome da escola fora do município"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {['transferido', 'abandono'].includes(novaSituacao) ? 'Data de Saída' : novaSituacao === 'cursando' && alunoSituacao.situacao === 'transferido' ? 'Data de Entrada' : 'Data'}
                </label>
                <input
                  type="date"
                  value={dataSituacao}
                  onChange={e => setDataSituacao(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observação</label>
                <input
                  type="text"
                  value={observacaoSituacao}
                  onChange={e => setObservacaoSituacao(e.target.value)}
                  placeholder="Ex: Transferido para escola X"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            <button
              onClick={onSalvar}
              disabled={
                salvandoSituacao ||
                novaSituacao === alunoSituacao.situacao ||
                (novaSituacao === 'transferido' && tipoTransferencia === 'dentro_municipio' && !escolaDestinoId) ||
                (novaSituacao === 'transferido' && tipoTransferencia === 'fora_municipio' && !escolaDestinoNome.trim())
              }
              className="w-full px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {salvandoSituacao ? 'Salvando...' : 'Confirmar Alteração'}
            </button>
          </div>

          {/* Histórico */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Histórico</h3>
            {carregandoHistorico ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : historicoSituacao.length > 0 ? (
              <div className="space-y-2">
                {historicoSituacao.map((h: any) => {
                  const cfg = getSituacaoConfig(h.situacao)
                  const cfgAnterior = h.situacao_anterior ? getSituacaoConfig(h.situacao_anterior) : null
                  return (
                    <div key={h.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-slate-700/40 last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cfgAnterior && (
                            <>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfgAnterior.cor} ${cfgAnterior.corDark} opacity-60`}>
                                {cfgAnterior.label}
                              </span>
                              <span className="text-xs text-gray-400">→</span>
                            </>
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cor} ${cfg.corDark}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {/* Info de transferência */}
                        {h.tipo_movimentacao && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              h.tipo_movimentacao === 'saida'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {h.tipo_movimentacao === 'saida' ? 'Saída' : 'Entrada'}
                            </span>
                            {h.tipo_transferencia && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400">
                                {h.tipo_transferencia === 'dentro_municipio' ? 'Dentro do Município' : 'Fora do Município'}
                              </span>
                            )}
                            {(h.escola_destino_ref_nome || h.escola_destino_nome) && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                → {h.escola_destino_ref_nome || h.escola_destino_nome}
                              </span>
                            )}
                            {(h.escola_origem_ref_nome || h.escola_origem_nome) && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                ← {h.escola_origem_ref_nome || h.escola_origem_nome}
                              </span>
                            )}
                          </div>
                        )}
                        {h.observacao && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.observacao}</p>
                        )}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(h.data).toLocaleDateString('pt-BR')}
                          {h.registrado_por_nome && ` — ${h.registrado_por_nome}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Nenhum registro no histórico</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
