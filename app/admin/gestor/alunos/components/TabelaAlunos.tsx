'use client'

import { Edit, Trash2, Eye, UserCircle, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Paginacao } from '@/lib/dados/types'
import { SITUACOES, Situacao } from '@/lib/situacoes-config'

interface Aluno {
  id: string
  codigo: string | null
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  situacao?: Situacao
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  escola_nome?: string
  polo_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

interface TabelaAlunosProps {
  alunos: Aluno[]
  carregando: boolean
  pesquisaIniciada: boolean
  paginacao: Paginacao
  onVerPerfil: (alunoId: string) => void
  onVerHistorico: (aluno: Aluno) => void
  onEditar: (aluno: Aluno) => void
  onExcluir: (id: string) => void
  onPaginaAnterior: () => void
  onProximaPagina: () => void
  onIrParaPagina: (pagina: number) => void
}

export default function TabelaAlunos({
  alunos, carregando, pesquisaIniciada, paginacao,
  onVerPerfil, onVerHistorico, onEditar, onExcluir,
  onPaginaAnterior, onProximaPagina, onIrParaPagina,
}: TabelaAlunosProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      {carregando ? (
        <LoadingSpinner text="Carregando alunos..." centered />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                      Codigo
                    </th>
                    <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                      Situacao
                    </th>
                    <th className="text-right py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {!pesquisaIniciada ? (
                <tr>
                  <td colSpan={4} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-base sm:text-lg font-medium">Selecione os filtros e clique em Pesquisar</p>
                    <p className="text-xs sm:text-sm mt-1 text-gray-400 dark:text-gray-500">Use os filtros acima para encontrar alunos</p>
                  </td>
                </tr>
              ) : alunos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                    <p className="text-base sm:text-lg font-medium">Nenhum aluno encontrado</p>
                    <p className="text-xs sm:text-sm mt-1 text-gray-400 dark:text-gray-500">Tente ajustar os filtros de busca</p>
                  </td>
                </tr>
              ) : (
                alunos.map((aluno) => {
                  const sit = SITUACOES.find(s => s.value === aluno.situacao)
                  return (
                    <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                        <span className="font-mono text-xs md:text-sm text-gray-900 dark:text-white">{aluno.codigo || '-'}</span>
                      </td>
                      <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                        <button
                          onClick={() => onVerPerfil(aluno.id)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium text-xs md:text-sm underline cursor-pointer text-left"
                          title="Ver perfil completo do aluno"
                        >
                          {aluno.nome}
                        </button>
                      </td>
                      <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                        {sit ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sit.cor} ${sit.corDark}`}>
                            {sit.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onVerPerfil(aluno.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Ver Perfil"
                          >
                            <UserCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onVerHistorico(aluno)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Historico"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditar(aluno)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onExcluir(aluno.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
              </table>
        </div>
      )}

      {/* Controles de Paginacao */}
      {!carregando && paginacao.totalPaginas > 1 && (
        <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex-1 flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Pagina {paginacao.pagina}</span> de {paginacao.totalPaginas}
              {' • '}
              <span className="font-medium">{paginacao.total}</span> alunos no total
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPaginaAnterior}
                disabled={!paginacao.temAnterior}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  paginacao.temAnterior
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                  let paginaNum: number
                  if (paginacao.totalPaginas <= 5) {
                    paginaNum = i + 1
                  } else if (paginacao.pagina <= 3) {
                    paginaNum = i + 1
                  } else if (paginacao.pagina >= paginacao.totalPaginas - 2) {
                    paginaNum = paginacao.totalPaginas - 4 + i
                  } else {
                    paginaNum = paginacao.pagina - 2 + i
                  }

                  if (paginaNum > paginacao.totalPaginas) return null

                  return (
                    <button
                      key={paginaNum}
                      onClick={() => onIrParaPagina(paginaNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        paginacao.pagina === paginaNum
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {paginaNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={onProximaPagina}
                disabled={!paginacao.temProxima}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  paginacao.temProxima
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Proxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
