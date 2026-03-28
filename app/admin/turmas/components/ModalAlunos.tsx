'use client'

import { X, GraduationCap, School, Calendar, Users, Printer } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Aluno, TurmaDetalhe, getSituacaoConfig, calcularIdade } from './types'

const SERIE_COLORS: Record<string, string> = {
  CRE: 'bg-pink-100 text-pink-700 ring-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:ring-pink-500/30',
  PRE1: 'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-500/30',
  PRE2: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-500/30',
  '1': 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30',
  '2': 'bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:ring-cyan-500/30',
  '3': 'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-500/30',
  '4': 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/30',
  '5': 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30',
  '6': 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30',
  '7': 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-500/30',
  '8': 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30',
  '9': 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-500/30',
}

function getSerieColor(serie: string | null): string {
  if (!serie) return 'bg-gray-100 text-gray-500 ring-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:ring-slate-600'
  return SERIE_COLORS[serie] || 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:ring-slate-600'
}

function formatNascimento(data: string | null): string {
  if (!data) return '-'
  const d = new Date(data)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

interface ModalAlunosProps {
  mostrarModalAlunos: boolean
  detalhesTurma: TurmaDetalhe | null
  carregandoAlunos: boolean
  totalPcd: number
  formatSerie: (serie: string) => string
  onFechar: () => void
  onAbrirSituacao: (aluno: Aluno) => void
  onImprimir: () => void
}

export function ModalAlunos({
  mostrarModalAlunos,
  detalhesTurma,
  carregandoAlunos,
  totalPcd,
  formatSerie,
  onFechar,
  onAbrirSituacao,
  onImprimir,
}: ModalAlunosProps) {
  if (!mostrarModalAlunos) return null

  const isMulti = detalhesTurma?.turma.multiserie || detalhesTurma?.turma.multietapa

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onFechar}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com gradiente */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-700 dark:to-blue-600">
          {/* Botão fechar */}
          <button
            onClick={onFechar}
            className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {detalhesTurma ? (
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Turma {detalhesTurma.turma.codigo}
                  </h2>
                  {detalhesTurma.turma.nome && (
                    <p className="text-sm text-white/70">{detalhesTurma.turma.nome}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/80 mt-2">
                <School className="w-3.5 h-3.5" />
                <span>
                  {detalhesTurma.turma.escola_nome}
                  {detalhesTurma.turma.polo_nome && ` - ${detalhesTurma.turma.polo_nome}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-lg font-bold text-white">Alunos da Turma</h2>
            </div>
          )}

          {/* Stat cards no footer do header */}
          {detalhesTurma && (
            <div className="flex gap-2 px-5 pb-4 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                <Calendar className="w-3.5 h-3.5" />
                {formatSerie(detalhesTurma.turma.serie)} - {detalhesTurma.turma.ano_letivo}
              </div>
              {isMulti && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/25 backdrop-blur-sm text-xs font-semibold text-amber-100">
                  {detalhesTurma.turma.multiserie ? 'Multisseriada' : 'Multietapa'}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                <Users className="w-3.5 h-3.5" />
                {detalhesTurma.total} aluno{detalhesTurma.total !== 1 ? 's' : ''}
              </div>
              {totalPcd > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/25 backdrop-blur-sm text-xs font-semibold text-amber-100">
                  PCD: {totalPcd}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body - Tabela de alunos */}
        <div className="flex-1 overflow-y-auto">
          {carregandoAlunos ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <LoadingSpinner />
              <span className="text-sm text-gray-400 dark:text-gray-500">Carregando alunos...</span>
            </div>
          ) : detalhesTurma && detalhesTurma.alunos.length > 0 ? (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-slate-700/60 border-b border-gray-200 dark:border-slate-600">
                  <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5 w-14">
                    Ord.
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5">
                    Nome do Aluno
                  </th>
                  {isMulti && (
                    <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                      Série
                    </th>
                  )}
                  <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                    Nascimento
                  </th>
                  <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-16">
                    Idade
                  </th>
                  <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                    Matrícula
                  </th>
                  <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-24">
                    Situação
                  </th>
                  <th className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2.5 w-14">
                    PCD
                  </th>
                </tr>
              </thead>
              <tbody>
                {detalhesTurma.alunos.map((aluno, idx) => {
                  const idade = calcularIdade(aluno.data_nascimento)
                  const isEven = idx % 2 === 0
                  const sitConfig = getSituacaoConfig(aluno.situacao)
                  const isInativo = ['transferido', 'abandono'].includes(aluno.situacao || '')
                  return (
                    <tr
                      key={aluno.id}
                      className={`border-b border-gray-100 dark:border-slate-700/40 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 ${
                        isInativo
                          ? 'bg-gray-100/70 dark:bg-slate-900/40 opacity-75'
                          : isEven ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'
                      }`}
                    >
                      {/* Ordem */}
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          isInativo
                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                            : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Nome */}
                      <td className="px-2 py-3">
                        <span className={`text-sm font-medium whitespace-nowrap ${isInativo ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
                          {aluno.nome}
                        </span>
                        {isInativo && aluno.data_transferencia && (
                          <span className="block text-[10px] text-red-500 dark:text-red-400 mt-0.5 whitespace-nowrap">
                            {aluno.situacao === 'transferido' ? 'Transferido' : 'Abandono'} em {new Date(aluno.data_transferencia).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>

                      {/* Série (só em multiserie/multietapa) — cores por série */}
                      {isMulti && (
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${
                            isInativo
                              ? 'bg-gray-100 text-gray-400 ring-gray-200 dark:bg-slate-700 dark:text-gray-500 dark:ring-slate-600'
                              : getSerieColor(aluno.serie)
                          }`}>
                            {aluno.serie ? formatSerie(aluno.serie) : '-'}
                          </span>
                        </td>
                      )}

                      {/* Data de Nascimento */}
                      <td className="px-2 py-3 text-center">
                        <span className={`text-xs ${isInativo ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                          {formatNascimento(aluno.data_nascimento)}
                        </span>
                      </td>

                      {/* Idade */}
                      <td className="px-2 py-3 text-center">
                        {idade !== null ? (
                          <span className={`text-sm ${isInativo ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {idade}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>

                      {/* Data Matrícula */}
                      <td className="px-2 py-3 text-center">
                        {aluno.data_matricula ? (
                          <span className={`text-xs ${isInativo ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {new Date(aluno.data_matricula).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => onAbrirSituacao(aluno)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity ${sitConfig.cor} ${sitConfig.corDark}`}
                          title="Alterar situação"
                        >
                          {sitConfig.label}
                        </button>
                      </td>

                      {/* PCD */}
                      <td className="px-2 py-3 text-center">
                        {aluno.pcd ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30">
                            PCD
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Nenhum aluno matriculado nesta turma</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {detalhesTurma && detalhesTurma.alunos.length > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {(() => {
                const ativos = detalhesTurma.alunos.filter(a => !['transferido', 'abandono'].includes(a.situacao || '')).length
                const inativos = detalhesTurma.alunos.length - ativos
                return (
                  <>
                    <span className="font-medium">{ativos} aluno{ativos !== 1 ? 's' : ''}</span>
                    {inativos > 0 && (
                      <>
                        <span className="w-px h-3 bg-gray-300 dark:bg-slate-600" />
                        <span className="text-gray-400 dark:text-gray-500">{inativos} {inativos === 1 ? 'transferido/saiu' : 'transferidos/saíram'}</span>
                      </>
                    )}
                  </>
                )
              })()}
              {totalPcd > 0 && (
                <>
                  <span className="w-px h-3 bg-gray-300 dark:bg-slate-600" />
                  <span>{totalPcd} PCD</span>
                </>
              )}
            </div>
            <button
              onClick={onImprimir}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relação
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
