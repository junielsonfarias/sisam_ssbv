'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalAlunosTurma from '@/components/modal-alunos-turma'
import { useEffect, useState, useMemo } from 'react'
import { Filter, X, School, TrendingUp, BarChart3, Users, Target, BookOpen, Eye, Trophy } from 'lucide-react'

interface DadosComparativo {
  escola_id: string
  escola_nome: string
  polo_id: string
  polo_nome: string
  serie: string
  turma_id: string | null
  turma_codigo: string | null
  total_alunos: number
  alunos_presentes: number
  total_turmas?: number
  media_geral: number | string
  media_lp: number | string
  media_ch: number | string
  media_mat: number | string
  media_cn: number | string
  media_acertos_lp: number | string
  media_acertos_ch: number | string
  media_acertos_mat: number | string
  media_acertos_cn: number | string
}

export default function ComparativosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [escolas, setEscolas] = useState<any[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<string[]>([])
  const [filtros, setFiltros] = useState({
    polo_id: '',
    ano_letivo: '', // Deixar vazio por padrão para buscar todos os anos
    serie: '',
    turma_id: '',
  })
  const [dados, setDados] = useState<Record<string, DadosComparativo[]>>({})
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativo[]>>({})
  const [melhoresAlunos, setMelhoresAlunos] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(false)
  const [modalAlunosAberto, setModalAlunosAberto] = useState(false)
  const [turmaSelecionada, setTurmaSelecionada] = useState<{
    turma_id: string
    turma_codigo: string
    escola_nome: string
    serie: string
  } | null>(null)

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
    carregarTurmas()
  }, [filtros.serie, escolasSelecionadas, filtros.ano_letivo, filtros.polo_id])

  useEffect(() => {
    carregarComparativos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolasSelecionadas, filtros])

  const carregarDadosIniciais = async () => {
    try {
      const [escolasRes, polosRes] = await Promise.all([
        fetch('/api/admin/escolas'),
        fetch('/api/admin/polos'),
      ])
      
      const escolasData = await escolasRes.json()
      const polosData = await polosRes.json()
      
      setEscolas(escolasData)
      setPolos(polosData)
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const carregarTurmas = async () => {
    // Só carrega turmas se houver série selecionada
    if (!filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('serie', filtros.serie)
      
      // Se há polo selecionado, filtrar escolas pelo polo antes de buscar turmas
      if (filtros.polo_id && escolasSelecionadas.length === 0) {
        // Se não há escolas selecionadas mas há polo, usar todas as escolas do polo
        const escolasDoPolo = escolas.filter((e) => e.polo_id === filtros.polo_id).map((e) => e.id)
        if (escolasDoPolo.length > 0) {
          params.append('escolas_ids', escolasDoPolo.join(','))
        }
      } else if (escolasSelecionadas.length > 0) {
        // Filtrar apenas as escolas selecionadas que pertencem ao polo (se polo estiver selecionado)
        const escolasFiltradas = filtros.polo_id
          ? escolasSelecionadas.filter((id) => {
              const escola = escolas.find((e) => e.id === id)
              return escola && escola.polo_id === filtros.polo_id
            })
          : escolasSelecionadas
        
        if (escolasFiltradas.length > 0) {
          params.append('escolas_ids', escolasFiltradas.join(','))
        }
      }
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setTurmas([])
    }
  }

  const carregarComparativos = async () => {
    if (escolasSelecionadas.length === 0 && !filtros.polo_id) {
      setDados({})
      return
    }

    setCarregando(true)
    try {
      const params = new URLSearchParams()
      
      if (escolasSelecionadas.length > 0) {
        params.append('escolas_ids', escolasSelecionadas.join(','))
      }
      
      if (filtros.polo_id) {
        params.append('polo_id', filtros.polo_id)
      }
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }
      
      if (filtros.serie) {
        params.append('serie', filtros.serie)
      }
      
      if (filtros.turma_id) {
        params.append('turma_id', filtros.turma_id)
      }

      const response = await fetch(`/api/admin/comparativos?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dadosPorSerie || {}) // Por turma
        setDadosAgregados(data.dadosPorSerieAgregado || {}) // Agregado por série
        setMelhoresAlunos(data.melhoresAlunos || {}) // Melhores alunos
        
        // Extrair séries únicas
        const seriesUnicas = [...new Set(data.dados?.map((d: DadosComparativo) => d.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        console.error('Erro na API:', data.mensagem)
        setDados({})
      }
    } catch (error) {
      console.error('Erro ao carregar comparativos:', error)
      setDados({})
    } finally {
      setCarregando(false)
    }
  }

  const toggleEscola = (escolaId: string) => {
    setEscolasSelecionadas((prev) =>
      prev.includes(escolaId)
        ? prev.filter((id) => id !== escolaId)
        : [...prev, escolaId]
    )
  }

  const limparFiltros = () => {
    setEscolasSelecionadas([])
    setFiltros({
      polo_id: '',
      ano_letivo: '',
      serie: '',
      turma_id: '',
    })
  }

  const formatarNumero = (valor: number | string | null): string => {
    if (valor === null || valor === undefined) return '-'
    const num = typeof valor === 'string' ? parseFloat(valor) : valor
    if (isNaN(num)) return '-'
    return num.toFixed(1)
  }

  const getNotaColor = (nota: number | string | null) => {
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (num === null || isNaN(num)) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const escolasFiltradas = useMemo(() => {
    if (!filtros.polo_id) return escolas
    return escolas.filter((e) => e.polo_id === filtros.polo_id)
  }, [escolas, filtros.polo_id])

  const totalEscolasComparadas = useMemo(() => {
    return new Set(
      Object.values(dados).flat().map((d) => d.escola_id)
    ).size
  }, [dados])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comparativo de Escolas</h1>
              <p className="text-gray-600 mt-1">Compare o desempenho entre escolas, séries e turmas</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Filtros de Comparação</h2>
              </div>
              {(escolasSelecionadas.length > 0 || filtros.polo_id || filtros.serie) && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polo
                </label>
                <select
                  value={filtros.polo_id}
                  onChange={(e) => {
                    setFiltros((prev) => ({ ...prev, polo_id: e.target.value }))
                    setEscolasSelecionadas([])
                  }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo (opcional)
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, ano_letivo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Ex: 2026 (deixe vazio para todos)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie}
                  onChange={(e) => {
                    setFiltros((prev) => ({ ...prev, serie: e.target.value, turma_id: '' }))
                  }}
                  className="select-custom w-full"
                >
                  <option value="">Todas as séries</option>
                  {series.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma {filtros.serie ? '(opcional)' : '(selecione uma série primeiro)'}
                </label>
                <select
                  value={filtros.turma_id}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, turma_id: e.target.value }))}
                  disabled={!filtros.serie}
                  className="select-custom w-full"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo} - {turma.escola_nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleção de Escolas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Escolas para Comparar ({escolasSelecionadas.length} selecionadas)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {escolasFiltradas.map((escola) => (
                    <label
                      key={escola.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={escolasSelecionadas.includes(escola.id)}
                        onChange={() => toggleEscola(escola.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{escola.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Carregando comparativos...</p>
            </div>
          ) : Object.keys(dados).length > 0 ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <School className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600">Escolas comparadas</p>
                      <p className="text-2xl font-bold text-indigo-900">{totalEscolasComparadas}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600">Séries analisadas</p>
                      <p className="text-2xl font-bold text-indigo-900">{Object.keys(dados).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparativos por Série */}
              {Object.entries(dados).map(([serie, dadosSerie]) => {
                const dadosAgregadosSerie = dadosAgregados[serie] || []
                
                return (
                  <div key={serie} className="space-y-4">
                    {/* Seção: Dados Agregados por Escola/Série */}
                    {dadosAgregadosSerie.length > 0 && !filtros.turma_id && (
                      <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                          <h3 className="text-xl font-bold text-blue-900 flex items-center">
                            <School className="w-5 h-5 mr-2" />
                            {serie} - Resumo Geral por Escola
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Dados consolidados de todas as turmas desta série
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px]">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[150px]">Escola</th>
                                <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[120px]">Polo</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">Turmas</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[90px]">Total Alunos</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[100px]">Presentes</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">LP</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">CH</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">MAT</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">CN</th>
                                <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[100px]">Média Geral</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {dadosAgregadosSerie.map((item, index) => (
                                <tr key={`agregado-${item.escola_id}-${item.serie}-${index}`} className="hover:bg-blue-50 bg-blue-50/30">
                                  <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <School className="w-3 h-3 md:w-4 md:h-4 mr-2 text-blue-600" />
                                      <span className="font-bold text-gray-900 text-xs md:text-sm">{item.escola_nome}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                                    <span className="text-gray-600 text-xs md:text-sm">{item.polo_nome}</span>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 md:px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-semibold text-xs">
                                      {item.total_turmas || 0} turma(s)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <span className="text-gray-700 font-bold text-xs md:text-sm">{item.total_alunos}</span>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <span className="text-gray-700 font-medium text-xs md:text-sm">
                                      {item.alunos_presentes} ({item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : 0}%)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_lp)}/20</span>
                                      <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                        {formatarNumero(item.media_lp)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_ch)}/10</span>
                                      <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                        {formatarNumero(item.media_ch)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_mat)}/20</span>
                                      <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                        {formatarNumero(item.media_mat)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_cn)}/10</span>
                                      <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                        {formatarNumero(item.media_cn)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                    <div className={`inline-flex items-center justify-center px-2 md:px-3 py-1 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                      <span className={`text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                        {formatarNumero(item.media_geral)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Seção de Melhores Alunos */}
                        {dadosAgregadosSerie.map((item) => {
                          const keyMelhores = `${item.escola_id}_${serie}`
                          const melhores = melhoresAlunos[keyMelhores]
                          
                          return (
                            <div key={`melhores-${item.escola_id}`} className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-200">
                              <h4 className="font-bold text-yellow-900 mb-3 flex items-center">
                                <Target className="w-4 h-4 mr-2" />
                                Melhores Desempenhos - {item.escola_nome}
                              </h4>
                              
                              {melhores ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Melhor Aluno Geral */}
                                  {melhores.melhorGeral && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🏆 Melhor Média Geral</p>
                                      <p className="text-sm font-bold text-gray-900">{melhores.melhorGeral.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorGeral.turma_codigo || 'N/A'} | Média: {formatarNumero(melhores.melhorGeral.media_geral)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente LP */}
                                  {melhores.melhorLP && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">📚 Melhor LP</p>
                                      <p className="text-sm font-bold text-gray-900">{melhores.melhorLP.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorLP.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorLP.nota_lp)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente CH */}
                                  {melhores.melhorCH && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🌍 Melhor CH</p>
                                      <p className="text-sm font-bold text-gray-900">{melhores.melhorCH.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorCH.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorCH.nota_ch)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente MAT */}
                                  {melhores.melhorMAT && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🔢 Melhor MAT</p>
                                      <p className="text-sm font-bold text-gray-900">{melhores.melhorMAT.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorMAT.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorMAT.nota_mat)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente CN */}
                                  {melhores.melhorCN && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🔬 Melhor CN</p>
                                      <p className="text-sm font-bold text-gray-900">{melhores.melhorCN.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorCN.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorCN.nota_cn)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhores por Turma */}
                                  {melhores.melhoresPorTurma && melhores.melhoresPorTurma.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm md:col-span-2 lg:col-span-3">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">⭐ Melhor Aluno por Turma</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {melhores.melhoresPorTurma.map((melhorTurma: any, idx: number) => (
                                          <div key={idx} className="bg-gray-50 rounded p-2">
                                            <p className="text-xs font-medium text-gray-700">
                                              <span className="font-bold">{melhorTurma.turma_codigo || 'Sem turma'}:</span> {melhorTurma.aluno_nome}
                                            </p>
                                            <p className="text-xs text-gray-500">Média: {formatarNumero(melhorTurma.media_geral)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Nenhum dado de melhor desempenho disponível</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Seção: Dados Detalhados por Turma */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
                        <h3 className="text-xl font-bold text-indigo-900 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2" />
                          {serie} - Detalhado por Turma
                        </h3>
                      </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[150px]">Escola</th>
                          <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[120px]">Polo</th>
                          {!filtros.turma_id && (
                            <th className="text-left py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[100px]">Turma</th>
                          )}
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[70px]">Alunos</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[100px]">Presentes</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">LP</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">CH</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">MAT</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[80px]">CN</th>
                          <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[100px]">Média Geral</th>
                          {!filtros.turma_id && (
                            <th className="text-center py-3 px-3 md:px-4 font-semibold text-gray-700 text-xs md:text-sm uppercase whitespace-nowrap min-w-[120px]">Ações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dadosSerie.map((item, index) => (
                          <tr key={`${item.escola_id}-${item.serie}-${item.turma_id || 'sem-turma'}-${index}`} className="hover:bg-gray-50">
                            <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                              <span className="font-semibold text-gray-900 text-xs md:text-sm">{item.escola_nome}</span>
                            </td>
                            <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                              <span className="text-gray-600 text-xs md:text-sm">{item.polo_nome}</span>
                            </td>
                            {!filtros.turma_id && (
                              <td className="py-3 px-3 md:px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 md:px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-mono text-xs font-medium">
                                  {item.turma_codigo || '-'}
                                </span>
                              </td>
                            )}
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <span className="text-gray-700 font-medium text-xs md:text-sm">{item.total_alunos}</span>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <span className="text-gray-700 font-medium text-xs md:text-sm">
                                {item.alunos_presentes} ({item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : 0}%)
                              </span>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_lp)}/20</span>
                                <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                  {formatarNumero(item.media_lp)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_ch)}/10</span>
                                <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                  {formatarNumero(item.media_ch)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_mat)}/20</span>
                                <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                  {formatarNumero(item.media_mat)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_cn)}/10</span>
                                <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                  {formatarNumero(item.media_cn)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                              <div className={`inline-flex items-center justify-center px-2 md:px-3 py-1 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                <span className={`text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                  {formatarNumero(item.media_geral)}
                                </span>
                              </div>
                            </td>
                            {!filtros.turma_id && (
                              <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                                {item.turma_id && (
                                  <button
                                    onClick={() => {
                                      setTurmaSelecionada({
                                        turma_id: item.turma_id!,
                                        turma_codigo: item.turma_codigo || 'Sem código',
                                        escola_nome: item.escola_nome,
                                        serie: item.serie
                                      })
                                      setModalAlunosAberto(true)
                                    }}
                                    className="inline-flex items-center px-2 md:px-3 py-1.5 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium"
                                    title="Ver todos os alunos desta turma"
                                  >
                                    <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                    <span className="hidden md:inline">Ver Alunos</span>
                                    <span className="md:hidden">Ver</span>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">
                {escolasSelecionadas.length === 0 && !filtros.polo_id
                  ? 'Selecione escolas para comparar'
                  : 'Nenhum dado encontrado'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {escolasSelecionadas.length === 0 && !filtros.polo_id
                  ? 'Escolha uma ou mais escolas e configure os filtros'
                  : 'Verifique se há dados para as escolas selecionadas no ano letivo informado'}
              </p>
            </div>
          )}

          {/* Modal de Alunos da Turma */}
          {turmaSelecionada && (
            <ModalAlunosTurma
              turmaId={turmaSelecionada.turma_id}
              turmaCodigo={turmaSelecionada.turma_codigo}
              escolaNome={turmaSelecionada.escola_nome}
              serie={turmaSelecionada.serie}
              anoLetivo={filtros.ano_letivo}
              isOpen={modalAlunosAberto}
              onClose={() => {
                setModalAlunosAberto(false)
                setTurmaSelecionada(null)
              }}
            />
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

