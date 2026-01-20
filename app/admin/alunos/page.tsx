'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalAluno from '@/components/modal-aluno'
import ModalHistoricoAluno from '@/components/modal-historico-aluno'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react'
import { useToast } from '@/components/toast'
import { normalizarSerie, ordenarSeries } from '@/lib/dados/utils'

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
  polo_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

const formDataInicial = {
  codigo: '',
  nome: '',
  polo_id: '',
  escola_id: '',
  turma_id: '',
  serie: '',
  ano_letivo: new Date().getFullYear().toString(),
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

export default function AlunosPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroPolo, setFiltroPolo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState(formDataInicial)
  const [salvando, setSalvando] = useState(false)
  const [mostrarModalHistorico, setMostrarModalHistorico] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState<any>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [pesquisaIniciada, setPesquisaIniciada] = useState(false)

  // Estado de paginação
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
    temProxima: false,
    temAnterior: false
  })
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Carregamento inicial otimizado - requisicoes em paralelo
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        // Executar requisicoes em paralelo para reduzir tempo de carregamento
        const [authRes, polosRes] = await Promise.all([
          fetch('/api/auth/verificar').catch(() => null),
          fetch('/api/admin/polos').catch(() => null)
        ])

        // Processar resposta de autenticacao
        if (authRes?.ok) {
          const authData = await authRes.json()
          if (authData.usuario) {
            const tipo = authData.usuario.tipo_usuario === 'administrador' ? 'admin' : authData.usuario.tipo_usuario
            setTipoUsuario(tipo)
          }
        }

        // Processar resposta de polos
        if (polosRes?.ok) {
          const polosData = await polosRes.json()
          setPolos(Array.isArray(polosData) ? polosData : [])
        } else {
          setPolos([])
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
        setPolos([])
      } finally {
        setCarregando(false)
      }
    }

    carregarDadosIniciais()
  }, [])

  useEffect(() => {
    if (filtroPolo) {
      fetch(`/api/admin/escolas?polo_id=${filtroPolo}`)
        .then(r => r.json())
        .then(setEscolas)
        .catch(() => setEscolas([]))
    } else {
      setEscolas([])
      setFiltroEscola('')
    }
  }, [filtroPolo])

  useEffect(() => {
    if (filtroEscola) {
      fetch(`/api/admin/turmas?escolas_ids=${filtroEscola}`)
        .then(r => r.json())
        .then(setTurmas)
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
      setFiltroTurma('')
    }
  }, [filtroEscola])

  // Debounce para busca (evita múltiplas requisições enquanto digita)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 300) // Aguarda 300ms após parar de digitar

    return () => clearTimeout(timer)
  }, [busca])

  // Só carrega alunos automaticamente após a pesquisa ser iniciada
  useEffect(() => {
    if (pesquisaIniciada) {
      carregarAlunos()
    }
  }, [buscaDebounced, filtroPolo, filtroEscola, filtroTurma, filtroSerie, filtroAno, pesquisaIniciada])

  // Função para iniciar a pesquisa
  const handlePesquisar = () => {
    setPesquisaIniciada(true)
    carregarAlunos()
  }

  // Funcao memoizada para carregar alunos - evita re-criacao a cada render
  const carregarAlunos = useCallback(async (pagina: number = paginaAtual) => {
    try {
      setCarregando(true)
      const params = new URLSearchParams()

      // Paginação
      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      // Filtros
      if (filtroPolo) {
        params.append('polo_id', filtroPolo)
      }

      if (filtroEscola) {
        params.append('escola_id', filtroEscola)
      }

      if (filtroTurma) params.append('turma_id', filtroTurma)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (buscaDebounced) params.append('busca', buscaDebounced)

      const response = await fetch(`/api/admin/alunos?${params}`)
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Garantir que sempre temos um array, mesmo em caso de erro
      let alunosData: Aluno[] = []
      let paginacaoData: Paginacao = {
        pagina: 1,
        limite: 50,
        total: 0,
        totalPaginas: 0,
        temProxima: false,
        temAnterior: false
      }

      // Nova estrutura de resposta: { alunos: [], paginacao: {} }
      if (data && typeof data === 'object') {
        if (Array.isArray(data.alunos)) {
          alunosData = data.alunos
        } else if (Array.isArray(data)) {
          // Fallback: se for array direto (compatibilidade)
          alunosData = data
        }

        if (data.paginacao && typeof data.paginacao === 'object') {
          paginacaoData = {
            pagina: data.paginacao.pagina || 1,
            limite: data.paginacao.limite || 50,
            total: data.paginacao.total || 0,
            totalPaginas: data.paginacao.totalPaginas || data.paginacao.total_paginas || 0,
            temProxima: data.paginacao.temProxima || false,
            temAnterior: data.paginacao.temAnterior || false
          }
        } else {
          // Se não tem paginação, calcular baseado nos dados
          paginacaoData = {
            pagina: 1,
            limite: 50,
            total: alunosData.length,
            totalPaginas: Math.ceil(alunosData.length / 50),
            temProxima: false,
            temAnterior: false
          }
        }
      }

      // Não precisa mais filtrar no frontend - API já filtra por polo_id
      const alunosFiltrados = Array.isArray(alunosData) ? alunosData : []

      setAlunos(alunosFiltrados)
      setPaginacao(paginacaoData)
      setPaginaAtual(paginacaoData.pagina)
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
      setAlunos([])
      setPaginacao({
        pagina: 1,
        limite: 50,
        total: 0,
        totalPaginas: 0,
        temProxima: false,
        temAnterior: false
      })
    } finally {
      setCarregando(false)
    }
  }, [paginaAtual, filtroEscola, filtroTurma, filtroSerie, filtroAno, buscaDebounced, filtroPolo])

  // Funcoes de navegacao de pagina - memoizadas para evitar re-renders
  const irParaPagina = useCallback((pagina: number) => {
    setPaginaAtual(pagina)
    carregarAlunos(pagina)
  }, [carregarAlunos])

  const paginaAnterior = useCallback(() => {
    if (paginacao.temAnterior) {
      irParaPagina(paginaAtual - 1)
    }
  }, [paginacao.temAnterior, paginaAtual, irParaPagina])

  const proximaPagina = useCallback(() => {
    if (paginacao.temProxima) {
      irParaPagina(paginaAtual + 1)
    }
  }, [paginacao.temProxima, paginaAtual, irParaPagina])

  // REMOVIDO: useEffect duplicado que causava dupla execucao de carregarAlunos
  // O carregamento de alunos ja e feito no useEffect da linha 152-156

  const handleAbrirModal = async (aluno?: Aluno) => {
    if (aluno) {
      setAlunoEditando(aluno)
      setMostrarModal(true)
      setFormData({
        codigo: aluno.codigo || '',
        nome: aluno.nome,
        polo_id: '',
        escola_id: aluno.escola_id,
        turma_id: aluno.turma_id || '',
        serie: '',
        ano_letivo: aluno.ano_letivo || new Date().getFullYear().toString(),
      })

      try {
        const escolaData = await fetch(`/api/admin/escolas?id=${aluno.escola_id}`).then(r => r.json())
        if (escolaData[0]?.polo_id) {
          await carregarEscolas(escolaData[0].polo_id)
          await carregarTurmas(aluno.escola_id)
          setFormData(prev => ({
            ...prev,
            polo_id: escolaData[0].polo_id,
            serie: normalizarSerie(aluno.serie),
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    } else {
      setAlunoEditando(null)
      setFormData(formDataInicial)
      setEscolas([])
      setTurmas([])
      setMostrarModal(true)
    }
  }

  const carregarEscolas = async (poloId: string) => {
    const data = await fetch(`/api/admin/escolas?polo_id=${poloId}`).then(r => r.json())
    setEscolas(data)
  }

  const carregarTurmas = async (escolaId: string) => {
    const data = await fetch(`/api/admin/turmas?escolas_ids=${escolaId}`).then(r => r.json())
    setTurmas(data)
  }

  const handleSalvar = async () => {
    if (!formData.nome || !formData.escola_id) {
      toast.warning('Nome e escola são obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const body = alunoEditando ? { id: alunoEditando.id, ...formData } : formData
      const response = await fetch('/api/admin/alunos', {
        method: alunoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (response.ok) {
        await carregarAlunos()
        setMostrarModal(false)
        setAlunoEditando(null)
        setFormData(formDataInicial)
        toast.success(alunoEditando ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao salvar aluno')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar aluno')
    } finally {
      setSalvando(false)
    }
  }

  const handleVisualizarHistorico = async (aluno: Aluno) => {
    setCarregandoHistorico(true)
    setMostrarModalHistorico(true)
    setHistoricoAluno(null)

    try {
      // Usar aluno_id para busca mais precisa
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
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return

    try {
      const response = await fetch(`/api/admin/alunos?id=${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        await carregarAlunos()
        toast.success('Aluno excluído com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao excluir')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir aluno')
    }
  }

  // Séries disponíveis baseadas nos dados reais dos alunos
  const seriesDisponiveis: string[] = useMemo(() => {
    const series = alunos
      .map(a => a.serie)
      .filter((serie): serie is string => Boolean(serie))
      .map(serie => normalizarSerie(serie))
      .filter(serie => serie !== '')
    
    const seriesUnicas = [...new Set(series)]
    return ordenarSeries(seriesUnicas)
  }, [alunos])

  const anosDisponiveis: string[] = useMemo(
    () => [...new Set(alunos.map(a => a.ano_letivo).filter((ano): ano is string => Boolean(ano)))].sort().reverse(),
    [alunos]
  )

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">Gestão de Alunos</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Total de alunos cadastrados: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{paginacao.total}</span>
              </p>
            </div>
            <button
              onClick={() => handleAbrirModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Aluno
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                />
              </div>

              <select
                value={filtroPolo}
                onChange={(e) => {
                  setFiltroPolo(e.target.value)
                  setFiltroEscola('')
                  setFiltroTurma('')
                  if (e.target.value) carregarEscolas(e.target.value)
                  else setEscolas([])
                }}
                className="select-custom w-full"
              >
                <option value="">Todos os polos</option>
                {polos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              <select
                value={filtroEscola}
                onChange={(e) => {
                  setFiltroEscola(e.target.value)
                  setFiltroTurma('')
                }}
                className="select-custom w-full"
                disabled={!filtroPolo}
              >
                <option value="">Todas as escolas</option>
                {escolas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>

              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="select-custom w-full"
                disabled={!filtroEscola}
              >
                <option value="">Todas as turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.codigo} - {t.nome || ''}</option>
                ))}
              </select>

              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todas as séries</option>
                {seriesDisponiveis.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="select-custom w-full"
              >
                <option value="">Todos os anos</option>
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Botão de Pesquisar */}
              <button
                onClick={handlePesquisar}
                disabled={carregando}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full transition-colors"
              >
                <Search className="w-4 h-4" />
                {carregando ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* Card com total de alunos */}
          {!carregando && pesquisaIniciada && (
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-base opacity-90 mb-1">Total de Alunos</p>
                  <p className="text-3xl sm:text-4xl font-bold">{paginacao.total}</p>
                  {paginacao.totalPaginas > 1 && (
                    <p className="text-sm opacity-75 mt-1">
                      Mostrando {alunos.length} de {paginacao.total} (Página {paginacao.pagina} de {paginacao.totalPaginas})
                    </p>
                  )}
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3 sm:p-4">
                  <Plus className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando alunos...</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Código
                          </th>
                          <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="hidden lg:table-cell text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Polo
                          </th>
                          <th className="hidden md:table-cell text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Escola
                          </th>
                          <th className="hidden xl:table-cell text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Turma
                          </th>
                          <th className="hidden lg:table-cell text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Série
                          </th>
                          <th className="hidden xl:table-cell text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Ano Letivo
                          </th>
                          <th className="text-left py-3 px-2 md:py-4 md:px-3 lg:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {!pesquisaIniciada ? (
                      <tr>
                        <td colSpan={8} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-base sm:text-lg font-medium">Selecione os filtros e clique em Pesquisar</p>
                          <p className="text-xs sm:text-sm mt-1 text-gray-400 dark:text-gray-500">Use os filtros acima para encontrar alunos</p>
                        </td>
                      </tr>
                    ) : alunos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                          <p className="text-base sm:text-lg font-medium">Nenhum aluno encontrado</p>
                          <p className="text-xs sm:text-sm mt-1 text-gray-400 dark:text-gray-500">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      alunos.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <span className="font-mono text-xs md:text-sm text-gray-900 dark:text-white">{aluno.codigo || '-'}</span>
                          </td>
                          <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleVisualizarHistorico(aluno)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs md:text-sm underline cursor-pointer text-left mb-1"
                                title="Clique para visualizar histórico do aluno"
                              >
                                {aluno.nome}
                              </button>
                              <div className="lg:hidden text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                {aluno.polo_nome && <div>Polo: {aluno.polo_nome}</div>}
                                {aluno.escola_nome && <div>Escola: {aluno.escola_nome}</div>}
                                {aluno.turma_codigo && <div>Turma: {aluno.turma_codigo}</div>}
                                {aluno.serie && <div>Série: {aluno.serie}</div>}
                                {aluno.ano_letivo && <div>Ano: {aluno.ano_letivo}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">{aluno.polo_nome || '-'}</span>
                          </td>
                          <td className="hidden md:table-cell py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">{aluno.escola_nome || '-'}</span>
                          </td>
                          <td className="hidden xl:table-cell py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">{aluno.turma_codigo || '-'}</span>
                          </td>
                          <td className="hidden lg:table-cell py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            {aluno.serie ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                {aluno.serie}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="hidden xl:table-cell py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">{aluno.ano_letivo || '-'}</span>
                          </td>
                          <td className="py-3 px-2 md:py-4 md:px-3 lg:px-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2">
                              <button
                                onClick={() => handleVisualizarHistorico(aluno)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium border border-blue-200 sm:border-0"
                                title="Visualizar Histórico"
                              >
                                <Eye className="w-4 h-4 flex-shrink-0" />
                                <span className="sm:hidden">Histórico</span>
                              </button>
                              <button
                                onClick={() => handleAbrirModal(aluno)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-sm font-medium border border-indigo-200 sm:border-0"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                <span className="sm:hidden">Editar</span>
                              </button>
                              <button
                                onClick={() => handleExcluir(aluno.id)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-red-200 sm:border-0"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                <span className="sm:hidden">Excluir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                    </table>
              </div>
            )}

            {/* Controles de Paginação */}
            {!carregando && paginacao.totalPaginas > 1 && (
              <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex-1 flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Página {paginacao.pagina}</span> de {paginacao.totalPaginas}
                    {' • '}
                    <span className="font-medium">{paginacao.total}</span> alunos no total
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={paginaAnterior}
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
                      {/* Mostrar até 5 números de página */}
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
                            onClick={() => irParaPagina(paginaNum)}
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
                      onClick={proximaPagina}
                      disabled={!paginacao.temProxima}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        paginacao.temProxima
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ModalAluno
            mostrar={mostrarModal}
            alunoEditando={alunoEditando}
            formData={formData}
            setFormData={setFormData}
            polos={polos}
            escolas={escolas}
            turmas={turmas}
            seriesDisponiveis={seriesDisponiveis}
            salvando={salvando}
            onClose={() => {
              setMostrarModal(false)
              setAlunoEditando(null)
              setFormData(formDataInicial)
            }}
            onSalvar={handleSalvar}
            onPoloChange={carregarEscolas}
            onEscolaChange={carregarTurmas}
          />

          <ModalHistoricoAluno
            mostrar={mostrarModalHistorico}
            historico={historicoAluno}
            carregando={carregandoHistorico}
            onClose={() => setMostrarModalHistorico(false)}
          />
        </div>
    </ProtectedRoute>
  )
}
