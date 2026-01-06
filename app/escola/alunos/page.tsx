'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalHistoricoAluno from '@/components/modal-historico-aluno'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Search, Eye, School } from 'lucide-react'
import { useToast } from '@/components/toast'

interface Aluno {
  id: string
  codigo: string | null
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  escola_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

// Função para normalizar série
const normalizarSerie = (serie: string | null | undefined): string => {
  if (!serie) return ''
  const trim = serie.trim()
  const match = trim.match(/^(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    return `${num}º Ano`
  }
  return trim
}

// Função para ordenar séries numericamente (2º, 3º, 5º, 6º, 7º, 8º, 9º)
const ordenarSeries = (series: string[]): string[] => {
  return series.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0')
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0')
    return numA - numB
  })
}

export default function AlunosEscolaPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState<string>('escola')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [mostrarModalHistorico, setMostrarModalHistorico] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState<any>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Ref para AbortController - evita memory leaks em fetch
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar', { signal: abortController.signal })
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          // Carregar nome da escola e polo
          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal: abortController.signal })
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Erro ao carregar dados iniciais:', error)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setCarregando(false)
        }
      }
    }
    carregarDadosIniciais()

    return () => {
      abortController.abort()
    }
  }, [])

  // Carregar séries disponíveis quando escolaId mudar
  useEffect(() => {
    const carregarSeries = async () => {
      if (!escolaId) return

      try {
        // Buscar todas as séries distintas da escola
        const response = await fetch(`/api/admin/alunos?escola_id=${escolaId}&limite=200`)
        const data = await response.json()

        if (data.alunos && Array.isArray(data.alunos)) {
          const series = data.alunos
            .map((a: Aluno) => a.serie)
            .filter((serie: string | null): serie is string => Boolean(serie))
            .map((serie: string) => normalizarSerie(serie))
            .filter((serie: string) => serie !== '')

          const seriesUnicas = [...new Set(series)] as string[]
          setSeriesDisponiveis(ordenarSeries(seriesUnicas))
        }
      } catch (error) {
        console.error('Erro ao carregar séries:', error)
      }
    }

    carregarSeries()
  }, [escolaId])

  useEffect(() => {
    if (escolaId && filtroSerie) {
      carregarTurmas()
    } else {
      setTurmas([])
      setFiltroTurma('')
    }
  }, [filtroSerie, escolaId, filtroAno])

  const carregarTurmas = async () => {
    if (!escolaId || !filtroSerie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('escolas_ids', escolaId)
      params.append('serie', filtroSerie)
      
      if (filtroAno) {
        params.append('ano_letivo', filtroAno)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (Array.isArray(data)) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setTurmas([])
    }
  }

  // Debounce para busca (evita múltiplas requisições enquanto digita)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 300)

    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => {
    carregarAlunos()
  }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const carregarAlunos = useCallback(async () => {
    if (!escolaId) return

    try {
      setCarregando(true)
      const params = new URLSearchParams()
      params.append('escola_id', escolaId)
      
      if (filtroTurma) params.append('turma_id', filtroTurma)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (buscaDebounced) params.append('busca', buscaDebounced)

      const data = await fetch(`/api/admin/alunos?${params}`).then(r => r.json())

      // A API retorna {alunos: [...], paginacao: {...}}
      if (data.alunos && Array.isArray(data.alunos)) {
        setAlunos(data.alunos)
      } else if (Array.isArray(data)) {
        setAlunos(data)
      } else {
        setAlunos([])
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
      setAlunos([])
    } finally {
      setCarregando(false)
    }
  }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const handleVisualizarHistorico = useCallback(async (aluno: Aluno) => {
    setCarregandoHistorico(true)
    setMostrarModalHistorico(true)
    setHistoricoAluno(null)

    try {
      const response = await fetch(`/api/admin/alunos/historico?aluno_id=${encodeURIComponent(aluno.id)}`)
      const data = await response.json()
      if (response.ok) {
        setHistoricoAluno(data)
      } else {
        toast.error(data.mensagem || 'Erro ao carregar histórico')
        setMostrarModalHistorico(false)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      toast.error('Erro ao carregar histórico')
      setMostrarModalHistorico(false)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [toast])

  const alunosFiltrados = useMemo(() => {
    return alunos.filter(aluno => {
      if (buscaDebounced && !aluno.nome.toLowerCase().includes(buscaDebounced.toLowerCase())) {
        return false
      }
      return true
    })
  }, [alunos, buscaDebounced])

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Alunos</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {escolaNome && `${escolaNome}`}
                {poloNome && <span className="text-gray-500 dark:text-gray-400"> - Polo: {poloNome}</span>}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Busca Aluno
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome do aluno..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escola
                </label>
                <input
                  type="text"
                  value={escolaNome || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma
                </label>
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="select-custom w-full"
                  disabled={!filtroSerie || turmas.length === 0}
                >
                  <option value="">Todas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtroSerie}
                  onChange={(e) => {
                    setFiltroSerie(e.target.value)
                    setFiltroTurma('')
                  }}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  {seriesDisponiveis.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2026 (todos se vazio)"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Alunos */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Carregando alunos...</p>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum aluno encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                {busca || filtroTurma || filtroSerie || filtroAno ? 'Tente ajustar os filtros' : 'Não há alunos cadastrados'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[350px]">
                  <thead className="bg-indigo-50 dark:bg-indigo-900/30">
                    <tr>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden sm:table-cell">Código</th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Nome</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Turma</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden md:table-cell">Série</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Ano</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Status</th>
                      <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {alunosFiltrados.map((aluno) => (
                      <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden sm:table-cell">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-mono">{aluno.codigo || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap">
                          <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{aluno.nome}</div>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo || aluno.turma_nome || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden md:table-cell">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{aluno.serie || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{aluno.ano_letivo || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            aluno.ativo ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                          }`}>
                            {aluno.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleVisualizarHistorico(aluno)}
                            disabled={carregandoHistorico}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50"
                            title="Ver histórico"
                          >
                            <Eye className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ModalHistoricoAluno
            mostrar={mostrarModalHistorico}
            historico={historicoAluno}
            carregando={carregandoHistorico}
            onClose={() => {
              setMostrarModalHistorico(false)
              setHistoricoAluno(null)
            }}
          />
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

