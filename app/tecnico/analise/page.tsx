'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Search, BookOpen, Award, Filter, X, Users, Target, CheckCircle2, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'

interface ResultadoConsolidado {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
  escola_id?: string
  polo_id?: string
  polo_nome?: string
  turma_codigo: string
  serie: string
  presenca: string
  total_acertos_lp: number | string
  total_acertos_ch: number | string
  total_acertos_mat: number | string
  total_acertos_cn: number | string
  nota_lp: number | string | null
  nota_ch: number | string | null
  nota_mat: number | string | null
  nota_cn: number | string | null
  nota_producao?: number | string | null
  media_aluno: number | string | null
}

interface Filtros {
  polo_id?: string
  escola_id?: string
  turma_id?: string
  ano_letivo?: string
  serie?: string
  presenca?: string
  tipo_ensino?: string
}

// Funcao para verificar se a serie e dos anos iniciais (2o, 3o ou 5o ano)
const isAnosIniciais = (serie: string | undefined | null): boolean => {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  return numero === '2' || numero === '3' || numero === '5'
}

export default function TecnicoAnalisePage() {
  const [resultados, setResultados] = useState<ResultadoConsolidado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Filtros>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{
    id: string;
    anoLetivo?: string;
    mediaAluno?: number | string | null;
    notasDisciplinas?: {
      nota_lp?: number | string | null;
      nota_ch?: number | string | null;
      nota_mat?: number | string | null;
      nota_cn?: number | string | null;
    };
  } | null>(null)

  // Estados de paginacao
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginacao, setPaginacao] = useState<{
    pagina: number
    limite: number
    total: number
    totalPaginas: number
    temProxima: boolean
    temAnterior: boolean
  }>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
    temProxima: false,
    temAnterior: false
  })

  // Estados para estatisticas da API
  const [estatisticasAPI, setEstatisticasAPI] = useState<{
    totalAlunos: number
    totalPresentes: number
    totalFaltas: number
    mediaGeral: number
    mediaLP: number
    mediaCH: number
    mediaMAT: number
    mediaCN: number
  }>({
    totalAlunos: 0,
    totalPresentes: 0,
    totalFaltas: 0,
    mediaGeral: 0,
    mediaLP: 0,
    mediaCH: 0,
    mediaMAT: 0,
    mediaCN: 0
  })

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    try {
      const [escolasRes, polosRes] = await Promise.all([
        fetch('/api/admin/escolas'),
        fetch('/api/admin/polos'),
      ])
      const escolasData = await escolasRes.json()
      const polosData = await polosRes.json()
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
      setPolos(Array.isArray(polosData) ? polosData : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    setPaginaAtual(1)
    carregarResultados(1, true)
  }, [filtros])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, filtros.escola_id, filtros.ano_letivo])

  const carregarTurmas = async () => {
    if (!filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      if (filtros.escola_id) {
        params.append('escolas_ids', filtros.escola_id)
      }
      params.append('serie', filtros.serie)

      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setTurmas([])
    }
  }

  const carregarResultados = async (pagina: number = paginaAtual, forcarAtualizacao: boolean = false) => {
    try {
      setCarregando(true)

      const params = new URLSearchParams()

      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      if (forcarAtualizacao) {
        params.append('atualizar_cache', 'true')
      }

      const response = await fetch(`/api/admin/resultados-consolidados?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar resultados')
      }

      const data = await response.json()

      if (data.resultados && Array.isArray(data.resultados)) {
        setResultados(data.resultados)

        if (pagina === 1) {
          const seriesUnicas = [...new Set(data.resultados.map((r: ResultadoConsolidado) => r.serie).filter(Boolean))] as string[]
          setSeries(seriesUnicas.sort())
        }

        if (data.estatisticas) {
          setEstatisticasAPI({
            totalAlunos: data.estatisticas.totalAlunos || data.paginacao?.total || 0,
            totalPresentes: data.estatisticas.totalPresentes || 0,
            totalFaltas: data.estatisticas.totalFaltas || 0,
            mediaGeral: parseFloat(data.estatisticas.mediaGeral) || 0,
            mediaLP: parseFloat(data.estatisticas.mediaLP) || 0,
            mediaCH: parseFloat(data.estatisticas.mediaCH) || 0,
            mediaMAT: parseFloat(data.estatisticas.mediaMAT) || 0,
            mediaCN: parseFloat(data.estatisticas.mediaCN) || 0
          })
        }

        if (data.paginacao) {
          setPaginacao({
            pagina: data.paginacao.pagina || pagina,
            limite: data.paginacao.limite || 50,
            total: data.paginacao.total || 0,
            totalPaginas: data.paginacao.totalPaginas || 1,
            temProxima: data.paginacao.temProxima || false,
            temAnterior: data.paginacao.temAnterior || false
          })
        }
      } else if (Array.isArray(data)) {
        setResultados(data)
        const seriesUnicas = [...new Set(data.map((r: ResultadoConsolidado) => r.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        setResultados([])
        setSeries([])
      }
    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
      setResultados([])
      setSeries([])
    } finally {
      setCarregando(false)
    }
  }

  const irParaPagina = (pagina: number) => {
    setPaginaAtual(pagina)
    carregarResultados(pagina)
  }

  const paginaAnterior = () => {
    if (paginacao.temAnterior) {
      irParaPagina(paginaAtual - 1)
    }
  }

  const proximaPagina = () => {
    if (paginacao.temProxima) {
      irParaPagina(paginaAtual + 1)
    }
  }

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }

      if (campo === 'serie' && !valor) {
        delete novo.turma_id
      }

      if (campo === 'escola_id') {
        delete novo.turma_id
      }

      // Auto-atualizar tipo_ensino quando uma serie e selecionada
      if (campo === 'serie' && valor) {
        if (isAnosIniciais(valor)) {
          novo.tipo_ensino = 'anos_iniciais'
        } else {
          const numero = valor.match(/(\d+)/)?.[1]
          if (numero && parseInt(numero) >= 6 && parseInt(numero) <= 9) {
            novo.tipo_ensino = 'anos_finais'
          }
        }
      }

      // Se limpar a serie, tambem limpar o tipo_ensino
      if (campo === 'serie' && !valor) {
        delete novo.tipo_ensino
      }

      // Ao selecionar polo, limpar escola e turma
      if (campo === 'polo_id') {
        delete novo.escola_id
        delete novo.turma_id
      }

      return novo
    })
  }

  const limparFiltros = () => {
    setFiltros({})
    setBusca('')
  }

  const temFiltrosAtivos = Object.keys(filtros).length > 0 || busca.trim() !== ''

  const resultadosFiltrados = useMemo(() => {
    let filtrados = resultados

    if (busca.trim()) {
      const buscaLower = busca.toLowerCase()
      filtrados = filtrados.filter((r) =>
        r.aluno_nome.toLowerCase().includes(buscaLower) ||
        r.escola_nome?.toLowerCase().includes(buscaLower)
      )
    }

    return filtrados
  }, [resultados, busca])

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
    }
    if (presenca === '-') {
      return 'bg-gray-100 text-gray-600'
    }
    return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
  }

  const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null): string => {
    if (presenca === '-') return '-'
    if (presenca === 'F' || presenca === 'f') return '-'

    const mediaNum = typeof mediaAluno === 'string' ? parseFloat(mediaAluno) : mediaAluno
    if (mediaNum === 0 || mediaNum === null || mediaNum === undefined) return '-'

    if (nota === null || nota === undefined || nota === '') return '-'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return '-'
    if (num === 0) return '-'
    return num.toFixed(1)
  }

  const getNotaNumero = (nota: number | string | null | undefined): number | null => {
    if (nota === null || nota === undefined || nota === '') return null
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    return isNaN(num) ? null : num
  }

  const getNotaColor = (nota: number | string | null | undefined) => {
    const num = getNotaNumero(nota)
    if (num === null) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const getNotaBgColor = (nota: number | string | null | undefined) => {
    const num = getNotaNumero(nota)
    if (num === null) return 'bg-gray-50'
    if (num >= 7) return 'bg-green-50 border-green-200'
    if (num >= 5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getTotalQuestoesPorSerie = useCallback((serie: string | null | undefined, codigoDisciplina: string): number | undefined => {
    const disciplinasSerie = obterDisciplinasPorSerieSync(serie)
    const disciplina = disciplinasSerie.find(d => d.codigo === codigoDisciplina)
    return disciplina?.total_questoes
  }, [])

  const handleVisualizarQuestoes = (aluno: ResultadoConsolidado) => {
    setAlunoSelecionado({
      id: aluno.aluno_id || aluno.id,
      anoLetivo: filtros.ano_letivo,
      mediaAluno: aluno.media_aluno,
      notasDisciplinas: {
        nota_lp: aluno.nota_lp,
        nota_ch: aluno.nota_ch,
        nota_mat: aluno.nota_mat,
        nota_cn: aluno.nota_cn,
      },
    })
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setAlunoSelecionado(null)
  }

  // Filtrar escolas por polo selecionado
  const escolasFiltradas = useMemo(() => {
    if (!filtros.polo_id) return escolas
    return escolas.filter(e => e.polo_id === filtros.polo_id)
  }, [escolas, filtros.polo_id])

  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <LayoutDashboard tipoUsuario="tecnico">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Resultados Consolidados</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Tecnico - Todos os Polos e Escolas
              </p>
            </div>
            <button
              onClick={() => carregarResultados(1, true)}
              disabled={carregando}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
              title="Pesquisar dados (forca atualizacao)"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              <span>Pesquisar</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
              </div>
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Polo
                </label>
                <select
                  value={filtros.polo_id || ''}
                  onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos os polos</option>
                  {polos.map((polo) => (
                    <option key={polo.id} value={polo.id}>
                      {polo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Escola
                </label>
                <select
                  value={filtros.escola_id || ''}
                  onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas as escolas</option>
                  {escolasFiltradas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Serie
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas as series</option>
                  {series.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Turma
                </label>
                <select
                  value={filtros.turma_id || ''}
                  onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
                  className="select-custom w-full"
                  disabled={!filtros.serie || turmas.length === 0}
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo de Ensino
                </label>
                <select
                  value={filtros.tipo_ensino || ''}
                  onChange={(e) => handleFiltroChange('tipo_ensino', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  <option value="anos_iniciais">Anos Iniciais (1o-5o)</option>
                  <option value="anos_finais">Anos Finais (6o-9o)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Presenca
                </label>
                <select
                  value={filtros.presenca || ''}
                  onChange={(e) => handleFiltroChange('presenca', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  <option value="P">Presentes</option>
                  <option value="F">Faltosos</option>
                </select>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome do aluno ou escola..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Cards de Estatisticas */}
          {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (
            <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${carregando ? 'opacity-50' : ''}`}>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalAlunos || paginacao.total}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Total de Alunos</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.mediaGeral.toFixed(1)}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Media Geral</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalPresentes}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Presentes</p>
                <p className="text-[10px] sm:text-xs opacity-75 mt-1">
                  {estatisticasAPI.totalAlunos > 0 ? ((estatisticasAPI.totalPresentes / estatisticasAPI.totalAlunos) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <X className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalFaltas}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Faltas</p>
                <p className="text-[10px] sm:text-xs opacity-75 mt-1">
                  {estatisticasAPI.totalAlunos > 0 ? ((estatisticasAPI.totalFaltas / estatisticasAPI.totalAlunos) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* Medias por Area - Filtrado por tipo de ensino */}
          {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (
            <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
              {/* Card Lingua Portuguesa - Sempre visivel */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Lingua Portuguesa</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaLP)}`}>
                      {estatisticasAPI.mediaLP.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaLP >= 7 ? 'bg-green-500' : estatisticasAPI.mediaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaLP / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              {/* Card Matematica - Sempre visivel */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Matematica</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaMAT)}`}>
                      {estatisticasAPI.mediaMAT.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaMAT >= 7 ? 'bg-green-500' : estatisticasAPI.mediaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaMAT / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              {/* Card Ciencias Humanas - Apenas Anos Finais ou Todos */}
              {(filtros.tipo_ensino !== 'anos_iniciais') && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciencias Humanas</p>
                      <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCH)}`}>
                        {estatisticasAPI.mediaCH.toFixed(1)}
                      </p>
                    </div>
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0 ml-1" />
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full ${
                        estatisticasAPI.mediaCH >= 7 ? 'bg-green-500' : estatisticasAPI.mediaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((estatisticasAPI.mediaCH / 10) * 100, 100)}%`, minWidth: '2px' }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Card Ciencias da Natureza - Apenas Anos Finais ou Todos */}
              {(filtros.tipo_ensino !== 'anos_iniciais') && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciencias da Natureza</p>
                      <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCN)}`}>
                        {estatisticasAPI.mediaCN.toFixed(1)}
                      </p>
                    </div>
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0 ml-1" />
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full ${
                        estatisticasAPI.mediaCN >= 7 ? 'bg-green-500' : estatisticasAPI.mediaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((estatisticasAPI.mediaCN / 10) * 100, 100)}%`, minWidth: '2px' }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="flex-1 overflow-auto">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando resultados...</p>
              </div>
            ) : (
              <>
                {/* Visualizacao Mobile - Cards */}
                <div className="block sm:hidden space-y-4 p-4">
                  {resultadosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
                      <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">Nao ha resultados para exibir</p>
                    </div>
                  ) : (
                    resultadosFiltrados.map((resultado, index) => {
                    const mediaNum = getNotaNumero(resultado.media_aluno)
                    const notaLP = getNotaNumero(resultado.nota_lp)
                    const notaCH = getNotaNumero(resultado.nota_ch)
                    const notaMAT = getNotaNumero(resultado.nota_mat)
                    const notaCN = getNotaNumero(resultado.nota_cn)

                    return (
                      <div key={resultado.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:shadow-slate-900/50">
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mr-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => handleVisualizarQuestoes(resultado)}
                            className="flex items-center flex-1 text-left hover:opacity-80 transition-opacity"
                            title="Clique para ver questoes do aluno"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {resultado.aluno_nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-sm mb-1">
                                {resultado.aluno_nome}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                {resultado.polo_nome && <div>Polo: {resultado.polo_nome}</div>}
                                {resultado.escola_nome && <div>Escola: {resultado.escola_nome}</div>}
                                {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                <div className="flex items-center gap-2">
                                  <span>Serie: {resultado.serie || '-'}</span>
                                  <span className="text-gray-300">|</span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                                      resultado.presenca || 'P'
                                    )}`}
                                  >
                                    {resultado.presenca === 'P' || resultado.presenca === 'p' ? 'Presente' : resultado.presenca === '-' ? '- Sem dados' : 'Falta'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Grid de disciplinas - Ordem: LP, MAT, CH, CN, PROD */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {/* 1. Lingua Portuguesa - Sempre visivel */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_lp)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Lingua Portuguesa</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{resultado.total_acertos_lp}/{getTotalQuestoesPorSerie(resultado.serie, 'LP') || '-'}</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_lp)} mb-1`}>
                              {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* 2. Matematica - Sempre visivel */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_mat)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Matematica</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{resultado.total_acertos_mat}/{getTotalQuestoesPorSerie(resultado.serie, 'MAT') || '-'}</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_mat)} mb-1`}>
                              {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* 3. Ciencias Humanas - Apenas Anos Finais ou Todos */}
                          {(filtros.tipo_ensino !== 'anos_iniciais') && (
                            <div className={`p-3 rounded-lg ${isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_ch)} border border-gray-200`}>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Ciencias Humanas</div>
                              {isAnosIniciais(resultado.serie) ? (
                                <>
                                  <div className="text-xs text-gray-400 mb-1">N/A</div>
                                  <div className="text-lg font-bold text-gray-400 mb-1">-</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{resultado.total_acertos_ch}/{getTotalQuestoesPorSerie(resultado.serie, 'CH') || '-'}</div>
                                  <div className={`text-lg font-bold ${getNotaColor(resultado.nota_ch)} mb-1`}>
                                    {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                                  </div>
                                  {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* 4. Ciencias da Natureza - Apenas Anos Finais ou Todos */}
                          {(filtros.tipo_ensino !== 'anos_iniciais') && (
                            <div className={`p-3 rounded-lg ${isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_cn)} border border-gray-200`}>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Ciencias da Natureza</div>
                              {isAnosIniciais(resultado.serie) ? (
                                <>
                                  <div className="text-xs text-gray-400 mb-1">N/A</div>
                                  <div className="text-lg font-bold text-gray-400 mb-1">-</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{resultado.total_acertos_cn}/{getTotalQuestoesPorSerie(resultado.serie, 'CN') || '-'}</div>
                                  <div className={`text-lg font-bold ${getNotaColor(resultado.nota_cn)} mb-1`}>
                                    {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                                  </div>
                                  {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* 5. Producao Textual - Apenas Anos Iniciais ou Todos */}
                          {(filtros.tipo_ensino !== 'anos_finais') && (
                            <div className={`p-3 rounded-lg ${!isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_producao)} border border-gray-200`}>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Producao Textual</div>
                              {!isAnosIniciais(resultado.serie) ? (
                                <>
                                  <div className="text-xs text-gray-400 mb-1">N/A</div>
                                  <div className="text-lg font-bold text-gray-400 mb-1">-</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">-</div>
                                  <div className={`text-lg font-bold ${getNotaColor(resultado.nota_producao)} mb-1`}>
                                    {formatarNota(resultado.nota_producao, resultado.presenca, resultado.media_aluno)}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
                          <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                            'border-red-500'
                          }`}>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Media Geral</div>
                            <div className={`text-2xl font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleVisualizarQuestoes(resultado)}
                            className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                            title="Ver questoes do aluno"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Questoes
                          </button>
                        </div>
                      </div>
                    )
                  }))}
                </div>

                {/* Visualizacao Tablet/Desktop - Tabela com header fixo */}
                <div className="hidden sm:block w-full h-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 min-w-[900px] lg:min-w-[1100px]">
                    <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 sticky top-0 z-20">
                        <tr>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-8 md:w-10 lg:w-12 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              #
                          </th>
                          <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[120px] md:min-w-[140px] lg:min-w-[160px] bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Aluno
                          </th>
                          <th className="hidden lg:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-24 md:w-28 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Polo
                          </th>
                          <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-28 md:w-32 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Escola
                          </th>
                          <th className="hidden lg:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Turma
                          </th>
                          <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Serie
                          </th>
                          <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              Presenca
                          </th>
                          {/* Ordem das disciplinas: LP, MAT, CH, CN, PROD */}
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                            LP
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                            MAT
                          </th>
                          {(filtros.tipo_ensino !== 'anos_iniciais') && (
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              CH
                            </th>
                          )}
                          {(filtros.tipo_ensino !== 'anos_iniciais') && (
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              CN
                            </th>
                          )}
                          {(filtros.tipo_ensino !== 'anos_finais') && (
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              PROD
                            </th>
                          )}
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                            Media
                          </th>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 lg:w-24 bg-gradient-to-r from-indigo-50 to-indigo-100">
                            Acoes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {resultadosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={!filtros.tipo_ensino ? 15 : (filtros.tipo_ensino === 'anos_iniciais' ? 13 : 14)} className="py-8 sm:py-12 text-center text-gray-500 px-4">
                              <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                              <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                              <p className="text-xs sm:text-sm mt-1">Nao ha resultados para exibir</p>
                            </td>
                          </tr>
                        ) : (
                          resultadosFiltrados.map((resultado, index) => {
                            const mediaNum = getNotaNumero(resultado.media_aluno)
                            const notaLP = getNotaNumero(resultado.nota_lp)
                            const notaCH = getNotaNumero(resultado.nota_ch)
                            const notaMAT = getNotaNumero(resultado.nota_mat)
                            const notaCN = getNotaNumero(resultado.nota_cn)

                            return (
                              <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100">
                                <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => handleVisualizarQuestoes(resultado)}
                                      className="flex items-center w-full text-left hover:opacity-80 transition-opacity mb-1"
                                      title="Clique para ver questoes do aluno"
                                    >
                                      <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-1 sm:mr-1.5 md:mr-2">
                                        <span className="text-indigo-600 font-semibold text-[9px] sm:text-[10px] md:text-xs">
                                          {resultado.aluno_nome.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-[10px] sm:text-[11px] md:text-xs lg:text-sm truncate">{resultado.aluno_nome}</span>
                                    </button>
                                    <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                                      {resultado.polo_nome && <div>Polo: {resultado.polo_nome}</div>}
                                      {resultado.escola_nome && <div>Escola: {resultado.escola_nome}</div>}
                                      {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                      {resultado.serie && <div>Serie: {resultado.serie}</div>}
                                      <div className="flex items-center gap-2">
                                        <span>Presenca: </span>
                                        <span
                                          className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                            resultado.presenca || 'P'
                                          )}`}
                                        >
                                          {resultado.presenca === 'P' || resultado.presenca === 'p' ? 'Presente' : resultado.presenca === '-' ? '- Sem dados' : 'Falta'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5">
                                  <span className="text-[9px] md:text-[10px] lg:text-xs text-gray-700 truncate block max-w-[100px]" title={resultado.polo_nome}>
                                    {resultado.polo_nome || '-'}
                                  </span>
                                </td>
                                <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5">
                                  <span className="text-[9px] md:text-[10px] lg:text-xs text-gray-700 truncate block max-w-[120px]" title={resultado.escola_nome}>
                                    {resultado.escola_nome || '-'}
                                  </span>
                                </td>
                                <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                  <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                    {resultado.turma_codigo || '-'}
                                  </span>
                                </td>
                                <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                  <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                    {resultado.serie || '-'}
                                  </span>
                                </td>
                                <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  <span
                                    className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                                      resultado.presenca || 'P'
                                    )}`}
                                  >
                                    {resultado.presenca === 'P' || resultado.presenca === 'p' ? 'Presente' : 'Falta'}
                                  </span>
                                </td>
                                {/* Ordem das celulas: LP, MAT, CH, CN, PROD, Media */}
                                {/* 1. LP */}
                                <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_lp)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                    <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                      {resultado.total_acertos_lp}/{getTotalQuestoesPorSerie(resultado.serie, 'LP') || '-'}
                                    </div>
                                    <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_lp)}`}>
                                      {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                                    </div>
                                    {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                        <div
                                          className={`h-0.5 md:h-1 rounded-full ${
                                            notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* 2. MAT */}
                                <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_mat)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                    <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                      {resultado.total_acertos_mat}/{getTotalQuestoesPorSerie(resultado.serie, 'MAT') || '-'}
                                    </div>
                                    <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_mat)}`}>
                                      {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                                    </div>
                                    {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                        <div
                                          className={`h-0.5 md:h-1 rounded-full ${
                                            notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* 3. CH - Apenas Anos Finais ou Todos */}
                                {(filtros.tipo_ensino !== 'anos_iniciais') && (
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_ch)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      {isAnosIniciais(resultado.serie) ? (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mb-0.5 font-medium">N/A</div>
                                          <div className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold text-gray-400">-</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                            {resultado.total_acertos_ch}/{getTotalQuestoesPorSerie(resultado.serie, 'CH') || '-'}
                                          </div>
                                          <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_ch)}`}>
                                            {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                                          </div>
                                          {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                              <div
                                                className={`h-0.5 md:h-1 rounded-full ${
                                                  notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                              ></div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                                {/* 4. CN - Apenas Anos Finais ou Todos */}
                                {(filtros.tipo_ensino !== 'anos_iniciais') && (
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_cn)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      {isAnosIniciais(resultado.serie) ? (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mb-0.5 font-medium">N/A</div>
                                          <div className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold text-gray-400">-</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                            {resultado.total_acertos_cn}/{getTotalQuestoesPorSerie(resultado.serie, 'CN') || '-'}
                                          </div>
                                          <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_cn)}`}>
                                            {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                                          </div>
                                          {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                              <div
                                                className={`h-0.5 md:h-1 rounded-full ${
                                                  notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                              ></div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                                {/* 5. PROD - Apenas Anos Iniciais ou Todos */}
                                {(filtros.tipo_ensino !== 'anos_finais') && (
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${!isAnosIniciais(resultado.serie) ? 'bg-gray-50' : getNotaBgColor(resultado.nota_producao)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      {!isAnosIniciais(resultado.serie) ? (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mb-0.5 font-medium">N/A</div>
                                          <div className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold text-gray-400">-</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">-</div>
                                          <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_producao)}`}>
                                            {formatarNota(resultado.nota_producao, resultado.presenca, resultado.media_aluno)}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                                {/* 6. Media */}
                                <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  <div className={`inline-flex flex-col items-center justify-center px-0.5 sm:px-1 md:px-1.5 lg:px-2 py-0.5 sm:py-1 md:py-1.5 lg:py-2 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                                    mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                                    mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                                    'border-red-500'
                                  } w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                    <div className={`text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                                      {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                                    </div>
                                    {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                      <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Media
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                                  <button
                                    onClick={() => handleVisualizarQuestoes(resultado)}
                                    className="w-full inline-flex items-center justify-center px-1 sm:px-1.5 md:px-2 lg:px-3 py-1 sm:py-1 md:py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[9px] sm:text-[10px] md:text-xs font-medium shadow-sm"
                                    title="Ver questoes do aluno"
                                  >
                                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 mr-0.5 sm:mr-1 flex-shrink-0" />
                                    <span className="hidden md:inline">Ver Questoes</span>
                                    <span className="md:hidden">Ver</span>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                  </table>
                </div>
              </>
            )}
            </div>

            {/* Rodape de paginacao - fixo */}
            {paginacao.totalPaginas > 1 && (
              <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 rounded-b-xl gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-semibold">{((paginaAtual - 1) * paginacao.limite) + 1}</span> a{' '}
                  <span className="font-semibold">{Math.min(paginaAtual * paginacao.limite, paginacao.total)}</span> de{' '}
                  <span className="font-semibold">{paginacao.total}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={paginaAnterior}
                    disabled={!paginacao.temAnterior || carregando}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      paginacao.temAnterior && !carregando
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {paginaAtual > 2 && (
                      <>
                        <button
                          onClick={() => irParaPagina(1)}
                          className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          1
                        </button>
                        {paginaAtual > 3 && <span className="px-1 text-gray-400 dark:text-gray-500">...</span>}
                      </>
                    )}

                    {paginaAtual > 1 && (
                      <button
                        onClick={() => irParaPagina(paginaAtual - 1)}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {paginaAtual - 1}
                      </button>
                    )}

                    <button
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white"
                    >
                      {paginaAtual}
                    </button>

                    {paginaAtual < paginacao.totalPaginas && (
                      <button
                        onClick={() => irParaPagina(paginaAtual + 1)}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {paginaAtual + 1}
                      </button>
                    )}

                    {paginaAtual < paginacao.totalPaginas - 1 && (
                      <>
                        {paginaAtual < paginacao.totalPaginas - 2 && <span className="px-1 text-gray-400 dark:text-gray-500">...</span>}
                        <button
                          onClick={() => irParaPagina(paginacao.totalPaginas)}
                          className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {paginacao.totalPaginas}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={proximaPagina}
                    disabled={!paginacao.temProxima || carregando}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      paginacao.temProxima && !carregando
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="hidden sm:inline">Proxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {modalAberto && alunoSelecionado && (
            <ModalQuestoesAluno
              alunoId={alunoSelecionado.id}
              anoLetivo={alunoSelecionado.anoLetivo}
              mediaAluno={alunoSelecionado.mediaAluno}
              notasDisciplinas={alunoSelecionado.notasDisciplinas}
              isOpen={modalAberto}
              onClose={handleFecharModal}
            />
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
