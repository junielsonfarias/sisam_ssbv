'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useState, useEffect } from 'react'
import { Database, Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, StopCircle } from 'lucide-react'
import { useToast } from '@/components/toast'

interface Importacao {
  id: string
  nome_arquivo: string
  ano_letivo: string
  total_linhas: number
  linhas_processadas: number
  linhas_com_erro: number
  status: string
  polos_criados: number
  polos_existentes: number
  escolas_criadas: number
  escolas_existentes: number
  turmas_criadas: number
  turmas_existentes: number
  alunos_criados: number
  alunos_existentes: number
  questoes_criadas: number
  questoes_existentes: number
  resultados_novos: number
  resultados_duplicados: number
  criado_em: string
  concluido_em: string | null
  usuario_nome: string
  usuario_email: string
}

export default function ImportacoesPage() {
  const toast = useToast()
  const [importacoes, setImportacoes] = useState<Importacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({
    ano_letivo: '',
    status: '',
  })
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 20,
    total: 0,
    total_paginas: 0,
  })
  const [cancelando, setCancelando] = useState(false)

  const carregarImportacoes = async () => {
    setCarregando(true)
    setErro('')

    try {
      const params = new URLSearchParams()
      if (filtros.ano_letivo) params.append('ano_letivo', filtros.ano_letivo)
      if (filtros.status) params.append('status', filtros.status)
      params.append('page', paginacao.pagina.toString())
      params.append('limit', paginacao.limite.toString())

      const response = await fetch(`/api/admin/importacoes?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setImportacoes(data.importacoes)
        setPaginacao(data.paginacao)
      } else {
        setErro(data.mensagem || 'Erro ao carregar histórico')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarImportacoes()
  }, [filtros.ano_letivo, filtros.status, paginacao.pagina])

  const formatarData = (data: string | null) => {
    if (!data) return '-'
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const cancelarTodasEmProcessamento = async () => {
    if (!confirm('Tem certeza que deseja cancelar todas as importações em processamento? Esta ação não pode ser desfeita.')) {
      return
    }

    setCancelando(true)
    setErro('')

    try {
      const response = await fetch('/api/admin/importacoes/cancelar-todas', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.mensagem || 'Importações canceladas com sucesso!')
        // Recarregar a lista
        carregarImportacoes()
      } else {
        toast.error(data.mensagem || 'Erro ao cancelar importações')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCancelando(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      processando: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200',
      concluido: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200',
      erro: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200',
      pausado: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200',
      cancelado: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    const icons = {
      processando: Clock,
      concluido: CheckCircle,
      erro: XCircle,
      pausado: AlertCircle,
      cancelado: XCircle,
    }

    const Icon = icons[status as keyof typeof icons] || AlertCircle
    const className = classes[status as keyof typeof classes] || classes.processando

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">
            Histórico de Importações
          </h1>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ano_letivo" className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  id="ano_letivo"
                  type="text"
                  value={filtros.ano_letivo}
                  onChange={(e) => {
                    setFiltros({ ...filtros, ano_letivo: e.target.value })
                    setPaginacao({ ...paginacao, pagina: 1 })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2024"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={filtros.status}
                  onChange={(e) => {
                    setFiltros({ ...filtros, status: e.target.value })
                    setPaginacao({ ...paginacao, pagina: 1 })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="processando">Processando</option>
                  <option value="concluido">Concluído</option>
                  <option value="erro">Erro</option>
                  <option value="pausado">Pausado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={cancelarTodasEmProcessamento}
                disabled={cancelando}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <StopCircle className="w-4 h-4 mr-2" />
                    Cancelar Todas em Processamento
                  </>
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando histórico...</p>
            </div>
          ) : importacoes.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Nenhuma importação encontrada</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Arquivo / Ano
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progresso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estatísticas
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:divide-slate-700">
                      {importacoes.map((imp) => (
                        <tr key={imp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                  {imp.nome_arquivo}
                                </div>
                                {imp.ano_letivo && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Ano: {imp.ano_letivo}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {getStatusBadge(imp.status)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {imp.linhas_processadas} / {imp.total_linhas}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{
                                  width: `${imp.total_linhas > 0 ? (imp.linhas_processadas / imp.total_linhas) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            {imp.linhas_com_erro > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                {imp.linhas_com_erro} erro(s)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs space-y-1">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Polos:</span>{' '}
                                  <span className="font-medium">{imp.polos_criados + imp.polos_existentes}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Escolas:</span>{' '}
                                  <span className="font-medium">{imp.escolas_criadas + imp.escolas_existentes}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Turmas:</span>{' '}
                                  <span className="font-medium">{imp.turmas_criadas + imp.turmas_existentes}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Alunos:</span>{' '}
                                  <span className="font-medium">{imp.alunos_criados + imp.alunos_existentes}</span>
                                </div>
                              </div>
                              <div className="pt-1 border-t border-gray-200 dark:border-slate-700">
                                <span className="text-gray-500 dark:text-gray-400">Resultados:</span>{' '}
                                <span className="text-green-600 font-medium">{imp.resultados_novos}</span> novos
                                {imp.resultados_duplicados > 0 && (
                                  <>
                                    {' / '}
                                    <span className="text-gray-500 dark:text-gray-400">{imp.resultados_duplicados}</span> duplicados
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <div>
                                <div>Criado: {formatarData(imp.criado_em)}</div>
                                {imp.concluido_em && (
                                  <div className="text-xs mt-1">
                                    Concluído: {formatarData(imp.concluido_em)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div>{imp.usuario_nome}</div>
                            <div className="text-xs">{imp.usuario_email}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação */}
              {paginacao.total_paginas > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {((paginacao.pagina - 1) * paginacao.limite) + 1} a{' '}
                    {Math.min(paginacao.pagina * paginacao.limite, paginacao.total)} de {paginacao.total} importações
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaginacao({ ...paginacao, pagina: paginacao.pagina - 1 })}
                      disabled={paginacao.pagina === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginacao({ ...paginacao, pagina: paginacao.pagina + 1 })}
                      disabled={paginacao.pagina >= paginacao.total_paginas}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

