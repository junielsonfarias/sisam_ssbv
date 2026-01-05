'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Filter, BarChart3, XCircle, School, BookOpen, TrendingUp, PieChart, Users } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

interface FiltrosGraficos {
  ano_letivo?: string
  escola_id?: string
  serie?: string
  disciplina?: string
}

export default function GraficosPoloPage() {
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [escolas, setEscolas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [poloId, setPoloId] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')
  const [erro, setErro] = useState<string>('')

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    try {
      // Verificar usuario e polo_id
      const authRes = await fetch('/api/auth/verificar')
      const authData = await authRes.json()

      if (authData.usuario && authData.usuario.polo_id) {
        setPoloId(authData.usuario.polo_id)

        // Carregar nome do polo
        const poloRes = await fetch(`/api/admin/polos?id=${authData.usuario.polo_id}`)
        const poloData = await poloRes.json()
        if (Array.isArray(poloData) && poloData.length > 0) {
          setPoloNome(poloData[0].nome)
        }
      }

      // Carregar escolas do polo
      const escolasRes = await fetch('/api/polo/escolas')
      const escolasData = await escolasRes.json()
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosGraficos, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }
      return novo
    })
  }

  const handleBuscarGraficos = async () => {
    setCarregando(true)
    setDados(null)
    setErro('')
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipoVisualizacao)
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/graficos?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ mensagem: 'Erro desconhecido' }))
        setErro(errorData.mensagem || 'Erro ao buscar gráficos')
        return
      }

      const data = await response.json()

      // Atualizar séries disponíveis do banco de dados
      if (data.series_disponiveis && Array.isArray(data.series_disponiveis)) {
        setSeries(data.series_disponiveis)
      }

      if (!data || Object.keys(data).length === 0) {
        setErro('Nenhum dado encontrado para os filtros selecionados')
        return
      }

      setDados(data)
    } catch (error: any) {
      console.error('Erro ao buscar gráficos:', error)
      setErro(error.message || 'Erro ao conectar com o servidor')
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

  return (
    <ProtectedRoute tiposPermitidos={['polo']}>
      <LayoutDashboard tipoUsuario="polo">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Análise Gráfica</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {poloNome && <span>Polo: {poloNome}</span>}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
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
                  <option value="distribuicao">Distribuição de Notas</option>
                  <option value="presenca">Presença/Falta</option>
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

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Polo
                </label>
                <input
                  type="text"
                  value={poloNome || 'Carregando...'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

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
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <select
                  value={filtros.disciplina || ''}
                  onChange={(e) => handleFiltroChange('disciplina', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todas</option>
                  <option value="LP">Língua Portuguesa</option>
                  <option value="CH">Ciências Humanas</option>
                  <option value="MAT">Matemática</option>
                  <option value="CN">Ciências da Natureza</option>
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

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {erro}
            </div>
          )}

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
                    {dados.disciplinas.totalAlunos && (
                      <span className="ml-auto text-xs sm:text-sm text-gray-600">
                        {dados.disciplinas.totalAlunos} alunos
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepararDadosBarras(dados.disciplinas.labels, dados.disciplinas.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 500 }} interval={0} angle={-15} textAnchor="end" height={100} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 14, fontWeight: 500 }} label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }} />
                      <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Média" fill="#4F46E5" />
                      <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right", fontSize: 14, fontWeight: 600 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Escola */}
              {dados.escolas && dados.escolas.labels && dados.escolas.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Desempenho por Escola</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(350, dados.escolas.labels.length * 40)}>
                    <BarChart data={prepararDadosBarras(dados.escolas.labels, dados.escolas.dados, 'Média')} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} />
                      <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11, fontWeight: 500 }} />
                      <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Média" fill="#10B981" />
                      <ReferenceLine x={7} stroke="#4F46E5" strokeDasharray="3 3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Série */}
              {dados.series && dados.series.labels && dados.series.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Desempenho por Série</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={prepararDadosBarras(dados.series.labels, dados.series.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 500 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 14, fontWeight: 500 }} label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }} />
                      <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
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
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 12, fontWeight: 500 }} />
                      <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />
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
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg font-medium">Selecione os filtros e clique em "Gerar Gráficos"</p>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
