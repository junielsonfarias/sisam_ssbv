'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo } from 'react'
import { Search, TrendingUp, BookOpen, Award, Filter, X, Users, BarChart3, Target, CheckCircle2, Eye } from 'lucide-react'

interface ResultadoConsolidado {
  id: string
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

  const formatarNota = (nota: number | string | null | undefined): string => {
    if (nota === null || nota === undefined || nota === '') return '-'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return '-'
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

  // Calcular estatísticas
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

    const medias = resultadosFiltrados
      .map((r) => getNotaNumero(r.media_aluno))
      .filter((m): m is number => m !== null)

    const mediasLP = resultadosFiltrados
      .map((r) => getNotaNumero(r.nota_lp))
      .filter((m): m is number => m !== null)

    const mediasCH = resultadosFiltrados
      .map((r) => getNotaNumero(r.nota_ch))
      .filter((m): m is number => m !== null)

    const mediasMAT = resultadosFiltrados
      .map((r) => getNotaNumero(r.nota_mat))
      .filter((m): m is number => m !== null)

    const mediasCN = resultadosFiltrados
      .map((r) => getNotaNumero(r.nota_cn))
      .filter((m): m is number => m !== null)

    const presentes = resultadosFiltrados.filter((r) => r.presenca === 'P' || r.presenca === 'p').length
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resultados Consolidados</h1>
              <p className="text-gray-600 mt-1">Visualize notas e médias dos alunos</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Filtros</h2>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Língua Portuguesa</p>
                    <p className={`text-2xl font-bold ${getNotaColor(estatisticas.mediaLP)}`}>
                      {estatisticas.mediaLP.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getNotaBgColor(estatisticas.mediaLP)}`}
                    style={{ width: `${Math.min((estatisticas.mediaLP / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ciências Humanas</p>
                    <p className={`text-2xl font-bold ${getNotaColor(estatisticas.mediaCH)}`}>
                      {estatisticas.mediaCH.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-10 h-10 text-green-400" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getNotaBgColor(estatisticas.mediaCH)}`}
                    style={{ width: `${Math.min((estatisticas.mediaCH / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Matemática</p>
                    <p className={`text-2xl font-bold ${getNotaColor(estatisticas.mediaMAT)}`}>
                      {estatisticas.mediaMAT.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-10 h-10 text-yellow-400" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getNotaBgColor(estatisticas.mediaMAT)}`}
                    style={{ width: `${Math.min((estatisticas.mediaMAT / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ciências da Natureza</p>
                    <p className={`text-2xl font-bold ${getNotaColor(estatisticas.mediaCN)}`}>
                      {estatisticas.mediaCN.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-10 h-10 text-purple-400" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getNotaBgColor(estatisticas.mediaCN)}`}
                    style={{ width: `${Math.min((estatisticas.mediaCN / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando resultados...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                    <tr>
                      <th className="text-left py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Aluno
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Escola
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Turma
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Série
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Presença
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        LP
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        CH
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        MAT
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        CN
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Média
                      </th>
                      <th className="text-center py-4 px-6 font-bold text-indigo-900 text-sm uppercase tracking-wider border-b border-indigo-200">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {resultadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-gray-500">
                          <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-lg font-medium">Nenhum resultado encontrado</p>
                          <p className="text-sm">Importe os dados primeiro</p>
                        </td>
                      </tr>
                    ) : (
                      resultadosFiltrados.map((resultado) => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        const notaLP = getNotaNumero(resultado.nota_lp)
                        const notaCH = getNotaNumero(resultado.nota_ch)
                        const notaMAT = getNotaNumero(resultado.nota_mat)
                        const notaCN = getNotaNumero(resultado.nota_cn)

                        return (
                          <tr key={resultado.id} className="hover:bg-indigo-50 transition-colors border-b border-gray-100">
                            <td className="py-4 px-6">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                  <span className="text-indigo-600 font-semibold text-sm">
                                    {resultado.aluno_nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-semibold text-gray-900">{resultado.aluno_nome}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-gray-700 font-medium">{resultado.escola_nome}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-mono text-xs font-medium">
                                {resultado.turma_codigo || '-'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                {resultado.serie || '-'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getPresencaColor(
                                  resultado.presenca || 'P'
                                )}`}
                              >
                                {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className={`inline-flex flex-col items-center p-3 rounded-lg ${getNotaBgColor(resultado.nota_lp)} min-w-[70px]`}>
                                <div className="text-xs text-gray-600 mb-1 font-medium">
                                  {resultado.total_acertos_lp}/20
                                </div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_lp)}`}>
                                  {formatarNota(resultado.nota_lp)}
                                </div>
                                {notaLP !== null && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className={`inline-flex flex-col items-center p-3 rounded-lg ${getNotaBgColor(resultado.nota_ch)} min-w-[70px]`}>
                                <div className="text-xs text-gray-600 mb-1 font-medium">
                                  {resultado.total_acertos_ch}/10
                                </div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_ch)}`}>
                                  {formatarNota(resultado.nota_ch)}
                                </div>
                                {notaCH !== null && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className={`inline-flex flex-col items-center p-3 rounded-lg ${getNotaBgColor(resultado.nota_mat)} min-w-[70px]`}>
                                <div className="text-xs text-gray-600 mb-1 font-medium">
                                  {resultado.total_acertos_mat}/20
                                </div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_mat)}`}>
                                  {formatarNota(resultado.nota_mat)}
                                </div>
                                {notaMAT !== null && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className={`inline-flex flex-col items-center p-3 rounded-lg ${getNotaBgColor(resultado.nota_cn)} min-w-[70px]`}>
                                <div className="text-xs text-gray-600 mb-1 font-medium">
                                  {resultado.total_acertos_cn}/10
                                </div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_cn)}`}>
                                  {formatarNota(resultado.nota_cn)}
                                </div>
                                {notaCN !== null && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className={`inline-flex flex-col items-center p-4 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                                mediaNum !== null && mediaNum >= 7 ? 'border-green-500' : 
                                mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' : 
                                'border-red-500'
                              } min-w-[80px]`}>
                                <div className={`text-2xl font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                                  {formatarNota(resultado.media_aluno)}
                                </div>
                                {mediaNum !== null && (
                                  <div className="mt-2 text-xs font-medium text-gray-600">
                                    Média
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => {
                                  setAlunoSelecionado({
                                    id: resultado.aluno_id || resultado.id,
                                    anoLetivo: filtros.ano_letivo,
                                  })
                                  setModalAberto(true)
                                }}
                                className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                title="Ver questões do aluno"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Questões
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
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

