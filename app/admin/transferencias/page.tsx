'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Search, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Transferencia {
  id: string
  data: string
  tipo_movimentacao: 'saida' | 'entrada'
  tipo_transferencia: 'dentro_municipio' | 'fora_municipio' | null
  observacao: string | null
  situacao: string
  situacao_anterior: string | null
  escola_destino_nome: string | null
  escola_origem_nome: string | null
  aluno_id: string
  aluno_nome: string
  serie: string | null
  ano_letivo: string | null
  escola_nome: string
  escola_id: string
  polo_nome: string | null
  polo_id: string | null
  escola_destino_ref_nome: string | null
  escola_origem_ref_nome: string | null
}

interface Resumo {
  total_saidas: number
  total_entradas: number
  saldo: number
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

interface PoloSimples {
  id: string
  nome: string
}

interface EscolaSimples {
  id: string
  nome: string
  polo_id?: string
}

export default function TransferenciasPage() {
  const toast = useToast()
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [resumo, setResumo] = useState<Resumo>({ total_saidas: 0, total_entradas: 0, saldo: 0 })
  const [carregando, setCarregando] = useState(false)
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])

  // Filtros
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroPolo, setFiltroPolo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroMovimentacao, setFiltroMovimentacao] = useState('')
  const [filtroTipoTransf, setFiltroTipoTransf] = useState('')

  // Paginação
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1, limite: 50, total: 0, totalPaginas: 0, temProxima: false, temAnterior: false
  })
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Carregar polos e escolas
  useEffect(() => {
    const carregarFiltros = async () => {
      try {
        const [resPolos, resEscolas] = await Promise.all([
          fetch('/api/admin/polos'),
          fetch('/api/admin/escolas'),
        ])
        const dataPolos = await resPolos.json()
        const dataEscolas = await resEscolas.json()
        setPolos(dataPolos.polos || dataPolos || [])
        setEscolas(dataEscolas.escolas || dataEscolas || [])
      } catch {
        // silencioso
      }
    }
    carregarFiltros()
  }, [])

  const carregarTransferencias = useCallback(async (pagina = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.set('pagina', pagina.toString())
      params.set('limite', '50')
      if (dataInicio) params.set('data_inicio', dataInicio)
      if (dataFim) params.set('data_fim', dataFim)
      if (filtroPolo) params.set('polo_id', filtroPolo)
      if (filtroEscola) params.set('escola_id', filtroEscola)
      if (filtroMovimentacao) params.set('tipo_movimentacao', filtroMovimentacao)
      if (filtroTipoTransf) params.set('tipo_transferencia', filtroTipoTransf)

      const res = await fetch(`/api/admin/transferencias?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao carregar transferências')
        return
      }

      setTransferencias(data.transferencias || [])
      setResumo(data.resumo || { total_saidas: 0, total_entradas: 0, saldo: 0 })
      setPaginacao(data.paginacao || { pagina: 1, limite: 50, total: 0, totalPaginas: 0, temProxima: false, temAnterior: false })
      setPaginaAtual(pagina)
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [dataInicio, dataFim, filtroPolo, filtroEscola, filtroMovimentacao, filtroTipoTransf, toast])

  const handleBuscar = () => {
    carregarTransferencias(1)
  }

  const escolasFiltradas = filtroPolo
    ? escolas.filter(e => e.polo_id === filtroPolo)
    : escolas

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Transferências</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acompanhe as movimentações de alunos entre escolas
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Polo</label>
              <select
                value={filtroPolo}
                onChange={e => { setFiltroPolo(e.target.value); setFiltroEscola('') }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                {polos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
              <select
                value={filtroEscola}
                onChange={e => setFiltroEscola(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {escolasFiltradas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Movimentação</label>
              <select
                value={filtroMovimentacao}
                onChange={e => setFiltroMovimentacao(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                <option value="saida">Saídas</option>
                <option value="entrada">Entradas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
              <select
                value={filtroTipoTransf}
                onChange={e => setFiltroTipoTransf(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                <option value="dentro_municipio">Dentro do Município</option>
                <option value="fora_municipio">Fora do Município</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleBuscar}
              disabled={carregando}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        {paginacao.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <ArrowUpRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Saídas</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{resumo.total_saidas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Entradas</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{resumo.total_entradas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${resumo.saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {resumo.saldo >= 0
                    ? <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  }
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo</p>
                  <p className={`text-xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {resumo.saldo > 0 ? '+' : ''}{resumo.saldo}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de resultados */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {carregando ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : transferencias.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 dark:text-gray-500">
                {paginacao.total === 0 && !carregando
                  ? 'Use os filtros acima e clique em "Buscar" para visualizar as transferências'
                  : 'Nenhuma transferência encontrada para os filtros selecionados'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Aluno</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Escola</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden lg:table-cell">Polo</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Tipo</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden sm:table-cell">Município</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Origem/Destino</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden xl:table-cell">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {transferencias.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">{t.aluno_nome}</p>
                            {t.serie && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t.serie}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{t.escola_nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">{t.polo_nome || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.tipo_movimentacao === 'saida'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {t.tipo_movimentacao === 'saida'
                              ? <><ArrowUpRight className="w-3 h-3" /> Saída</>
                              : <><ArrowDownLeft className="w-3 h-3" /> Entrada</>
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          {t.tipo_transferencia ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.tipo_transferencia === 'dentro_municipio'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              {t.tipo_transferencia === 'dentro_municipio' ? 'Dentro' : 'Fora'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {t.tipo_movimentacao === 'saida'
                            ? (t.escola_destino_ref_nome || t.escola_destino_nome || '-')
                            : (t.escola_origem_ref_nome || t.escola_origem_nome || '-')
                          }
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(t.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell max-w-[200px] truncate">
                          {t.observacao || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {paginacao.totalPaginas > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mostrando {((paginaAtual - 1) * paginacao.limite) + 1} a {Math.min(paginaAtual * paginacao.limite, paginacao.total)} de {paginacao.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => carregarTransferencias(paginaAtual - 1)}
                      disabled={!paginacao.temAnterior}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {paginaAtual} / {paginacao.totalPaginas}
                    </span>
                    <button
                      onClick={() => carregarTransferencias(paginaAtual + 1)}
                      disabled={!paginacao.temProxima}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
