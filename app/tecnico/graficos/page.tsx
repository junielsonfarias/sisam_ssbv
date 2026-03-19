'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Filter, BarChart3, TrendingUp, PieChart, Users, BookOpen, School, XCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ReferenceLine } from 'recharts'
import { isAnosIniciais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Cores específicas para cada disciplina
const DISCIPLINA_COLORS: { [key: string]: string } = {
  'Língua Portuguesa': '#4F46E5', // Azul Indigo
  'Ciências Humanas': '#10B981',   // Verde Esmeralda
  'Matemática': '#F59E0B',         // Laranja Âmbar
  'Ciências da Natureza': '#EF4444', // Vermelho
  'Produção Textual': '#8B5CF6'    // Roxo Violeta
}

interface FiltrosGraficos {
  ano_letivo?: string
  polo_id?: string
  escola_id?: string
  serie?: string
  disciplina?: string
  turma_id?: string
}

export default function GraficosTecnicoPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('tecnico')
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')
  const [erro, setErro] = useState<string>('')

  // Disciplinas disponíveis baseado na série selecionada
  const disciplinasDisponiveis = useMemo(() => {
    if (filtros.serie && isAnosIniciais(filtros.serie)) {
      return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
    }
    return DISCIPLINAS_OPTIONS_ANOS_FINAIS
  }, [filtros.serie])

  // Limpar disciplina se não estiver disponível para a série selecionada
  useEffect(() => {
    if (filtros.disciplina && filtros.serie) {
      const disciplinaValida = disciplinasDisponiveis.some(d => d.value === filtros.disciplina)
      if (!disciplinaValida) {
        setFiltros(prev => ({ ...prev, disciplina: undefined }))
      }
    }
  }, [filtros.serie, filtros.disciplina, disciplinasDisponiveis])

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  // Carregar turmas quando escola for selecionada
  useEffect(() => {
    // Só carregar se escola_id for válido (não vazio, não undefined, não "Todas")
    if (filtros.escola_id && filtros.escola_id !== '' && filtros.escola_id !== 'undefined' && filtros.escola_id.toLowerCase() !== 'todas') {
      const params = new URLSearchParams()
      params.append('escolas_ids', filtros.escola_id)
      if (filtros.ano_letivo && filtros.ano_letivo.trim() !== '') {
        params.append('ano_letivo', filtros.ano_letivo.trim())
      }
      if (filtros.serie && filtros.serie.trim() !== '') {
        params.append('serie', filtros.serie.trim())
      }
      
      if (process.env.NODE_ENV === 'development') {
      }
      
      fetch(`/api/admin/turmas?${params.toString()}`)
        .then(r => {
          if (!r.ok) {
            throw new Error(`Erro ao carregar turmas: ${r.status}`)
          }
          return r.json()
        })
        .then(data => {
          if (process.env.NODE_ENV === 'development') {
          }
          if (Array.isArray(data)) {
            setTurmas(data)
            // Se não houver turmas e houver turma_id selecionada, limpar
            if (data.length === 0 && filtros.turma_id) {
              setFiltros(prev => ({ ...prev, turma_id: undefined }))
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
            }
            setTurmas([])
            setFiltros(prev => ({ ...prev, turma_id: undefined }))
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
          }
          setTurmas([])
          setFiltros(prev => ({ ...prev, turma_id: undefined }))
        })
    } else {
      // Limpar turmas quando escola não estiver selecionada
      setTurmas([])
      setFiltros(prev => ({ ...prev, turma_id: undefined }))
    }
  }, [filtros.escola_id, filtros.ano_letivo, filtros.serie])

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

      // Séries serão carregadas do banco quando buscar gráficos
      // Inicializar vazio para evitar mostrar séries que não existem
      setSeries([])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
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
    setDados(null)
    setErro('')
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipoVisualizacao)
      // Forçar atualização do cache para sempre buscar dados frescos
      params.append('atualizar_cache', 'true')
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/graficos?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ mensagem: 'Erro desconhecido' }))
        if (process.env.NODE_ENV === 'development') {
        }
        setErro(errorData.mensagem || 'Erro ao buscar gráficos')
        return
      }

      const data = await response.json()
      
      // Atualizar séries disponíveis do banco de dados
      if (data.series_disponiveis && Array.isArray(data.series_disponiveis)) {
        setSeries(data.series_disponiveis)
      }
      
      // Verificar se há dados válidos
      if (!data || Object.keys(data).length === 0) {
        setErro('Nenhum dado encontrado para os filtros selecionados')
        return
      }

      // Verificar se há dados para o tipo de visualização selecionado
      const tiposSemDados = [
        'acertos_erros', 'questoes', 'heatmap', 'radar', 'boxplot', 
        'correlacao', 'ranking', 'aprovacao', 'gaps'
      ]
      
      if (tiposSemDados.includes(tipoVisualizacao)) {
        const campoDados = tipoVisualizacao === 'acertos_erros' ? 'acertos_erros' :
                          tipoVisualizacao === 'questoes' ? 'questoes' :
                          tipoVisualizacao === 'heatmap' ? 'heatmap' :
                          tipoVisualizacao === 'radar' ? 'radar' :
                          tipoVisualizacao === 'boxplot' ? 'boxplot' :
                          tipoVisualizacao === 'correlacao' ? 'correlacao' :
                          tipoVisualizacao === 'ranking' ? 'ranking' :
                          tipoVisualizacao === 'aprovacao' ? 'aprovacao' :
                          'gaps'
        
        if (!data[campoDados] || (Array.isArray(data[campoDados]) && data[campoDados].length === 0)) {
          setErro('Nenhum dado encontrado para os filtros selecionados. Verifique se há alunos cadastrados com os critérios escolhidos.')
          setDados(null)
          return
        }
      }
      
      setDados(data)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
      }
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

  // Preparar dados de disciplinas ordenados por média (maior para menor) com cores
  const prepararDadosDisciplinas = (labels: string[], dados: number[]) => {
    const combined = labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0,
      fill: DISCIPLINA_COLORS[l] || COLORS[i % COLORS.length]
    }))
    // Ordenar por valor decrescente
    return combined.sort((a, b) => b.value - a.value)
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
      CH: dados.comparativo_escolas.mediaCH?.[index] || 0,
      MAT: dados.comparativo_escolas.mediaMAT[index],
      CN: dados.comparativo_escolas.mediaCN?.[index] || 0,
      PT: dados.comparativo_escolas.mediaPT?.[index] || 0,
      Média: dados.comparativo_escolas.mediaGeral[index]
    }))
  }

  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Análise Gráfica</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Visualize comparativos e estatísticas através de gráficos</p>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                  <option value="acertos_erros">Acertos e Erros</option>
                  <option value="questoes">Taxa de Acerto por Questão</option>
                  <option value="heatmap">Heatmap de Desempenho</option>
                  <option value="radar">Perfil de Desempenho (Radar)</option>
                  <option value="boxplot">Distribuição Detalhada (Box Plot)</option>
                  <option value="correlacao">Correlação entre Disciplinas</option>
                  <option value="ranking">Ranking Interativo</option>
                  <option value="aprovacao">Taxa de Aprovação</option>
                  <option value="gaps">Análise de Gaps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400"
                  placeholder="Ex: 2025"
                />
              </div>

              {(tipoUsuario === 'admin' || tipoUsuario === 'administrador' || tipoUsuario === 'tecnico') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Disciplina
                </label>
                <select
                  value={filtros.disciplina || ''}
                  onChange={(e) => handleFiltroChange('disciplina', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todas</option>
                  {disciplinasDisponiveis.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {filtros.escola_id && filtros.escola_id !== '' && filtros.escola_id !== 'undefined' && filtros.escola_id.toLowerCase() !== 'todas' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Turma
                  </label>
                  <select
                    value={filtros.turma_id || ''}
                    onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
                    className="select-custom w-full text-sm sm:text-base"
                    disabled={turmas.length === 0}
                  >
                    <option value="">Todas</option>
                    {turmas.length > 0 ? (
                      turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.codigo || t.nome || `Turma ${t.id}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Nenhuma turma encontrada</option>
                    )}
                  </select>
                  {turmas.length === 0 && filtros.escola_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhuma turma encontrada para esta escola{filtros.ano_letivo ? ` no ano ${filtros.ano_letivo}` : ''}{filtros.serie ? ` e série ${filtros.serie}` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleBuscarGraficos}
                disabled={carregando}
                className="bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {carregando ? 'Carregando...' : 'Gerar Gráficos'}
              </button>
              
              {dados && (
                <button
                  onClick={() => {
                    window.print()
                  }}
                  className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                >
                  📄 Imprimir/Exportar
                </button>
              )}
            </div>
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {erro}
            </div>
          )}

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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
                    <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {dados.disciplinas.totalAlunos} alunos
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados)}>
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
                      <Bar dataKey="value" name="Média">
                        {prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                      {/* Linha de referência para meta (7.0) */}
                      <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right" }} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Indicadores Estatísticos */}
                  {dados.disciplinas.desvios && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {dados.disciplinas.labels.map((label: string, index: number) => {
                        const media = dados.disciplinas.dados[index] || 0
                        const desvio = dados.disciplinas.desvios[index] || 0
                        const taxaAprov = dados.disciplinas.taxas_aprovacao?.[index] || 0
                        const getFaixa = (nota: number) => {
                          if (nota >= 8) return { nome: 'Excelente', cor: 'text-green-600', bg: 'bg-green-50' }
                          if (nota >= 6) return { nome: 'Bom', cor: 'text-blue-600', bg: 'bg-blue-50' }
                          if (nota >= 4) return { nome: 'Regular', cor: 'text-yellow-600', bg: 'bg-yellow-50' }
                          return { nome: 'Insuficiente', cor: 'text-red-600', bg: 'bg-red-50' }
                        }
                        const faixa = getFaixa(media)
                        
                        return (
                          <div key={index} className={`p-3 rounded-lg ${faixa.bg}`}>
                            <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{media.toFixed(2)}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Desvio: {desvio.toFixed(2)}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Aprovação: {taxaAprov.toFixed(1)}%</p>
                            <p className={`text-xs font-semibold mt-1 ${faixa.cor}`}>{faixa.nome}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Top Escolas */}
              {dados.escolas && dados.escolas.labels.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Escola</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(500, Math.min(800, dados.escolas.labels.length * 50))}>
                    <BarChart 
                      data={prepararDadosBarras(dados.escolas.labels, dados.escolas.dados, 'Média')}
                      layout="vertical"
                      margin={{ left: 15, right: 40, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 10]} 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Média', position: 'insideBottom', offset: -5, fontSize: 14, fontWeight: 600 }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={Math.min(300, Math.max(180, dados.escolas.labels.reduce((max: number, label: string) => Math.max(max, label.length * 7.5), 180)))}
                        tick={{ fontSize: 12, fontWeight: 500 }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 13, fontWeight: 500 }}
                        labelStyle={{ fontSize: 13, fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Média" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Série */}
              {dados.series && dados.series.labels.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Série</h3>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Polo</h3>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Notas</h3>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Presença</h3>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Comparativo Detalhado (Top 5 e Bottom 5)</h3>
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
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CH" name="CH" fill="#10B981" />
                      )}
                      <Bar dataKey="MAT" name="MAT" fill="#F59E0B" />
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CN" name="CN" fill="#EF4444" />
                      )}
                      {dados.comparativo_escolas.temAnosIniciais && (
                        <Bar dataKey="PT" name="PT" fill="#8B5CF6" />
                      )}
                      <Bar dataKey="Média" name="Média" fill="#6B7280" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Acertos e Erros */}
              {dados.acertos_erros && dados.acertos_erros.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Acertos e Erros {filtros.disciplina ? `- ${filtros.disciplina === 'LP' ? 'Língua Portuguesa' : filtros.disciplina === 'CH' ? 'Ciências Humanas' : filtros.disciplina === 'MAT' ? 'Matemática' : filtros.disciplina === 'CN' ? 'Ciências da Natureza' : filtros.disciplina}` : '(Geral)'}
                    </h3>
                    {dados.acertos_erros_meta?.tipo === 'por_questao' && (
                      <span className="ml-auto text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                        {dados.acertos_erros_meta.total_questoes} questões
                      </span>
                    )}
                  </div>

                  {/* Se são dados por questão (disciplina selecionada), usar layout horizontal */}
                  {dados.acertos_erros_meta?.tipo === 'por_questao' ? (
                    <>
                      {/* Informação de presença */}
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700 dark:text-blue-300">
                              <strong>Total de alunos:</strong> {dados.acertos_erros_meta?.total_alunos_cadastrados || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-green-700 dark:text-green-300">
                              <strong>Presentes:</strong> {dados.acertos_erros_meta?.total_presentes || 0}
                            </span>
                          </div>
                          {dados.acertos_erros_meta?.total_faltantes > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              <span className="text-orange-700 dark:text-orange-300">
                                <strong>Faltantes:</strong> {dados.acertos_erros_meta?.total_faltantes || 0}
                              </span>
                            </div>
                          )}
                        </div>
                        {dados.acertos_erros_meta?.total_faltantes > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                            ⚠️ Os dados de acertos/erros consideram apenas os {dados.acertos_erros_meta?.total_presentes} alunos presentes.
                          </p>
                        )}
                      </div>

                      <ResponsiveContainer width="100%" height={Math.max(400, dados.acertos_erros.length * 40)}>
                        <BarChart data={dados.acertos_erros} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            label={{ value: 'Número de Alunos (Presentes)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="nome"
                            width={60}
                            tick={{ fontSize: 12, fontWeight: 500 }}
                          />
                          <Tooltip
                            formatter={(value: any, name: string) => [
                              `${value} alunos`,
                              name === 'acertos' ? 'Acertaram' : 'Erraram'
                            ]}
                            labelFormatter={(label) => `Questão ${label.replace('Q', '')}`}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Legend
                            formatter={(value) => value === 'acertos' ? 'Acertos (alunos)' : 'Erros (alunos)'}
                          />
                          <Bar dataKey="acertos" name="acertos" fill="#10B981" stackId="a" />
                          <Bar dataKey="erros" name="erros" fill="#EF4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Resumo por Questão:</strong> {dados.acertos_erros_meta?.total_presentes || 0} alunos presentes
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                          {dados.acertos_erros.map((item: any) => (
                            <div key={item.nome} className="flex justify-between bg-white dark:bg-slate-800 p-2 rounded border">
                              <span className="font-medium">{item.nome}:</span>
                              <span>
                                <span className="text-green-600">{item.acertos}</span>
                                {' / '}
                                <span className="text-red-600">{item.erros}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Layout original para dados agrupados por escola/turma */
                    <>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={dados.acertos_erros} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="nome"
                            tick={{ fontSize: 11 }}
                            width={150}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="acertos" name="Acertos" fill="#10B981" stackId="a" />
                          <Bar dataKey="erros" name="Erros" fill="#EF4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                      {dados.acertos_erros[0]?.total_alunos && (
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                          <p>Total de alunos analisados: {dados.acertos_erros.reduce((acc: number, item: any) => acc + (item.total_alunos || 0), 0)}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Taxa de Acerto por Questão */}
              {dados.questoes && dados.questoes.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Taxa de Acerto por Questão ({dados.questoes.length} questões)
                    </h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.questoes.length * 25)}>
                    <BarChart data={dados.questoes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: 'Taxa de Acerto (%)', position: 'insideBottom', offset: -5 }} />
                      <YAxis
                        type="category"
                        dataKey="codigo"
                        width={80}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${value}%`, 'Taxa de Acerto']}
                        labelFormatter={(label) => `Questão ${label}`}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" fill="#EF4444">
                        {dados.questoes.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.taxa_acerto < 30 ? '#EF4444' : entry.taxa_acerto < 50 ? '#F59E0B' : entry.taxa_acerto < 70 ? '#10B981' : '#4F46E5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Total de questões analisadas: {dados.questoes.length}</p>
                    <p className="text-xs mt-1">Cores: Vermelho (&lt;30%), Laranja (30-50%), Verde (50-70%), Azul (&gt;70%)</p>
                  </div>
                </div>
              )}

              {/* Heatmap de Desempenho */}
              {dados.heatmap && dados.heatmap.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Heatmap de Desempenho (Escolas × Disciplinas)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300 dark:border-slate-600">
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-left font-bold text-gray-900 text-sm md:text-base uppercase">Escola</th>
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">LP</th>
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">CH</th>
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">MAT</th>
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">CN</th>
                          <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-base md:text-lg uppercase">Geral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.heatmap.map((item: any, index: number) => {
                          const getColor = (value: number) => {
                            if (value >= 8) return 'bg-green-500'
                            if (value >= 6) return 'bg-green-300'
                            if (value >= 4) return 'bg-yellow-300'
                            return 'bg-red-300'
                          }
                          return (
                            <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                              <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-sm md:text-base text-gray-900 dark:text-white">{item.escola}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.LP)} text-white font-bold text-sm md:text-base`}>{item.LP.toFixed(2)}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CH)} text-white font-bold text-sm md:text-base`}>{item.CH.toFixed(2)}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.MAT)} text-white font-bold text-sm md:text-base`}>{item.MAT.toFixed(2)}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CN)} text-white font-bold text-sm md:text-base`}>{item.CN.toFixed(2)}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.Geral)} text-white font-bold text-base md:text-lg`}>{item.Geral.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Radar Chart */}
              {dados.radar && dados.radar.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Perfil de Desempenho (Radar Chart)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={dados.radar.slice(0, 5)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} />
                      <Radar name="LP" dataKey="LP" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
                      <Radar name="CH" dataKey="CH" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                      <Radar name="MAT" dataKey="MAT" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                      <Radar name="CN" dataKey="CN" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Box Plot (simulado com barras) */}
              {dados.boxplot && dados.boxplot.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição Detalhada de Notas (Box Plot)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dados.boxplot}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                      <YAxis domain={[0, 10]} />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (name === 'min') return [`${value}`, 'Mínimo']
                          if (name === 'q1') return [`${value}`, 'Q1 (25%)']
                          if (name === 'mediana') return [`${value}`, 'Mediana']
                          if (name === 'q3') return [`${value}`, 'Q3 (75%)']
                          if (name === 'max') return [`${value}`, 'Máximo']
                          if (name === 'media') return [`${value}`, 'Média']
                          return [value, name]
                        }}
                      />
                      <Legend />
                      <Bar dataKey="min" name="Mínimo" fill="#EF4444" />
                      <Bar dataKey="q1" name="Q1 (25%)" fill="#F59E0B" />
                      <Bar dataKey="mediana" name="Mediana" fill="#10B981" />
                      <Bar dataKey="q3" name="Q3 (75%)" fill="#3B82F6" />
                      <Bar dataKey="max" name="Máximo" fill="#8B5CF6" />
                      <Bar dataKey="media" name="Média" fill="#EC4899" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Correlação entre Disciplinas */}
              {dados.correlacao && dados.correlacao.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Correlação entre Disciplinas</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={dados.correlacao}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5 }} />
                        <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} label={{ value: 'Matemática', angle: -90, position: 'insideLeft' }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Alunos" data={dados.correlacao} fill="#4F46E5" />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={dados.correlacao}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5 }} />
                        <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft' }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Alunos" data={dados.correlacao} fill="#10B981" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Cada ponto representa um aluno. Pontos próximos à diagonal indicam desempenho similar entre as disciplinas.</p>
                </div>
              )}

              {/* Ranking Interativo */}
              {dados.ranking && dados.ranking.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Ranking de Desempenho</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-700">
                          <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Posição</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                          {dados.ranking[0]?.escola && <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Escola</th>}
                          <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Alunos</th>
                          {dados.ranking[0]?.media_lp !== undefined && (
                            <>
                              <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">LP</th>
                              <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">MAT</th>
                              {isAnosIniciais(filtros.serie) ? (
                                <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">PROD</th>
                              ) : (
                                <>
                                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">CH</th>
                                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">CN</th>
                                </>
                              )}
                            </>
                          )}
                          <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Média Geral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.ranking.map((item: any, index: number) => (
                          <tr key={index} className={`border-b ${index < 3 ? 'bg-yellow-50' : ''}`}>
                            <td className="px-4 py-2 text-center font-bold">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : item.posicao}
                            </td>
                            <td className="px-4 py-2 font-medium">{item.nome}</td>
                            {item.escola && <td className="px-4 py-2">{item.escola}</td>}
                            <td className="px-4 py-2 text-center">{item.total_alunos}</td>
                            {item.media_lp !== undefined && (
                              <>
                                <td className="px-4 py-2 text-center">{item.media_lp?.toFixed(2) ?? 'N/A'}</td>
                                <td className="px-4 py-2 text-center">{item.media_mat?.toFixed(2) ?? 'N/A'}</td>
                                {isAnosIniciais(filtros.serie) ? (
                                  <td className="px-4 py-2 text-center">{item.media_producao?.toFixed(2) ?? 'N/A'}</td>
                                ) : (
                                  <>
                                    <td className="px-4 py-2 text-center">{item.media_ch?.toFixed(2) ?? 'N/A'}</td>
                                    <td className="px-4 py-2 text-center">{item.media_cn?.toFixed(2) ?? 'N/A'}</td>
                                  </>
                                )}
                              </>
                            )}
                            <td className="px-4 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{item.media_geral.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Taxa de Aprovação */}
              {dados.aprovacao && dados.aprovacao.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Aprovação Estimada</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dados.aprovacao}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        tick={{ fontSize: 11 }}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis domain={[0, 100]} label={{ value: 'Taxa de Aprovação (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(2)}%`, 'Taxa']}
                      />
                      <Legend />
                      <Bar dataKey="taxa_6" name="≥ 6.0" fill="#10B981" />
                      <Bar dataKey="taxa_7" name="≥ 7.0" fill="#3B82F6" />
                      <Bar dataKey="taxa_8" name="≥ 8.0" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Legenda: Verde (≥6.0), Azul (≥7.0), Roxo (≥8.0)</p>
                  </div>
                </div>
              )}

              {/* Análise de Gaps */}
              {dados.gaps && dados.gaps.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Análise de Gaps (Desigualdade de Desempenho)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dados.gaps}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        tick={{ fontSize: 11 }}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="melhor_media" name="Melhor Média" fill="#10B981" />
                      <Bar dataKey="media_geral" name="Média Geral" fill="#3B82F6" />
                      <Bar dataKey="pior_media" name="Pior Média" fill="#EF4444" />
                      <Bar dataKey="gap" name="Gap (Diferença)" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Gap = Diferença entre melhor e pior média. Valores maiores indicam maior desigualdade.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg font-medium">Selecione os filtros e clique em "Gerar Gráficos"</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">Escolha o tipo de visualização desejado para começar</p>
            </div>
          )}
        </div>
    </ProtectedRoute>
  )
}

