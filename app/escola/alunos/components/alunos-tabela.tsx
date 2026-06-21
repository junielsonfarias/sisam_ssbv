'use client'

import { Eye, School, UserCircle, Edit3, Trash2 } from 'lucide-react'
import { SITUACOES } from '@/lib/situacoes-config'
import type { Aluno } from './types'

interface AlunosTabelaProps {
  carregando: boolean
  alunosFiltrados: Aluno[]
  busca: string
  filtroTurma: string
  filtroSerie: string
  filtroAno: string
  carregandoHistorico: boolean
  confirmandoExclusao: string | null
  formatSerie: (serie: string | null | undefined) => string
  onVerPerfil: (id: string) => void
  onVerHistorico: (aluno: Aluno) => void
  onEditar: (aluno: Aluno) => void
  onExcluir: (id: string) => void
  onConfirmarExclusao: (id: string | null) => void
}

const getSituacaoConfig = (situacao: string | null | undefined) => {
  const cfg = SITUACOES.find(s => s.value === situacao)
  return cfg || SITUACOES.find(s => s.value === 'cursando')!
}

export function AlunosTabela({
  carregando, alunosFiltrados, busca, filtroTurma, filtroSerie, filtroAno,
  carregandoHistorico, confirmandoExclusao, formatSerie,
  onVerPerfil, onVerHistorico, onEditar, onExcluir, onConfirmarExclusao,
}: AlunosTabelaProps) {
  if (carregando) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Carregando alunos...</p>
      </div>
    )
  }

  if (alunosFiltrados.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
        <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum aluno encontrado</p>
        <p className="text-sm text-gray-400 mt-2">
          {busca || filtroTurma || filtroSerie || filtroAno ? 'Tente ajustar os filtros' : 'Clique em "Novo Aluno" para cadastrar'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-indigo-50 dark:bg-indigo-900/30">
            <tr>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden sm:table-cell">Código</th>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Nome</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Turma</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden md:table-cell">Série</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Situação</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {alunosFiltrados.map(aluno => {
              const sitCfg = getSituacaoConfig(aluno.situacao)
              return (
                <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden sm:table-cell">
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-mono">{aluno.codigo || '-'}</span>
                  </td>
                  <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap">
                    <button
                      onClick={() => onVerPerfil(aluno.id)}
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs md:text-sm underline cursor-pointer text-left truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
                      title="Ver perfil completo"
                    >
                      {aluno.nome}
                    </button>
                    {aluno.pcd && (
                      <span className="ml-1 text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">PCD</span>
                    )}
                  </td>
                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo || '-'}</span>
                  </td>
                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden md:table-cell">
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{formatSerie(aluno.serie)}</span>
                  </td>
                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sitCfg.cor}`}>
                      {sitCfg.label}
                    </span>
                  </td>
                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onVerPerfil(aluno.id)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        title="Ver perfil"
                      >
                        <UserCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => onVerHistorico(aluno)}
                        disabled={carregandoHistorico}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50"
                        title="Ver histórico"
                      >
                        <Eye className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => onEditar(aluno)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/30"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      {confirmandoExclusao === aluno.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onExcluir(aluno.id)}
                            className="text-red-600 hover:text-red-800 p-1 text-xs font-medium"
                            title="Confirmar"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => onConfirmarExclusao(null)}
                            className="text-gray-500 hover:text-gray-700 p-1 text-xs"
                            title="Cancelar"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onConfirmarExclusao(aluno.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
        {alunosFiltrados.length} aluno(s) encontrado(s)
      </div>
    </div>
  )
}
