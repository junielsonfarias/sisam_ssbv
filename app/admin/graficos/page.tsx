'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Filter, BarChart3, TrendingUp, PieChart, Users, BookOpen, School } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

interface FiltrosGraficos {
  ano_letivo?: string
  polo_id?: string
  escola_id?: string
  serie?: string
}

export default function GraficosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')

  useEffect(() => {
    carregarTipoUsuario()
  }, [])

  useEffect(() => {
    if (tipoUsuario) {
      carregarDadosIniciais()
    }
  }, [tipoUsuario])

  const carregarTipoUsuario = async () => {
    try {
      const response = await fetch('/api/auth/verificar')
      if (response.ok) {
        const data = await response.json()
        setTipoUsuario(data.tipo_usuario)
      }
    } catch (error) {
      console.error('Erro ao carregar tipo de usuário:', error)
    }
  }

  const carregarDadosIniciais = async () => {
    try {
      // Determinar qual API usar baseado no tipo de usuário
      if (tipoUsuario === 'polo') {
        // Polo: buscar apenas escolas do seu polo
        const escolasRes = await fetch('/api/polo/escolas')
        const escolasData = await escolasRes.json()
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
        setPolos([]) // Polo não precisa de lista de polos
      } else if (tipoUsuario === 'escola') {
        // Escola: não precisa de filtros, apenas seus próprios dados
        setPolos([])
        setEscolas([])
      } else {
        // Admin e Técnico: buscar todas as escolas e polos
        const [polosRes, escolasRes] = await Promise.all([
          fetch('/api/admin/polos'),
          fetch('/api/admin/escolas'),
        ])
        
        const polosData = await polosRes.json()
        const escolasData = await escolasRes.json()
        
        setPolos(Array.isArray(polosData) ? polosData : [])
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
      }

      // Extrair séries únicas
      const seriesUnicas = ['6º Ano', '7º Ano', '8º Ano', '9º Ano']
      setSeries(seriesUnicas)
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosGraficos, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor || undefined,
    }))
  }

  const handleBuscarGraficos = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipoVisualizacao)
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/graficos?${params.toString()}`)
      const data = await response.json()
      setDados(data)
    } catch (error) {
      console.error('Erro ao buscar gráficos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const prepararDadosBarras = (labels: string[], dados: number[], label: string) => {
    return labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0
    }))
  }

  const prepararDadosPizza = (labels: string[], dados: number[]) => {
    return labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0
    }))
  }

  const prepararDadosComparativo = () => {
    if (!dados?.comparativo_escolas) return []
    
    return dados.comparativo_escolas.escolas.map((escola: string, index: number) => ({
      escola,
      LP: dados.comparativo_escolas.mediaLP[index],
      CH: dados.comparativo_escolas.mediaCH[index],
      MAT: dados.comparativo_escolas.mediaMAT[index],
      CN: dados.comparativo_escolas.mediaCN[index],
      Média: dados.comparativo_escolas.mediaGeral[index]
    }))
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Análise Gráfica</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Visualize comparativos e estatísticas através de gráficos</p>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Tipo de Visualização
                </label>
                <select
                  value={tipoVisualizacao}
                  onChange={(e) => setTipoVisualizacao(e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="geral">Visão Geral</option>
                  <option value="disciplinas">Por Disciplina</option>
                  <option value="escolas">Por Escola</option>
                  <option value="series">Por Série</option>
                  <option value="polos">Por Polo</option>
                  <option value="distribuicao">Distribuição de Notas</option>
                  <option value="presenca">Presença/Falta</option>
                  <option value="comparativo_escolas">Comparativo Detalhado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Ex: 2025"
                />
              </div>

              {(tipoUsuario === 'admin' || tipoUsuario === 'administrador' || tipoUsuario === 'tecnico') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Polo
                  </label>
                  <select
                    value={filtros.polo_id || ''}
                    onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                    className="select-custom w-full text-sm sm:text-base"
                  >
                    <option value="">Todos</option>
                    {polos.map((polo) => (
                      <option key={polo.id} value={polo.id}>
                        {polo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(tipoUsuario === 'admin' || tipoUsuario === 'administrador' || tipoUsuario === 'tecnico' || tipoUsuario === 'polo') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Escola
                  </label>
                  <select
                    value={filtros.escola_id || ''}
                    onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                    className="select-custom w-full text-sm sm:text-base"
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
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todas</option>
                  {series.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleBuscarGraficos}
              disabled={carregando}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {carregando ? 'Carregando...' : 'Gerar Gráficos'}
            </button>
          </div>

          {/* Gráficos */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4 text-sm sm:text-base">Gerando gráficos...</p>
            </div>
          ) : dados ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Médias por Disciplina */}
              {dados.disciplinas && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Médias por Disciplina</h3>
                    <span className="ml-auto text-xs sm:text-sm text-gray-600">
                      {dados.disciplinas.totalAlunos} alunos
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepararDadosBarras(dados.disciplinas.labels, dados.disciplinas.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Média" fill="#4F46E5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Escolas */}
              {dados.escolas && dados.escolas.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Desempenho por Escola (Top 10)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={prepararDadosBarras(dados.escolas.labels, dados.escolas.dados, 'Média')}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Média" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Série */}
              {dados.series && dados.series.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Desempenho por Série</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={prepararDadosBarras(dados.series.labels, dados.series.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Polo */}
              {dados.polos && dados.polos.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Desempenho por Polo</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepararDadosBarras(dados.polos.labels, dados.polos.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Média" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Distribuição de Notas */}
              {dados.distribuicao && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Distribuição de Notas</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Quantidade de Alunos" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Taxa de Presença */}
              {dados.presenca && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Taxa de Presença</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={prepararDadosPizza(dados.presenca.labels, dados.presenca.dados)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Comparativo Detalhado de Escolas */}
              {dados.comparativo_escolas && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Comparativo Detalhado (Top 5 e Bottom 5)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepararDadosComparativo()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="escola" 
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="LP" name="LP" fill="#4F46E5" />
                      <Bar dataKey="CH" name="CH" fill="#10B981" />
                      <Bar dataKey="MAT" name="MAT" fill="#F59E0B" />
                      <Bar dataKey="CN" name="CN" fill="#EF4444" />
                      <Bar dataKey="Média" name="Média" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg font-medium">Selecione os filtros e clique em "Gerar Gráficos"</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">Escolha o tipo de visualização desejado para começar</p>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

