'use client'

import ProtectedRoute from '@/components/protected-route'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Filter, BarChart3, TrendingUp, PieChart, Users, BookOpen, School, XCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load dos componentes Recharts para reduzir bundle inicial
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false })
const RechartsPie = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false })
const RadarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.RadarChart })), { ssr: false })
const ScatterChart = dynamic(() => import('recharts').then(mod => ({ default: mod.ScatterChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

// Componentes auxiliares importados diretamente (pequenos)
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter, ReferenceLine } from 'recharts'
import { isAnosIniciais, isAnosFinais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'
import { useUserType } from '@/lib/hooks/useUserType'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
  tipo_ensino?: string
}

export default function GraficosPage() {
  const { tipoUsuario } = useUserType()
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')
  const [erro, setErro] = useState<string>('')
  const [carregandoSeries, setCarregandoSeries] = useState(false)

  // Filtrar séries com base na Etapa de Ensino selecionada
  const seriesFiltradas = useMemo(() => {
    if (!filtros.tipo_ensino) return series

    return series.filter(s => {
      if (filtros.tipo_ensino === 'anos_iniciais') {
        return isAnosIniciais(s)
      } else if (filtros.tipo_ensino === 'anos_finais') {
        return isAnosFinais(s)
      }
      return true
    })
  }, [series, filtros.tipo_ensino])

  // Determinar disciplinas disponíveis com base na Etapa de Ensino ou Série selecionada
  const disciplinasDisponiveis = useMemo(() => {
    // Se há série selecionada, usar ela para determinar
    if (filtros.serie) {
      if (isAnosIniciais(filtros.serie)) {
        return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
      } else if (isAnosFinais(filtros.serie)) {
        return DISCIPLINAS_OPTIONS_ANOS_FINAIS
      }
    }

    // Se há etapa de ensino selecionada, usar ela
    if (filtros.tipo_ensino === 'anos_iniciais') {
      return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
    } else if (filtros.tipo_ensino === 'anos_finais') {
      return DISCIPLINAS_OPTIONS_ANOS_FINAIS
    }

    // Se não há filtro, mostrar todas
    return DISCIPLINAS_OPTIONS_ANOS_FINAIS
  }, [filtros.tipo_ensino, filtros.serie])

  // Carregar séries do banco de dados
  const carregarSeries = useCallback(async () => {
    setCarregandoSeries(true)
    try {
      const params = new URLSearchParams()
      params.append('tipo', 'geral')
      if (filtros.ano_letivo) params.append('ano_letivo', filtros.ano_letivo)

      const response = await fetch(`/api/admin/graficos?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.series_disponiveis && Array.isArray(data.series_disponiveis)) {
          setSeries(data.series_disponiveis)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
    } finally {
      setCarregandoSeries(false)
    }
  }, [filtros.ano_letivo])

  useEffect(() => {
    if (tipoUsuario) {
      carregarDadosIniciais()
      carregarSeries()
    }
  }, [tipoUsuario])

  // Limpar disciplina quando mudar para Anos Iniciais e disciplina não for válida
  useEffect(() => {
    if (filtros.disciplina) {
      const disciplinaValida = disciplinasDisponiveis.some(d => d.value === filtros.disciplina)
      if (!disciplinaValida) {
        setFiltros(prev => ({ ...prev, disciplina: undefined }))
      }
    }
  }, [disciplinasDisponiveis, filtros.disciplina])

  // Limpar série quando mudar etapa de ensino e série não for válida
  useEffect(() => {
    if (filtros.serie && filtros.tipo_ensino) {
      const serieValida = seriesFiltradas.includes(filtros.serie)
      if (!serieValida) {
        setFiltros(prev => ({ ...prev, serie: undefined }))
      }
    }
  }, [seriesFiltradas, filtros.serie, filtros.tipo_ensino])

  // Limpar escola e turma quando mudar polo
  useEffect(() => {
    if (filtros.polo_id) {
      // Verificar se a escola selecionada pertence ao polo
      const escolaDoPolo = escolas.find(e => e.id === filtros.escola_id && e.polo_id === filtros.polo_id)
      if (filtros.escola_id && !escolaDoPolo) {
        setFiltros(prev => ({ ...prev, escola_id: undefined, turma_id: undefined }))
      }
    }
  }, [filtros.polo_id, filtros.escola_id, escolas])

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
        console.log('[DEBUG] Carregando turmas com params:', params.toString())
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
            console.log('[DEBUG] Turmas recebidas:', data)
          }
          if (Array.isArray(data)) {
            setTurmas(data)
            // Se não houver turmas e houver turma_id selecionada, limpar
            if (data.length === 0 && filtros.turma_id) {
              setFiltros(prev => ({ ...prev, turma_id: undefined }))
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error('Resposta de turmas não é um array:', data)
            }
            setTurmas([])
            setFiltros(prev => ({ ...prev, turma_id: undefined }))
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Erro ao carregar turmas:', error)
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
        console.error('Erro ao carregar dados iniciais:', error)
      }
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosGraficos, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev, [campo]: valor || undefined }
      // Limpar escola e turma quando mudar polo
      if (campo === 'polo_id') {
        novo.escola_id = undefined
        novo.turma_id = undefined
      }
      // Limpar turma quando mudar escola
      if (campo === 'escola_id') {
        novo.turma_id = undefined
      }
      // Limpar série quando mudar etapa de ensino
      if (campo === 'tipo_ensino') {
        novo.serie = undefined
      }
      return novo
    })
  }

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltros({})
    setDados(null)
    setErro('')
  }

  // Contar filtros ativos
  const qtdFiltrosAtivos = Object.values(filtros).filter(v => v !== undefined && v !== '').length

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
          console.error('Erro ao buscar gráficos:', response.status, errorData)
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
        // Construir mensagem detalhada sobre os filtros aplicados
        const filtrosAtivos: string[] = []
        if (filtros.ano_letivo) filtrosAtivos.push(`Ano: ${filtros.ano_letivo}`)
        if (filtros.tipo_ensino) filtrosAtivos.push(`Etapa: ${filtros.tipo_ensino === 'anos_iniciais' ? 'Anos Iniciais' : 'Anos Finais'}`)
        if (filtros.serie) filtrosAtivos.push(`Série: ${filtros.serie}`)
        if (filtros.disciplina) filtrosAtivos.push(`Disciplina: ${filtros.disciplina}`)
        if (filtros.polo_id) filtrosAtivos.push('Polo selecionado')
        if (filtros.escola_id) filtrosAtivos.push('Escola selecionada')

        const msgFiltros = filtrosAtivos.length > 0
          ? ` Filtros aplicados: ${filtrosAtivos.join(', ')}.`
          : ''
        setErro(`Nenhum dado encontrado para os filtros selecionados.${msgFiltros}`)
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
          // Mensagem específica por tipo de visualização
          const tipoNome = {
            'acertos_erros': 'Acertos e Erros',
            'questoes': 'Taxa de Acerto por Questão',
            'heatmap': 'Heatmap de Desempenho',
            'radar': 'Perfil de Desempenho',
            'boxplot': 'Distribuição Detalhada',
            'correlacao': 'Correlação entre Disciplinas',
            'ranking': 'Ranking Interativo',
            'aprovacao': 'Taxa de Aprovação',
            'gaps': 'Análise de Gaps'
          }[tipoVisualizacao] || tipoVisualizacao

          // Verificar se filtro de disciplina é incompatível com etapa
          let dicaAdicional = ''
          if (filtros.disciplina && (filtros.disciplina === 'CH' || filtros.disciplina === 'CN')) {
            if (filtros.tipo_ensino === 'anos_iniciais' || (filtros.serie && isAnosIniciais(filtros.serie))) {
              dicaAdicional = ' Dica: Anos Iniciais não possuem as disciplinas Ciências Humanas e Ciências da Natureza.'
            }
          }

          setErro(`Nenhum dado encontrado para "${tipoNome}" com os filtros selecionados.${dicaAdicional}`)
          setDados(null)
          return
        }
      }
      
      setDados(data)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar gráficos:', error)
      }
      setErro(error.message || 'Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  const prepararDadosBarras = (labels: string[], dados: number[], _label?: string) => {
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
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>

        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Análise Gráfica</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Visualize comparativos e estatísticas através de gráficos</p>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
                {qtdFiltrosAtivos > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                    {qtdFiltrosAtivos} ativo{qtdFiltrosAtivos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {qtdFiltrosAtivos > 0 && (
                <button
                  onClick={limparFiltros}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <div className="p-2 rounded-lg transition-all bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                  Tipo de Visualização
                  <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
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

              <div className={`p-2 rounded-lg transition-all ${filtros.ano_letivo ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                  Ano Letivo
                  {filtros.ano_letivo && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
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
                <div className={`p-2 rounded-lg transition-all ${filtros.polo_id ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                    Polo
                    {filtros.polo_id && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
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
                <div className={`p-2 rounded-lg transition-all ${filtros.escola_id ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''} ${!filtros.polo_id && tipoUsuario !== 'polo' ? 'opacity-50' : ''}`}>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                    Escola
                    {filtros.escola_id && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
                    {!filtros.polo_id && tipoUsuario !== 'polo' && <span className="ml-1 text-xs text-gray-400">(selecione um polo)</span>}
                  </label>
                  <select
                    value={filtros.escola_id || ''}
                    onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                    className="select-custom w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!filtros.polo_id && tipoUsuario !== 'polo'}
                  >
                    <option value="">{!filtros.polo_id && tipoUsuario !== 'polo' ? 'Selecione um polo primeiro' : 'Todas'}</option>
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

              <div className={`p-2 rounded-lg transition-all ${filtros.tipo_ensino ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                  Etapa de Ensino
                  {filtros.tipo_ensino && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
                </label>
                <select
                  value={filtros.tipo_ensino || ''}
                  onChange={(e) => handleFiltroChange('tipo_ensino', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todas</option>
                  <option value="anos_iniciais">Anos Iniciais (2º, 3º, 5º)</option>
                  <option value="anos_finais">Anos Finais (6º, 7º, 8º, 9º)</option>
                </select>
              </div>

              <div className={`p-2 rounded-lg transition-all ${filtros.serie ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''} ${filtros.tipo_ensino ? 'opacity-50' : ''}`}>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                  Série
                  {filtros.serie && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
                  {filtros.tipo_ensino && <span className="ml-1 text-xs text-gray-400">(filtrado por etapa)</span>}
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!filtros.tipo_ensino}
                >
                  <option value="">{filtros.tipo_ensino ? 'Filtrado pela etapa' : 'Todas'}</option>
                  {seriesFiltradas.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {carregandoSeries && (
                    <option value="" disabled>Carregando...</option>
                  )}
                </select>
              </div>

              <div className={`p-2 rounded-lg transition-all ${filtros.disciplina ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                  Disciplina
                  {filtros.disciplina && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
                  {(filtros.tipo_ensino === 'anos_iniciais' || (filtros.serie && isAnosIniciais(filtros.serie))) && (
                    <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(Anos Iniciais)</span>
                  )}
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
                <div className={`p-2 rounded-lg transition-all ${filtros.turma_id ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                    Turma
                    {filtros.turma_id && <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {erro}
            </div>
          )}

          {/* Gráficos */}
          {carregando ? (
            <LoadingSpinner text="Gerando gráficos..." centered />
          ) : dados ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Médias por Disciplina */}
              {dados.disciplinas && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
                    <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {dados.disciplinas.totalAlunos} alunos
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 14, fontWeight: 500 }}
                        labelStyle={{ fontSize: 14, fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Média">
                        {prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                      {/* Linha de referência para meta (7.0) */}
                      <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right", fontSize: 14, fontWeight: 600 }} />
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
                            <p className="text-lg font-bold text-gray-900">{media.toFixed(2)}</p>
                            <p className="text-xs text-gray-600">Desvio: {desvio.toFixed(2)}</p>
                            <p className="text-xs text-gray-600">Aprovação: {taxaAprov.toFixed(1)}%</p>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Escola {dados.escolas.disciplina && dados.escolas.disciplina !== 'Média Geral' ? `- ${dados.escolas.disciplina}` : ''}
                      </h3>
                    </div>
                    {dados.escolas.totais && (
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.escolas.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                      </span>
                    )}
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Série {dados.series.disciplina && dados.series.disciplina !== 'Média Geral' ? `- ${dados.series.disciplina}` : ''}
                      </h3>
                    </div>
                    {dados.series.totais && (
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.series.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={prepararDadosBarras(dados.series.labels, dados.series.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 14, fontWeight: 500 }}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 14, fontWeight: 500 }}
                        labelStyle={{ fontSize: 14, fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Desempenho por Polo */}
              {dados.polos && dados.polos.labels.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Polo {dados.polos.disciplina && dados.polos.disciplina !== 'Média Geral' ? `- ${dados.polos.disciplina}` : ''}
                      </h3>
                    </div>
                    {dados.polos.totais && (
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.polos.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepararDadosBarras(dados.polos.labels, dados.polos.dados, 'Média')}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 14, fontWeight: 500 }}
                        labelStyle={{ fontSize: 14, fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Média" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Distribuição de Notas */}
              {dados.distribuicao && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Distribuição de Notas {dados.distribuicao.disciplina && dados.distribuicao.disciplina !== 'Geral' ? `- ${dados.distribuicao.disciplina}` : ''}
                    </h3>
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600 dark:text-pink-400" />
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
                        {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((_, index) => (
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600 dark:text-red-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Comparativo Detalhado{dados.comparativo_escolas.escolas.length <= 10 ? ' (Top 5 e Bottom 5)' : ''}
                    </h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.comparativo_escolas.escolas.length * 40)}>
                    <BarChart data={prepararDadosComparativo()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="escola"
                        tick={{ fontSize: 12, fontWeight: 500 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={Math.min(150, dados.comparativo_escolas.escolas.length * 8)}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                        labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="LP" name="LP" fill="#4F46E5" />
                      {/* CH e CN apenas para Anos Finais */}
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CH" name="CH" fill="#10B981" />
                      )}
                      <Bar dataKey="MAT" name="MAT" fill="#F59E0B" />
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CN" name="CN" fill="#EF4444" />
                      )}
                      {/* PT apenas para Anos Iniciais */}
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Acertos e Erros {filtros.disciplina ? `- ${filtros.disciplina === 'LP' ? 'Língua Portuguesa' : filtros.disciplina === 'CH' ? 'Ciências Humanas' : filtros.disciplina === 'MAT' ? 'Matemática' : 'Ciências da Natureza'}` : '(Geral)'}
                    </h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.acertos_erros.length * 35)}>
                    <BarChart data={dados.acertos_erros}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="nome" 
                        tick={{ fontSize: 12, fontWeight: 500 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={Math.min(120, dados.acertos_erros.length * 10)}
                      />
                      <YAxis 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                        labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="acertos" name="Acertos" fill="#10B981" />
                      <Bar dataKey="erros" name="Erros" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                  {dados.acertos_erros[0]?.total_alunos && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <p>Total de alunos analisados: {dados.acertos_erros.reduce((acc: number, item: any) => acc + (item.total_alunos || 0), 0)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Taxa de Acerto por Questão */}
              {dados.questoes && dados.questoes.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
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

              {/* Heatmap de Desempenho - Adaptado para Anos Iniciais/Finais */}
              {dados.heatmap && dados.heatmap.length > 0 && (() => {
                // Verificar se há dados de anos iniciais ou finais
                const temAnosIniciais = dados.heatmap.some((item: any) => item.anos_iniciais)
                const temAnosFinais = dados.heatmap.some((item: any) => !item.anos_iniciais)

                const getColor = (value: number | null) => {
                  if (value === null) return 'bg-gray-200 dark:bg-gray-600'
                  if (value >= 8) return 'bg-green-500'
                  if (value >= 6) return 'bg-green-300 dark:bg-green-600'
                  if (value >= 4) return 'bg-yellow-300 dark:bg-yellow-600'
                  return 'bg-red-300 dark:bg-red-600'
                }

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Heatmap de Desempenho (Escolas × Disciplinas)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-left font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">Escola</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">LP</th>
                            {temAnosFinais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">CH</th>}
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">MAT</th>
                            {temAnosFinais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">CN</th>}
                            {temAnosIniciais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">PT</th>}
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-base md:text-lg uppercase">Geral</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.heatmap.map((item: any, index: number) => (
                            <tr key={index} className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                              <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-sm md:text-base text-gray-900 dark:text-white">{item.escola}</td>
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.LP)} text-white font-bold text-sm md:text-base`}>
                                {item.LP?.toFixed(2) || '-'}
                              </td>
                              {temAnosFinais && (
                                <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CH)} text-white font-bold text-sm md:text-base`}>
                                  {item.CH !== null ? item.CH.toFixed(2) : '-'}
                                </td>
                              )}
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.MAT)} text-white font-bold text-sm md:text-base`}>
                                {item.MAT?.toFixed(2) || '-'}
                              </td>
                              {temAnosFinais && (
                                <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CN)} text-white font-bold text-sm md:text-base`}>
                                  {item.CN !== null ? item.CN.toFixed(2) : '-'}
                                </td>
                              )}
                              {temAnosIniciais && (
                                <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.PT)} text-white font-bold text-sm md:text-base`}>
                                  {item.PT !== null ? item.PT.toFixed(2) : '-'}
                                </td>
                              )}
                              <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.Geral)} text-white font-bold text-base md:text-lg`}>
                                {item.Geral?.toFixed(2) || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Radar Chart - Adaptado para Anos Iniciais/Finais */}
              {dados.radar && dados.radar.length > 0 && (() => {
                const temAnosIniciais = dados.radar.some((item: any) => item.anos_iniciais)
                const temAnosFinais = dados.radar.some((item: any) => !item.anos_iniciais)

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Perfil de Desempenho (Radar Chart)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(400, dados.radar.length * 80)}>
                      <RadarChart data={dados.radar}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="nome" tick={{ fontSize: 13, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 13, fontWeight: 500 }} />
                        <Radar name="LP" dataKey="LP" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} strokeWidth={2} />
                        {temAnosFinais && <Radar name="CH" dataKey="CH" stroke="#10B981" fill="#10B981" fillOpacity={0.6} strokeWidth={2} />}
                        <Radar name="MAT" dataKey="MAT" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} strokeWidth={2} />
                        {temAnosFinais && <Radar name="CN" dataKey="CN" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} strokeWidth={2} />}
                        {temAnosIniciais && <Radar name="PT" dataKey="PT" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} strokeWidth={2} />}
                        <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                          labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}

              {/* Box Plot (simulado com barras) */}
              {dados.boxplot && dados.boxplot.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição Detalhada de Notas (Box Plot)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.boxplot.length * 50)}>
                    <BarChart data={dados.boxplot}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        tick={{ fontSize: 13, fontWeight: 500 }} 
                        angle={-15} 
                        textAnchor="end" 
                        height={Math.min(120, dados.boxplot.length * 10)} 
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Nota', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
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
                        contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                        labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
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

              {/* Correlação entre Disciplinas - Adaptado para Anos Iniciais/Finais */}
              {dados.correlacao && dados.correlacao.length > 0 && (() => {
                const _meta = dados.correlacao_meta || { tem_anos_finais: true, tem_anos_iniciais: false }
                const dadosFinais = dados.correlacao.filter((d: any) => d.tipo === 'anos_finais')
                const dadosIniciais = dados.correlacao.filter((d: any) => d.tipo === 'anos_iniciais')

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Correlação entre Disciplinas</h3>
                    </div>

                    {/* Anos Iniciais: LP x MAT (e LP x PT se houver) */}
                    {dadosIniciais.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Anos Iniciais (2º, 3º, 5º ano)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* LP x MAT */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosIniciais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosIniciais} fill="#4F46E5" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* LP x PT (se houver PT) */}
                          {dadosIniciais.some((d: any) => d.PT !== null) && (
                            <ResponsiveContainer width="100%" height={300}>
                              <ScatterChart data={dadosIniciais.filter((d: any) => d.PT !== null)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                                <YAxis type="number" dataKey="PT" name="PT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Produção Textual', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                                <Scatter name="Alunos" data={dadosIniciais.filter((d: any) => d.PT !== null)} fill="#8B5CF6" opacity={0.6} />
                              </ScatterChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Anos Finais: LP x CH x MAT x CN */}
                    {dadosFinais.length > 0 && (
                      <div>
                        {dadosIniciais.length > 0 && <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Anos Finais (6º ao 9º ano)</h4>}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* LP x MAT */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#4F46E5" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* LP x CH */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#10B981" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* LP x CN */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#F59E0B" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* CH x MAT */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#EF4444" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* CH x CN */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#8B5CF6" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* MAT x CN */}
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={dadosFinais}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                              <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                              <Scatter name="Alunos" data={dadosFinais} fill="#EC4899" opacity={0.6} />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cada ponto representa um aluno. Pontos próximos à diagonal indicam desempenho similar entre as disciplinas.</p>
                  </div>
                )
              })()}

              {/* Ranking Interativo */}
              {dados.ranking && dados.ranking.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Ranking de Desempenho</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">Posição</th>
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-gray-900 dark:text-white text-sm sm:text-base">Nome</th>
                          {dados.ranking[0]?.escola && <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-gray-900 dark:text-white text-sm sm:text-base">Escola</th>}
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">Alunos</th>
                          {dados.ranking[0]?.media_lp !== undefined && (
                            <>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">LP</th>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CH</th>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">MAT</th>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CN</th>
                            </>
                          )}
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-base sm:text-lg">Média Geral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.ranking.map((item: any, index: number) => (
                          <tr key={index} className={`border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg dark:text-white">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : item.posicao}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{item.nome}</td>
                            {item.escola && <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.escola}</td>}
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.total_alunos}</td>
                            {item.media_lp !== undefined && (
                              <>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_lp.toFixed(2)}</td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_ch.toFixed(2)}</td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_mat.toFixed(2)}</td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_cn.toFixed(2)}</td>
                              </>
                            )}
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400">{item.media_geral.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Taxa de Aprovação */}
              {dados.aprovacao && dados.aprovacao.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Aprovação Estimada</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.aprovacao.length * 50)}>
                    <BarChart data={dados.aprovacao}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        angle={-15}
                        textAnchor="end"
                        height={Math.min(120, dados.aprovacao.length * 10)}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Taxa de Aprovação (%)', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(2)}%`, 'Taxa']}
                        contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                        labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Análise de Gaps (Desigualdade de Desempenho)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.gaps.length * 50)}>
                    <BarChart data={dados.gaps}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        angle={-15}
                        textAnchor="end"
                        height={Math.min(120, dados.gaps.length * 10)}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Nota', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                        labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
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
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">Selecione os filtros e clique em "Gerar Gráficos"</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-2">Escolha o tipo de visualização desejado para começar</p>
            </div>
          )}
        </div>

    </ProtectedRoute>
  )
}

