'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo } from 'react'
import { Search, TrendingUp, BookOpen, Award, Filter, X, Users, BarChart3, Target, CheckCircle2, Eye } from 'lucide-react'

interface ResultadoConsolidado {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
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
  media_aluno: number | string | null
}

interface Filtros {
  polo_id?: string
  escola_id?: string
  ano_letivo?: string
  serie?: string
  presenca?: string
}

export default function ResultadosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [resultados, setResultados] = useState<ResultadoConsolidado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Filtros>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{ id: string; anoLetivo?: string } | null>(null)

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
    carregarDadosIniciais()
  }, [])

  useEffect(() => {
    carregarResultados()
  }, [filtros])

  const carregarDadosIniciais = async () => {
    try {
      const [polosRes, escolasRes] = await Promise.all([
        fetch('/api/admin/polos'),
        fetch('/api/admin/escolas'),
      ])
      
      const polosData = await polosRes.json()
      const escolasData = await escolasRes.json()
      
      setPolos(polosData)
      setEscolas(escolasData)
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const carregarResultados = async () => {
    try {
      setCarregando(true)
      
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const response = await fetch(`/api/admin/resultados-consolidados?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar resultados')
      }
      
      const data = await response.json()
      
      // Garantir que os dados sejam um array
      if (Array.isArray(data)) {
        setResultados(data)
        
        // Extrair séries únicas dos resultados
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

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }
      
      // Se mudou o polo, limpar escola selecionada
      if (campo === 'polo_id' && !valor) {
        delete novo.escola_id
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
    if (!busca.trim()) return resultados
    
    const buscaLower = busca.toLowerCase()
    return resultados.filter(
      (r) =>
        r.aluno_nome.toLowerCase().includes(buscaLower) ||
        r.escola_nome.toLowerCase().includes(buscaLower) ||
        (r.turma_codigo && r.turma_codigo.toLowerCase().includes(buscaLower))
    )
  }, [resultados, busca])

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 text-green-800'
    }
    return 'bg-red-100 text-red-800'
  }

  const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null): string => {
    // Se aluno faltou, sempre retornar "-"
    if (presenca === 'F' || presenca === 'f') {
      return '-'
    }
    
    // Se média do aluno for 0 ou null, considerar faltante
    const mediaNum = typeof mediaAluno === 'string' ? parseFloat(mediaAluno) : mediaAluno
    if (mediaNum === 0 || mediaNum === null || mediaNum === undefined) {
      return '-'
    }
    
    if (nota === null || nota === undefined || nota === '') return '-'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return '-'
    if (num === 0) return '-' // Se nota for 0, também retornar "-"
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

  // Calcular estatísticas - EXCLUIR alunos faltantes
  const estatisticas = useMemo(() => {
    if (resultadosFiltrados.length === 0) {
      return {
        total: 0,
        mediaGeral: 0,
        presentes: 0,
        faltas: 0,
        mediaLP: 0,
        mediaCH: 0,
        mediaMAT: 0,
        mediaCN: 0,
      }
    }

    // Filtrar apenas alunos presentes (não faltantes)
    const alunosPresentes = resultadosFiltrados.filter((r) => {
      const presenca = r.presenca?.toString().toUpperCase()
      const mediaNum = getNotaNumero(r.media_aluno)
      // Considerar presente se presenca = 'P' E media não for 0 ou null
      return presenca === 'P' && mediaNum !== null && mediaNum !== 0
    })

    const medias = alunosPresentes
      .map((r) => getNotaNumero(r.media_aluno))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasLP = alunosPresentes
      .map((r) => getNotaNumero(r.nota_lp))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasCH = alunosPresentes
      .map((r) => getNotaNumero(r.nota_ch))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasMAT = alunosPresentes
      .map((r) => getNotaNumero(r.nota_mat))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasCN = alunosPresentes
      .map((r) => getNotaNumero(r.nota_cn))
      .filter((m): m is number => m !== null && m !== 0)

    const presentes = alunosPresentes.length
    const faltas = resultadosFiltrados.length - presentes

    return {
      total: resultadosFiltrados.length,
      mediaGeral: medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : 0,
      presentes,
      faltas,
      mediaLP: mediasLP.length > 0 ? mediasLP.reduce((a, b) => a + b, 0) / mediasLP.length : 0,
      mediaCH: mediasCH.length > 0 ? mediasCH.reduce((a, b) => a + b, 0) / mediasCH.length : 0,
      mediaMAT: mediasMAT.length > 0 ? mediasMAT.reduce((a, b) => a + b, 0) / mediasMAT.length : 0,
      mediaCN: mediasCN.length > 0 ? mediasCN.reduce((a, b) => a + b, 0) / mediasCN.length : 0,
    }
  }, [resultadosFiltrados])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resultados Consolidados</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Visualize notas e médias dos alunos</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
              <div className="flex items-center">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Filtros</h2>
              </div>
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 w-fit"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polo
                </label>
                <select
                  value={filtros.polo_id || ''}
                  onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  {polos.map((polo) => (
                    <option key={polo.id} value={polo.id}>
                      {polo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escola
                </label>
                <select
                  value={filtros.escola_id || ''}
                  onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  {escolas
                    .filter((e) => !filtros.polo_id || e.polo_id === filtros.polo_id)
                    .map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome}
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
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Ex: 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  {series.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presença
                </label>
                <select
                  value={filtros.presenca || ''}
                  onChange={(e) => handleFiltroChange('presenca', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  <option value="P">Presente</option>
                  <option value="F">Falta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Busca
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Aluno, escola ou turma..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          {resultadosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.total}</span>
                </div>
                <p className="text-sm opacity-90">Total de Alunos</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.mediaGeral.toFixed(1)}</span>
                </div>
                <p className="text-sm opacity-90">Média Geral</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.presentes}</span>
                </div>
                <p className="text-sm opacity-90">Presentes</p>
                <p className="text-xs opacity-75 mt-1">
                  {estatisticas.total > 0 ? ((estatisticas.presentes / estatisticas.total) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <X className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.faltas}</span>
                </div>
                <p className="text-sm opacity-90">Faltas</p>
                <p className="text-xs opacity-75 mt-1">
                  {estatisticas.total > 0 ? ((estatisticas.faltas / estatisticas.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* Médias por Área */}
          {resultadosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Língua Portuguesa</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaLP)}`}>
                      {estatisticas.mediaLP.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaLP >= 7 ? 'bg-green-500' : estatisticas.mediaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaLP / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Ciências Humanas</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaCH)}`}>
                      {estatisticas.mediaCH.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaCH >= 7 ? 'bg-green-500' : estatisticas.mediaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaCH / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Matemática</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaMAT)}`}>
                      {estatisticas.mediaMAT.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaMAT >= 7 ? 'bg-green-500' : estatisticas.mediaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaMAT / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Ciências da Natureza</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaCN)}`}>
                      {estatisticas.mediaCN.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaCN >= 7 ? 'bg-green-500' : estatisticas.mediaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaCN / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando resultados...</p>
              </div>
            ) : (
              <>
                {/* Visualização Mobile - Cards */}
                <div className="block sm:hidden space-y-4 p-4">
                  {resultadosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-500">Nenhum resultado encontrado</p>
                      <p className="text-sm mt-1 text-gray-400">Importe os dados primeiro</p>
                    </div>
                  ) : (
                    resultadosFiltrados.map((resultado, index) => {
                    const mediaNum = getNotaNumero(resultado.media_aluno)
                    const notaLP = getNotaNumero(resultado.nota_lp)
                    const notaCH = getNotaNumero(resultado.nota_ch)
                    const notaMAT = getNotaNumero(resultado.nota_mat)
                    const notaCN = getNotaNumero(resultado.nota_cn)

                    return (
                      <div key={resultado.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        {/* Cabeçalho do Card */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                          <div className="flex items-center gap-2 mr-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setAlunoSelecionado({
                                id: resultado.aluno_id || resultado.id,
                                anoLetivo: filtros.ano_letivo,
                              })
                              setModalAberto(true)
                            }}
                            className="flex items-center flex-1 text-left hover:opacity-80 transition-opacity"
                            title="Clique para ver questões do aluno"
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
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div>{resultado.escola_nome}</div>
                                {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                <div className="flex items-center gap-2">
                                  <span>Série: {resultado.serie || '-'}</span>
                                  <span className="text-gray-300">|</span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                                      resultado.presenca || 'P'
                                    )}`}
                                  >
                                    {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Notas em Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {/* LP */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_lp)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Língua Portuguesa</div>
                            <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_lp}/20</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_lp)} mb-1`}>
                              {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* CH */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_ch)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Ciências Humanas</div>
                            <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_ch}/10</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_ch)} mb-1`}>
                              {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* MAT */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_mat)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Matemática</div>
                            <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_mat}/20</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_mat)} mb-1`}>
                              {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* CN */}
                          <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_cn)} border border-gray-200`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Ciências da Natureza</div>
                            <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_cn}/10</div>
                            <div className={`text-lg font-bold ${getNotaColor(resultado.nota_cn)} mb-1`}>
                              {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Média e Ações */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' : 
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' : 
                            'border-red-500'
                          }`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Média Geral</div>
                            <div className={`text-2xl font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAlunoSelecionado({
                                id: resultado.aluno_id || resultado.id,
                                anoLetivo: filtros.ano_letivo,
                              })
                              setModalAberto(true)
                            }}
                            className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                            title="Ver questões do aluno"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Questões
                          </button>
                        </div>
                      </div>
                    )
                  }))}
                </div>

                {/* Visualização Tablet/Desktop - Tabela */}
                <div className="hidden sm:block w-full">
                  <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full divide-y divide-gray-200 min-w-0 md:min-w-[600px] lg:min-w-[700px]">
                      <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                        <tr>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-8 md:w-10 lg:w-12">
                            #
                          </th>
                          <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                            Aluno
                          </th>
                          <th className="hidden lg:table-cell text-left py-1 px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[150px]">
                            Escola
                          </th>
                          <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20">
                            Turma
                          </th>
                          <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                            Série
                          </th>
                          <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                            Presença
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            LP
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            CH
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            MAT
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            CN
                          </th>
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            Média
                          </th>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 lg:w-24">
                            Ações
                          </th>
                        </tr>
                      </thead>
                  <tbody className="divide-y divide-gray-200">
                    {resultadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 sm:py-12 text-center text-gray-500 px-4">
                          <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                          <p className="text-xs sm:text-sm mt-1">Importe os dados primeiro</p>
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
                          <tr key={resultado.id} className="hover:bg-indigo-50 transition-colors border-b border-gray-100">
                            <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => {
                                    setAlunoSelecionado({
                                      id: resultado.aluno_id || resultado.id,
                                      anoLetivo: filtros.ano_letivo,
                                    })
                                    setModalAberto(true)
                                  }}
                                  className="flex items-center w-full text-left hover:opacity-80 transition-opacity mb-1"
                                  title="Clique para ver questões do aluno"
                                >
                                  <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-1 sm:mr-1.5 md:mr-2">
                                    <span className="text-indigo-600 font-semibold text-[9px] sm:text-[10px] md:text-xs">
                                      {resultado.aluno_nome.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-[10px] sm:text-[11px] md:text-xs lg:text-sm truncate">{resultado.aluno_nome}</span>
                                </button>
                                <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                                  {resultado.escola_nome && <div className="whitespace-normal break-words">Escola: {resultado.escola_nome}</div>}
                                  {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                  {resultado.serie && <div>Série: {resultado.serie}</div>}
                                  <div className="flex items-center gap-2">
                                    <span>Presença: </span>
                                    <span
                                      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                        resultado.presenca || 'P'
                                      )}`}
                                    >
                                      {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                              <span className="text-gray-700 font-medium text-[10px] md:text-xs lg:text-sm block whitespace-normal break-words">{resultado.escola_nome}</span>
                            </td>
                            <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.turma_codigo || '-'}
                              </span>
                            </td>
                            <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.serie || '-'}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                                  resultado.presenca || 'P'
                                )}`}
                              >
                                {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                              </span>
                            </td>
                            <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_lp)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                  {resultado.total_acertos_lp}/20
                                </div>
                                <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_lp)}`}>
                                  {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
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
                            <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_ch)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                  {resultado.total_acertos_ch}/10
                                </div>
                                <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_ch)}`}>
                                  {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                    <div
                                      className={`h-0.5 md:h-1 rounded-full ${
                                        notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_mat)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                  {resultado.total_acertos_mat}/20
                                </div>
                                <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_mat)}`}>
                                  {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
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
                            <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_cn)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                  {resultado.total_acertos_cn}/10
                                </div>
                                <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_cn)}`}>
                                  {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                    <div
                                      className={`h-0.5 md:h-1 rounded-full ${
                                        notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
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
                                  <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600">
                                    Média
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                              <button
                                onClick={() => {
                                  setAlunoSelecionado({
                                    id: resultado.aluno_id || resultado.id,
                                    anoLetivo: filtros.ano_letivo,
                                  })
                                  setModalAberto(true)
                                }}
                                className="w-full inline-flex items-center justify-center px-1 sm:px-1.5 md:px-2 lg:px-3 py-1 sm:py-1 md:py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[9px] sm:text-[10px] md:text-xs font-medium shadow-sm"
                                title="Ver questões do aluno"
                              >
                                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 mr-0.5 sm:mr-1 flex-shrink-0" />
                                <span className="hidden md:inline">Ver Questões</span>
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
                </div>
                </>
              )}
            </div>
            </div>

          {resultadosFiltrados.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-indigo-700 font-medium">
                    <Users className="w-4 h-4 inline mr-1" />
                    Mostrando <strong>{resultadosFiltrados.length}</strong> de <strong>{resultados.length}</strong> resultados
                  </span>
                  {temFiltrosAtivos && (
                    <span className="text-indigo-600">
                      (Filtros aplicados)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-indigo-600">
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    Bom desempenho (≥7.0)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                    Desempenho médio (5.0-6.9)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    Desempenho abaixo (&lt;5.0)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Questões */}
          {alunoSelecionado && (
            <ModalQuestoesAluno
              alunoId={alunoSelecionado.id}
              anoLetivo={alunoSelecionado.anoLetivo}
              isOpen={modalAberto}
              onClose={() => {
                setModalAberto(false)
                setAlunoSelecionado(null)
              }}
            />
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

