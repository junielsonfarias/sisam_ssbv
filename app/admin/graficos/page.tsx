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
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter, ReferenceLine, LabelList } from 'recharts'
import { isAnosIniciais, isAnosFinais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'
import { useUserType } from '@/lib/hooks/useUserType'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ChartDownloadButton, TableDownloadButton } from '@/components/charts/ChartDownloadButton'

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
        'correlacao', 'ranking', 'aprovacao', 'gaps',
        'niveis_disciplina', 'medias_etapa', 'niveis_turma'
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
                          tipoVisualizacao === 'niveis_disciplina' ? 'niveis_disciplina' :
                          tipoVisualizacao === 'medias_etapa' ? 'medias_etapa' :
                          tipoVisualizacao === 'niveis_turma' ? 'niveis_turma' :
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
            'gaps': 'Análise de Gaps',
            'niveis_disciplina': 'Níveis por Disciplina',
            'medias_etapa': 'Médias por Etapa (AI/AF)',
            'niveis_turma': 'Níveis por Turma'
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

  // Função para obter descrição dos filtros ativos
  const obterFiltrosAtivos = useCallback(() => {
    const filtrosAtivos: { label: string; valor: string }[] = []

    if (filtros.ano_letivo) {
      filtrosAtivos.push({ label: 'Ano Letivo', valor: filtros.ano_letivo })
    }

    if (filtros.polo_id) {
      const polo = polos.find(p => String(p.id) === String(filtros.polo_id))
      filtrosAtivos.push({ label: 'Polo', valor: polo?.nome || `ID: ${filtros.polo_id}` })
    }

    if (filtros.escola_id) {
      const escola = escolas.find(e => String(e.id) === String(filtros.escola_id))
      filtrosAtivos.push({ label: 'Escola', valor: escola?.nome || `ID: ${filtros.escola_id}` })
    }

    if (filtros.turma_id) {
      const turma = turmas.find(t => String(t.id) === String(filtros.turma_id))
      filtrosAtivos.push({ label: 'Turma', valor: turma?.nome || `ID: ${filtros.turma_id}` })
    }

    if (filtros.tipo_ensino) {
      filtrosAtivos.push({
        label: 'Etapa',
        valor: filtros.tipo_ensino === 'anos_iniciais' ? 'Anos Iniciais (2º, 3º, 5º)' : 'Anos Finais (6º ao 9º)'
      })
    }

    if (filtros.serie) {
      filtrosAtivos.push({ label: 'Série', valor: filtros.serie })
    }

    if (filtros.disciplina) {
      const disciplinaNomes: { [key: string]: string } = {
        'LP': 'Língua Portuguesa',
        'MAT': 'Matemática',
        'CH': 'Ciências Humanas',
        'CN': 'Ciências da Natureza',
        'PT': 'Produção Textual'
      }
      filtrosAtivos.push({ label: 'Disciplina', valor: disciplinaNomes[filtros.disciplina] || filtros.disciplina })
    }

    return filtrosAtivos
  }, [filtros, polos, escolas, turmas])

  // Componente para exibir os filtros ativos no card
  const FiltrosAtivosTag = ({ className = '' }: { className?: string }) => {
    const filtrosAtivos = obterFiltrosAtivos()

    if (filtrosAtivos.length === 0) {
      return (
        <div className={`text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded ${className}`}>
          <span className="font-medium">Filtros:</span> Todos os dados (sem filtros)
        </div>
      )
    }

    return (
      <div className={`flex flex-wrap gap-1.5 text-xs ${className}`}>
        <span className="text-gray-500 dark:text-gray-400 font-medium">Filtros:</span>
        {filtrosAtivos.map((filtro, index) => (
          <span
            key={index}
            className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full"
          >
            {filtro.label}: {filtro.valor}
          </span>
        ))}
      </div>
    )
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

  // Preparar dados de escolas com cores baseadas no desempenho e info de alunos
  const prepararDadosEscolas = (labels: string[], dados: number[], totais?: number[]) => {
    // Função para determinar cor baseada no desempenho
    const getCorDesempenho = (media: number) => {
      if (media >= 7) return '#10B981' // Verde - Bom
      if (media >= 5) return '#F59E0B' // Amarelo - Regular
      return '#EF4444' // Vermelho - Baixo
    }

    return labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0,
      alunos: totais?.[i] || 0,
      fill: getCorDesempenho(dados[i] || 0),
      // Label formatada para exibir na barra
      label: `${(dados[i] || 0).toFixed(2)}`
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
                  <option value="niveis_disciplina">Níveis por Disciplina</option>
                  <option value="medias_etapa">Médias por Etapa (AI/AF)</option>
                  <option value="niveis_turma">Níveis por Turma</option>
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
                <div id="chart-disciplinas" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-2">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
                    <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 mr-2">
                      {dados.disciplinas.totalAlunos} alunos
                    </span>
                    <ChartDownloadButton chartId="chart-disciplinas" fileName="medias-disciplinas" title="Baixar gráfico de disciplinas" />
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                      <Bar dataKey="value" name="Média" radius={[4, 4, 0, 0]}>
                        {prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value: number) => value.toFixed(2)}
                          style={{ fontSize: 13, fontWeight: 700, fill: '#374151' }}
                        />
                      </Bar>
                      {/* Linha de referência para meta (7.0) */}
                      <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right", fontSize: 14, fontWeight: 600 }} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>

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
                <div id="chart-escolas" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Escola {dados.escolas.disciplina && dados.escolas.disciplina !== 'Média Geral' ? `- ${dados.escolas.disciplina}` : ''}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {dados.escolas.totais && (
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {dados.escolas.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                        </span>
                      )}
                      <ChartDownloadButton chartId="chart-escolas" fileName="desempenho-escolas" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-3" />
                  {/* Legenda de cores */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Bom (≥7.0)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Regular (5.0-6.9)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Baixo (&lt;5.0)</span>
                    </div>
                  </div>
                  <div>
                  <ResponsiveContainer width="100%" height={Math.max(500, Math.min(900, dados.escolas.labels.length * 45))}>
                    <BarChart
                      data={prepararDadosEscolas(dados.escolas.labels, dados.escolas.dados, dados.escolas.totais)}
                      layout="vertical"
                      margin={{ left: 15, right: 80, top: 10, bottom: 10 }}
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{data.name}</p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" name="Média" radius={[0, 4, 4, 0]}>
                        {prepararDadosEscolas(dados.escolas.labels, dados.escolas.dados, dados.escolas.totais).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(value: number) => value.toFixed(2)}
                          style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Desempenho por Série */}
              {dados.series && dados.series.labels.length > 0 && (
                <div id="chart-series" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Série {dados.series.disciplina && dados.series.disciplina !== 'Média Geral' ? `- ${dados.series.disciplina}` : ''}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {dados.series.totais && (
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {dados.series.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                        </span>
                      )}
                      <ChartDownloadButton chartId="chart-series" fileName="desempenho-series" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={prepararDadosEscolas(dados.series.labels, dados.series.dados, dados.series.totais)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{data.name}</p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 8, fill: '#8B5CF6' }}>
                        <LabelList
                          dataKey="value"
                          position="top"
                          offset={15}
                          formatter={(value: number) => value.toFixed(2)}
                          style={{ fontSize: 14, fontWeight: 700, fill: '#6B21A8' }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Desempenho por Polo */}
              {dados.polos && dados.polos.labels.length > 0 && (
                <div id="chart-polos" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Desempenho por Polo {dados.polos.disciplina && dados.polos.disciplina !== 'Média Geral' ? `- ${dados.polos.disciplina}` : ''}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {dados.polos.totais && (
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {dados.polos.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                        </span>
                      )}
                      <ChartDownloadButton chartId="chart-polos" fileName="desempenho-polos" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-3" />
                  {/* Legenda de cores */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Bom (≥7.0)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Regular (5.0-6.9)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Baixo (&lt;5.0)</span>
                    </div>
                  </div>
                  <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepararDadosEscolas(dados.polos.labels, dados.polos.dados, dados.polos.totais)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 14, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{data.name}</p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" name="Média" radius={[4, 4, 0, 0]}>
                        {prepararDadosEscolas(dados.polos.labels, dados.polos.dados, dados.polos.totais).map((entry, index) => (
                          <Cell key={`cell-polo-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value: number) => value.toFixed(2)}
                          style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Distribuição de Notas */}
              {dados.distribuicao && (
                <div id="chart-distribuicao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600 dark:text-orange-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Distribuição de Notas {dados.distribuicao.disciplina && dados.distribuicao.disciplina !== 'Geral' ? `- ${dados.distribuicao.disciplina}` : ''}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.distribuicao.dados.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                      </span>
                      <ChartDownloadButton chartId="chart-distribuicao" fileName="distribuicao-notas" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 13, fontWeight: 500 }} label={{ value: 'Alunos', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const total = dados.distribuicao.dados.reduce((a: number, b: number) => a + b, 0)
                            const percentual = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Faixa: {data.name}</p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Alunos:</span> {data.value.toLocaleString()}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Percentual:</span> {percentual}%
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="value" name="Quantidade de Alunos" radius={[4, 4, 0, 0]}>
                        {prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos').map((entry, index) => {
                          // Cores baseadas na faixa de nota
                          const faixa = entry.name
                          let cor = '#F59E0B'
                          if (faixa.includes('0-2') || faixa.includes('0 a 2')) cor = '#EF4444'
                          else if (faixa.includes('2-4') || faixa.includes('2 a 4') || faixa.includes('3-4') || faixa.includes('3 a 4')) cor = '#F97316'
                          else if (faixa.includes('4-6') || faixa.includes('4 a 6') || faixa.includes('5-6') || faixa.includes('5 a 6')) cor = '#F59E0B'
                          else if (faixa.includes('6-8') || faixa.includes('6 a 8') || faixa.includes('7-8') || faixa.includes('7 a 8')) cor = '#10B981'
                          else if (faixa.includes('8-10') || faixa.includes('8 a 10') || faixa.includes('9-10') || faixa.includes('9 a 10')) cor = '#059669'
                          return <Cell key={`cell-dist-${index}`} fill={cor} />
                        })}
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value: number) => value.toLocaleString()}
                          style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Taxa de Presença */}
              {dados.presenca && (
                <div id="chart-presenca" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600 dark:text-pink-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Presença</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.presenca.dados.reduce((a: number, b: number) => a + b, 0).toLocaleString()} total
                      </span>
                      <ChartDownloadButton chartId="chart-presenca" fileName="taxa-presenca" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  {/* Legenda de cores */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Presentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">Faltantes</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                          <Pie
                            data={prepararDadosPizza(dados.presenca.labels, dados.presenca.dados)}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value, percent }) => `${(percent * 100).toFixed(1)}%`}
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((entry, index) => {
                              // Cores específicas: verde para presentes, vermelho para faltantes
                              const nomeNormalizado = entry.name.toLowerCase()
                              const isPresente = nomeNormalizado.includes('present') || nomeNormalizado === 'p'
                              const cor = isPresente ? '#22C55E' : '#EF4444' // verde-500 / vermelho-500
                              return <Cell key={`cell-presenca-${index}`} fill={cor} />
                            })}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                const total = dados.presenca.dados.reduce((a: number, b: number) => a + b, 0)
                                const percentual = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                                return (
                                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{data.name}</p>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                      <span className="font-medium">Quantidade:</span> {data.value.toLocaleString()}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                      <span className="font-medium">Percentual:</span> {percentual}%
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    {/* Cards de resumo */}
                    <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                      {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((item, index) => {
                        const total = dados.presenca.dados.reduce((a: number, b: number) => a + b, 0)
                        const percentual = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                        const nomeNormalizado = item.name.toLowerCase()
                        const isPresente = nomeNormalizado.includes('present') || nomeNormalizado === 'p'
                        return (
                          <div key={index} className={`p-4 rounded-lg ${isPresente ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            <p className={`text-sm font-medium ${isPresente ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {item.name}
                            </p>
                            <p className={`text-2xl font-bold ${isPresente ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                              {item.value.toLocaleString()}
                            </p>
                            <p className={`text-lg font-semibold ${isPresente ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {percentual}%
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Comparativo Detalhado de Escolas */}
              {dados.comparativo_escolas && (
                <div id="chart-comparativo" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600 dark:text-red-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Comparativo Detalhado{dados.comparativo_escolas.escolas.length <= 10 ? ' (Top 5 e Bottom 5)' : ''}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.comparativo_escolas.totais?.reduce((a: number, b: number) => a + b, 0).toLocaleString() || 0} alunos
                      </span>
                      <ChartDownloadButton chartId="chart-comparativo" fileName="comparativo-escolas" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-3" />
                  {/* Legenda de disciplinas */}
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4F46E5' }}></span>
                      <span className="text-gray-600 dark:text-gray-400">LP</span>
                    </div>
                    {dados.comparativo_escolas.temAnosFinais && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }}></span>
                        <span className="text-gray-600 dark:text-gray-400">CH</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B' }}></span>
                      <span className="text-gray-600 dark:text-gray-400">MAT</span>
                    </div>
                    {dados.comparativo_escolas.temAnosFinais && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EF4444' }}></span>
                        <span className="text-gray-600 dark:text-gray-400">CN</span>
                      </div>
                    )}
                    {dados.comparativo_escolas.temAnosIniciais && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8B5CF6' }}></span>
                        <span className="text-gray-600 dark:text-gray-400">PT</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#374151' }}></span>
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">Média Geral</span>
                    </div>
                  </div>
                  <div>
                  <ResponsiveContainer width="100%" height={Math.max(450, dados.comparativo_escolas.escolas.length * 45)}>
                    <BarChart data={prepararDadosComparativo()} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="escola"
                        tick={{ fontSize: 11, fontWeight: 500 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={Math.min(150, dados.comparativo_escolas.escolas.length * 10)}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 min-w-[180px]">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 border-b pb-1">{label}</p>
                                {payload.map((entry: any, index: number) => (
                                  <p key={index} className="text-sm flex justify-between" style={{ color: entry.color }}>
                                    <span className="font-medium">{entry.name}:</span>
                                    <span className="font-semibold ml-2">{Number(entry.value).toFixed(2)}</span>
                                  </p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="LP" name="LP" fill="#4F46E5" radius={[2, 2, 0, 0]} />
                      {/* CH e CN apenas para Anos Finais */}
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CH" name="CH" fill="#10B981" radius={[2, 2, 0, 0]} />
                      )}
                      <Bar dataKey="MAT" name="MAT" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                      {dados.comparativo_escolas.temAnosFinais && (
                        <Bar dataKey="CN" name="CN" fill="#EF4444" radius={[2, 2, 0, 0]} />
                      )}
                      {/* PT apenas para Anos Iniciais */}
                      {dados.comparativo_escolas.temAnosIniciais && (
                        <Bar dataKey="PT" name="PT" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                      )}
                      <Bar dataKey="Média" name="Média Geral" fill="#374151" radius={[2, 2, 0, 0]}>
                        <LabelList
                          dataKey="Média"
                          position="top"
                          formatter={(value: number) => value.toFixed(1)}
                          style={{ fontSize: 10, fontWeight: 700, fill: '#1F2937' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Acertos e Erros */}
              {dados.acertos_erros && dados.acertos_erros.length > 0 && (
                <div id="chart-acertos-erros" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Acertos e Erros {filtros.disciplina ? `- ${filtros.disciplina === 'LP' ? 'Língua Portuguesa' : filtros.disciplina === 'CH' ? 'Ciências Humanas' : filtros.disciplina === 'MAT' ? 'Matemática' : 'Ciências da Natureza'}` : '(Geral)'}
                      </h3>
                    </div>
                    <ChartDownloadButton chartId="chart-acertos-erros" fileName="acertos-erros" />
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={Math.max(400, Math.min(700, dados.acertos_erros.length * 28))}>
                    <BarChart data={dados.acertos_erros} margin={{ top: 25, right: 20, left: 10, bottom: dados.acertos_erros.length > 8 ? 80 : 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="nome"
                        tick={{ fontSize: 11, fontWeight: 500 }}
                        interval={0}
                        angle={dados.acertos_erros.length > 8 ? -35 : -20}
                        textAnchor="end"
                        height={Math.max(60, Math.min(100, dados.acertos_erros.length * 8))}
                      />
                      <YAxis
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const acertos = payload.find(p => p.dataKey === 'acertos')?.value || 0
                            const erros = payload.find(p => p.dataKey === 'erros')?.value || 0
                            const total = Number(acertos) + Number(erros)
                            const taxaAcerto = total > 0 ? ((Number(acertos) / total) * 100).toFixed(1) : '0'
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 break-words">{label}</p>
                                <p className="text-green-600 dark:text-green-400 text-sm">
                                  <span className="font-medium">Acertos:</span> {Number(acertos).toLocaleString()}
                                </p>
                                <p className="text-red-600 dark:text-red-400 text-sm">
                                  <span className="font-medium">Erros:</span> {Number(erros).toLocaleString()}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                                  <span className="font-medium">Taxa de Acerto:</span> {taxaAcerto}%
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
                      <Bar dataKey="acertos" name="Acertos" fill="#10B981" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="acertos"
                          position="top"
                          formatter={(value: number) => value.toLocaleString()}
                          style={{ fontSize: 12, fontWeight: 600, fill: '#059669' }}
                        />
                      </Bar>
                      <Bar dataKey="erros" name="Erros" fill="#EF4444" radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="erros"
                          position="top"
                          formatter={(value: number) => value.toLocaleString()}
                          style={{ fontSize: 12, fontWeight: 600, fill: '#DC2626' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                  {dados.acertos_erros[0]?.total_alunos && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <p>Total de alunos analisados: {dados.acertos_erros.reduce((acc: number, item: any) => acc + (item.total_alunos || 0), 0).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Taxa de Acerto por Questão */}
              {dados.questoes && dados.questoes.length > 0 && (
                <div id="chart-questoes" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Taxa de Acerto por Questão ({dados.questoes.length} questões)
                      </h3>
                    </div>
                    <ChartDownloadButton chartId="chart-questoes" fileName="taxa-acerto-questoes" />
                  </div>
                  <FiltrosAtivosTag className="mb-3" />
                  {/* Legenda de cores */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Crítico (&lt;30%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Atenção (30-50%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Bom (50-70%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                      <span className="text-gray-600 dark:text-gray-400">Excelente (&gt;70%)</span>
                    </div>
                  </div>
                  <div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.questoes.length * 28)}>
                    <BarChart data={dados.questoes} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Taxa de Acerto (%)', position: 'insideBottom', offset: -5, fontSize: 13, fontWeight: 600 }} />
                      <YAxis
                        type="category"
                        dataKey="codigo"
                        width={70}
                        tick={{ fontSize: 11, fontWeight: 500 }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Questão {label}</p>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  <span className="font-medium">Taxa de Acerto:</span> {data.taxa_acerto}%
                                </p>
                                {data.total_respostas && (
                                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    <span className="font-medium">Total Respostas:</span> {data.total_respostas.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" radius={[0, 4, 4, 0]}>
                        {dados.questoes.map((entry: any, index: number) => (
                          <Cell key={`cell-questao-${index}`} fill={entry.taxa_acerto < 30 ? '#EF4444' : entry.taxa_acerto < 50 ? '#F59E0B' : entry.taxa_acerto < 70 ? '#10B981' : '#4F46E5'} />
                        ))}
                        <LabelList
                          dataKey="taxa_acerto"
                          position="right"
                          formatter={(value: number) => `${value}%`}
                          style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Total de questões analisadas: {dados.questoes.length}</p>
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Heatmap de Desempenho (Escolas × Disciplinas)</h3>
                      </div>
                      <TableDownloadButton
                        data={dados.heatmap.map((item: any) => ({
                          escola: item.escola,
                          LP: item.LP?.toFixed(2) || '-',
                          ...(temAnosFinais ? { CH: item.CH?.toFixed(2) || '-' } : {}),
                          MAT: item.MAT?.toFixed(2) || '-',
                          ...(temAnosFinais ? { CN: item.CN?.toFixed(2) || '-' } : {}),
                          ...(temAnosIniciais ? { PT: item.PT?.toFixed(2) || '-' } : {}),
                          Geral: item.Geral?.toFixed(2) || '-'
                        }))}
                        fileName="heatmap-desempenho"
                        columns={[
                          { key: 'escola', label: 'Escola' },
                          { key: 'LP', label: 'LP' },
                          ...(temAnosFinais ? [{ key: 'CH', label: 'CH' }] : []),
                          { key: 'MAT', label: 'MAT' },
                          ...(temAnosFinais ? [{ key: 'CN', label: 'CN' }] : []),
                          ...(temAnosIniciais ? [{ key: 'PT', label: 'PT' }] : []),
                          { key: 'Geral', label: 'Geral' }
                        ]}
                      />
                    </div>
                    <FiltrosAtivosTag className="mb-4" />
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
                  <div id="chart-radar" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Perfil de Desempenho (Radar Chart)</h3>
                      </div>
                      <ChartDownloadButton chartId="chart-radar" fileName="perfil-desempenho-radar" />
                    </div>
                    <FiltrosAtivosTag className="mb-4" />
                    <div>
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
                  </div>
                )
              })()}

              {/* Box Plot (simulado com barras) */}
              {dados.boxplot && dados.boxplot.length > 0 && (
                <div id="chart-boxplot" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição Detalhada de Notas (Box Plot)</h3>
                    </div>
                    <ChartDownloadButton chartId="chart-boxplot" fileName="boxplot-distribuicao" />
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  {/* Tabela resumo com estatísticas */}
                  <div className="mb-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Categoria</th>
                          <th className="px-3 py-2 text-center font-semibold text-red-600">Mín</th>
                          <th className="px-3 py-2 text-center font-semibold text-amber-600">Q1</th>
                          <th className="px-3 py-2 text-center font-semibold text-green-600">Mediana</th>
                          <th className="px-3 py-2 text-center font-semibold text-blue-600">Q3</th>
                          <th className="px-3 py-2 text-center font-semibold text-purple-600">Máx</th>
                          <th className="px-3 py-2 text-center font-semibold text-pink-600">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.boxplot.map((item: any, index: number) => (
                          <tr key={index} className="border-b dark:border-slate-600">
                            <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.categoria}</td>
                            <td className="px-3 py-2 text-center text-red-600 font-semibold">{item.min?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-2 text-center text-amber-600 font-semibold">{item.q1?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-2 text-center text-green-600 font-semibold">{item.mediana?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-2 text-center text-blue-600 font-semibold">{item.q3?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-2 text-center text-purple-600 font-semibold">{item.max?.toFixed(2) || '-'}</td>
                            <td className="px-3 py-2 text-center text-pink-600 font-bold">{item.media?.toFixed(2) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.boxplot.length * 55)}>
                    <BarChart data={dados.boxplot} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="categoria"
                        tick={{ fontSize: 12, fontWeight: 500 }}
                        angle={-20}
                        textAnchor="end"
                        height={Math.min(120, dados.boxplot.length * 12)}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        label={{ value: 'Nota', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2">{label}</p>
                                {payload.map((entry: any, index: number) => (
                                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                                    <span className="font-medium">{entry.name}:</span> {Number(entry.value).toFixed(2)}
                                  </p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 10 }} />
                      <Bar dataKey="min" name="Mínimo" fill="#EF4444" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="q1" name="Q1 (25%)" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="mediana" name="Mediana" fill="#10B981" radius={[2, 2, 0, 0]}>
                        <LabelList dataKey="mediana" position="top" formatter={(value: number) => value?.toFixed(1)} style={{ fontSize: 10, fontWeight: 600, fill: '#059669' }} />
                      </Bar>
                      <Bar dataKey="q3" name="Q3 (75%)" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="max" name="Máximo" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="media" name="Média" fill="#EC4899" radius={[2, 2, 0, 0]}>
                        <LabelList dataKey="media" position="top" formatter={(value: number) => value?.toFixed(1)} style={{ fontSize: 10, fontWeight: 700, fill: '#DB2777' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Correlação entre Disciplinas - Adaptado para Anos Iniciais/Finais */}
              {dados.correlacao && dados.correlacao.length > 0 && (() => {
                const _meta = dados.correlacao_meta || { tem_anos_finais: true, tem_anos_iniciais: false }
                const dadosFinais = dados.correlacao.filter((d: any) => d.tipo === 'anos_finais')
                const dadosIniciais = dados.correlacao.filter((d: any) => d.tipo === 'anos_iniciais')

                return (
                  <div id="chart-correlacao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Correlação entre Disciplinas</h3>
                      </div>
                      <ChartDownloadButton chartId="chart-correlacao" fileName="correlacao-disciplinas" />
                    </div>
                    <FiltrosAtivosTag className="mb-4" />
                    <div>
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
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cada ponto representa um aluno. Pontos próximos à diagonal indicam desempenho similar entre as disciplinas.</p>
                  </div>
                )
              })()}

              {/* Ranking Interativo */}
              {dados.ranking && dados.ranking.length > 0 && (() => {
                // Usar metadados da API ou verificar filtro de série
                const temAnosIniciais = dados.ranking_meta?.tem_anos_iniciais ?? isAnosIniciais(filtros.serie) ?? (filtros.tipo_ensino === 'anos_iniciais')
                const temAnosFinais = dados.ranking_meta?.tem_anos_finais ?? isAnosFinais(filtros.serie) ?? (filtros.tipo_ensino === 'anos_finais')
                // Se não tem filtro específico, mostrar baseado nos dados
                const mostrarPROD = temAnosIniciais && (!temAnosFinais || filtros.tipo_ensino === 'anos_iniciais' || isAnosIniciais(filtros.serie))
                const mostrarCHCN = temAnosFinais && (!temAnosIniciais || filtros.tipo_ensino === 'anos_finais' || isAnosFinais(filtros.serie))

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Ranking de Desempenho</h3>
                      {dados.ranking[0]?.media_ai !== undefined && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {temAnosIniciais && temAnosFinais ? '(AI + AF)' : temAnosIniciais ? '(Anos Iniciais)' : '(Anos Finais)'}
                        </span>
                      )}
                      <div className="ml-auto">
                        <TableDownloadButton
                          data={dados.ranking}
                          fileName="ranking-desempenho"
                          columns={[
                            { key: 'posicao', label: 'Posição' },
                            { key: 'nome', label: 'Nome' },
                            ...(dados.ranking[0]?.escola ? [{ key: 'escola', label: 'Escola' }] : []),
                            { key: 'total_alunos', label: 'Alunos' },
                            { key: 'media_lp', label: 'LP' },
                            { key: 'media_mat', label: 'MAT' },
                            ...(mostrarPROD ? [{ key: 'media_producao', label: 'PROD' }] : []),
                            ...(mostrarCHCN ? [{ key: 'media_ch', label: 'CH' }, { key: 'media_cn', label: 'CN' }] : []),
                            ...(temAnosIniciais ? [{ key: 'media_ai', label: 'Média AI' }] : []),
                            ...(temAnosFinais ? [{ key: 'media_af', label: 'Média AF' }] : []),
                            { key: 'media_geral', label: 'Média Geral' }
                          ]}
                        />
                      </div>
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
                                <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">MAT</th>
                                {mostrarPROD && (
                                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">PROD</th>
                                )}
                                {mostrarCHCN && (
                                  <>
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CH</th>
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CN</th>
                                  </>
                                )}
                              </>
                            )}
                            {/* Médias por Etapa */}
                            {dados.ranking[0]?.media_ai !== undefined && temAnosIniciais && (
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-green-700 dark:text-green-400 text-sm sm:text-base">AI</th>
                            )}
                            {dados.ranking[0]?.media_af !== undefined && temAnosFinais && (
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-blue-700 dark:text-blue-400 text-sm sm:text-base">AF</th>
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
                                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_lp?.toFixed(2) ?? 'N/A'}</td>
                                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_mat?.toFixed(2) ?? 'N/A'}</td>
                                  {mostrarPROD && (
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_producao?.toFixed(2) ?? 'N/A'}</td>
                                  )}
                                  {mostrarCHCN && (
                                    <>
                                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_ch?.toFixed(2) ?? 'N/A'}</td>
                                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_cn?.toFixed(2) ?? 'N/A'}</td>
                                    </>
                                  )}
                                </>
                              )}
                              {/* Médias por Etapa */}
                              {item.media_ai !== undefined && temAnosIniciais && (
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-green-600 dark:text-green-400">{item.media_ai > 0 ? item.media_ai.toFixed(2) : '-'}</td>
                              )}
                              {item.media_af !== undefined && temAnosFinais && (
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-blue-600 dark:text-blue-400">{item.media_af > 0 ? item.media_af.toFixed(2) : '-'}</td>
                              )}
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400">{item.media_geral.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Taxa de Aprovação */}
              {dados.aprovacao && dados.aprovacao.length > 0 && (
                <div id="chart-aprovacao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Aprovação Estimada</h3>
                    </div>
                    <ChartDownloadButton chartId="chart-aprovacao" fileName="taxa-aprovacao" />
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
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
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Legenda: Verde (≥6.0), Azul (≥7.0), Roxo (≥8.0)</p>
                  </div>
                </div>
              )}

              {/* Análise de Gaps */}
              {dados.gaps && dados.gaps.length > 0 && (
                <div id="chart-gaps" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Análise de Gaps (Desigualdade de Desempenho)</h3>
                    </div>
                    <ChartDownloadButton chartId="chart-gaps" fileName="analise-gaps" />
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
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
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Gap = Diferença entre melhor e pior média. Valores maiores indicam maior desigualdade.</p>
                  </div>
                </div>
              )}

              {/* Níveis por Disciplina (N1, N2, N3, N4) */}
              {dados.niveis_disciplina && (
                <div id="chart-niveis-disciplina" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Níveis por Disciplina</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dados.niveis_disciplina.total_presentes} alunos
                      </span>
                      <ChartDownloadButton chartId="chart-niveis-disciplina" fileName="niveis-por-disciplina" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LP */}
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3">Língua Portuguesa</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { nivel: 'N1', quantidade: dados.niveis_disciplina.LP.N1, fill: '#EF4444' },
                          { nivel: 'N2', quantidade: dados.niveis_disciplina.LP.N2, fill: '#F59E0B' },
                          { nivel: 'N3', quantidade: dados.niveis_disciplina.LP.N3, fill: '#3B82F6' },
                          { nivel: 'N4', quantidade: dados.niveis_disciplina.LP.N4, fill: '#10B981' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="quantidade" name="Alunos">
                            {[
                              { nivel: 'N1', quantidade: dados.niveis_disciplina.LP.N1, fill: '#EF4444' },
                              { nivel: 'N2', quantidade: dados.niveis_disciplina.LP.N2, fill: '#F59E0B' },
                              { nivel: 'N3', quantidade: dados.niveis_disciplina.LP.N3, fill: '#3B82F6' },
                              { nivel: 'N4', quantidade: dados.niveis_disciplina.LP.N4, fill: '#10B981' }
                            ].map((entry, index) => (
                              <Cell key={`cell-lp-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* MAT */}
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">Matemática</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { nivel: 'N1', quantidade: dados.niveis_disciplina.MAT.N1, fill: '#EF4444' },
                          { nivel: 'N2', quantidade: dados.niveis_disciplina.MAT.N2, fill: '#F59E0B' },
                          { nivel: 'N3', quantidade: dados.niveis_disciplina.MAT.N3, fill: '#3B82F6' },
                          { nivel: 'N4', quantidade: dados.niveis_disciplina.MAT.N4, fill: '#10B981' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="quantidade" name="Alunos">
                            {[
                              { nivel: 'N1', quantidade: dados.niveis_disciplina.MAT.N1, fill: '#EF4444' },
                              { nivel: 'N2', quantidade: dados.niveis_disciplina.MAT.N2, fill: '#F59E0B' },
                              { nivel: 'N3', quantidade: dados.niveis_disciplina.MAT.N3, fill: '#3B82F6' },
                              { nivel: 'N4', quantidade: dados.niveis_disciplina.MAT.N4, fill: '#10B981' }
                            ].map((entry, index) => (
                              <Cell key={`cell-mat-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* PROD - apenas se tem anos iniciais */}
                    {dados.niveis_disciplina.tem_anos_iniciais && (
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-3">Produção Textual (Anos Iniciais)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={[
                            { nivel: 'N1', quantidade: dados.niveis_disciplina.PROD.N1, fill: '#EF4444' },
                            { nivel: 'N2', quantidade: dados.niveis_disciplina.PROD.N2, fill: '#F59E0B' },
                            { nivel: 'N3', quantidade: dados.niveis_disciplina.PROD.N3, fill: '#3B82F6' },
                            { nivel: 'N4', quantidade: dados.niveis_disciplina.PROD.N4, fill: '#10B981' }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nivel" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="quantidade" name="Alunos">
                              {[
                                { nivel: 'N1', quantidade: dados.niveis_disciplina.PROD.N1, fill: '#EF4444' },
                                { nivel: 'N2', quantidade: dados.niveis_disciplina.PROD.N2, fill: '#F59E0B' },
                                { nivel: 'N3', quantidade: dados.niveis_disciplina.PROD.N3, fill: '#3B82F6' },
                                { nivel: 'N4', quantidade: dados.niveis_disciplina.PROD.N4, fill: '#10B981' }
                              ].map((entry, index) => (
                                <Cell key={`cell-prod-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {/* GERAL */}
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">Nível Geral do Aluno</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { nivel: 'N1', quantidade: dados.niveis_disciplina.GERAL.N1, fill: '#EF4444' },
                          { nivel: 'N2', quantidade: dados.niveis_disciplina.GERAL.N2, fill: '#F59E0B' },
                          { nivel: 'N3', quantidade: dados.niveis_disciplina.GERAL.N3, fill: '#3B82F6' },
                          { nivel: 'N4', quantidade: dados.niveis_disciplina.GERAL.N4, fill: '#10B981' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="quantidade" name="Alunos">
                            {[
                              { nivel: 'N1', quantidade: dados.niveis_disciplina.GERAL.N1, fill: '#EF4444' },
                              { nivel: 'N2', quantidade: dados.niveis_disciplina.GERAL.N2, fill: '#F59E0B' },
                              { nivel: 'N3', quantidade: dados.niveis_disciplina.GERAL.N3, fill: '#3B82F6' },
                              { nivel: 'N4', quantidade: dados.niveis_disciplina.GERAL.N4, fill: '#10B981' }
                            ].map((entry, index) => (
                              <Cell key={`cell-geral-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span> N1 (Insuficiente)</span>
                      <span className="flex items-center"><span className="w-3 h-3 bg-amber-500 rounded mr-1"></span> N2 (Básico)</span>
                      <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded mr-1"></span> N3 (Adequado)</span>
                      <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span> N4 (Avançado)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Médias por Etapa (Anos Iniciais vs Anos Finais) */}
              {dados.medias_etapa && dados.medias_etapa.length > 0 && (
                <div id="chart-medias-etapa" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Comparativo: Anos Iniciais vs Anos Finais</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {dados.medias_etapa_totais && (
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          AI: {dados.medias_etapa_totais.total_ai} | AF: {dados.medias_etapa_totais.total_af}
                        </span>
                      )}
                      <ChartDownloadButton chartId="chart-medias-etapa" fileName="comparativo-anos-iniciais-finais" />
                    </div>
                  </div>
                  <FiltrosAtivosTag className="mb-4" />
                  <div>
                  <ResponsiveContainer width="100%" height={Math.max(400, dados.medias_etapa.length * 50)}>
                    <BarChart data={dados.medias_etapa} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="escola"
                        width={Math.min(250, Math.max(150, dados.medias_etapa.reduce((max: number, item: any) => Math.max(max, (item.escola?.length || 0) * 7), 150)))}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => [value ? value.toFixed(2) : '-', name]}
                        contentStyle={{ fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                      <Bar dataKey="media_ai" name="Anos Iniciais (AI)" fill="#10B981" />
                      <Bar dataKey="media_af" name="Anos Finais (AF)" fill="#3B82F6" />
                      <Bar dataKey="media_geral" name="Média Geral" fill="#6B7280" />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Anos Iniciais (2º, 3º, 5º)</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {dados.medias_etapa_totais?.total_ai || 0} alunos
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Anos Finais (6º ao 9º)</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {dados.medias_etapa_totais?.total_af || 0} alunos
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Geral</p>
                      <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                        {dados.medias_etapa_totais?.total_alunos || 0} alunos
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Níveis por Turma */}
              {dados.niveis_turma && dados.niveis_turma.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Níveis por Turma</h3>
                    <div className="ml-auto">
                      <TableDownloadButton
                        data={dados.niveis_turma.map((item: any) => ({
                          turma: item.turma,
                          escola: item.escola,
                          serie: item.serie || (item.anos_iniciais ? 'AI' : 'AF'),
                          n1: item.niveis.N1,
                          n2: item.niveis.N2,
                          n3: item.niveis.N3,
                          n4: item.niveis.N4,
                          media_turma: item.media_turma?.toFixed(2) || '-',
                          nivel_predominante: item.nivel_predominante
                        }))}
                        fileName="niveis-por-turma"
                        columns={[
                          { key: 'turma', label: 'Turma' },
                          { key: 'escola', label: 'Escola' },
                          { key: 'serie', label: 'Série' },
                          { key: 'n1', label: 'N1' },
                          { key: 'n2', label: 'N2' },
                          { key: 'n3', label: 'N3' },
                          { key: 'n4', label: 'N4' },
                          { key: 'media_turma', label: 'Média' },
                          { key: 'nivel_predominante', label: 'Nível Predominante' }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                          <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-white text-sm">Turma</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-white text-sm">Escola</th>
                          <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Série</th>
                          <th className="px-3 py-2 text-center font-bold text-red-600 dark:text-red-400 text-sm">N1</th>
                          <th className="px-3 py-2 text-center font-bold text-amber-600 dark:text-amber-400 text-sm">N2</th>
                          <th className="px-3 py-2 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">N3</th>
                          <th className="px-3 py-2 text-center font-bold text-green-600 dark:text-green-400 text-sm">N4</th>
                          <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Média</th>
                          <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Nível</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.niveis_turma.map((item: any, index: number) => {
                          const nivelCor = item.nivel_predominante === 'N4' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' :
                                          item.nivel_predominante === 'N3' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' :
                                          item.nivel_predominante === 'N2' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' :
                                          'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                          return (
                            <tr key={index} className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                              <td className="px-3 py-2 font-semibold text-sm text-gray-900 dark:text-white">{item.turma}</td>
                              <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.escola}</td>
                              <td className="px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.anos_iniciais ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                  {item.serie || (item.anos_iniciais ? 'AI' : 'AF')}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center text-sm font-medium text-red-600 dark:text-red-400">{item.niveis.N1}</td>
                              <td className="px-3 py-2 text-center text-sm font-medium text-amber-600 dark:text-amber-400">{item.niveis.N2}</td>
                              <td className="px-3 py-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400">{item.niveis.N3}</td>
                              <td className="px-3 py-2 text-center text-sm font-medium text-green-600 dark:text-green-400">{item.niveis.N4}</td>
                              <td className="px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-white">{item.media_turma?.toFixed(2) || '-'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${nivelCor}`}>
                                  {item.nivel_predominante}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>Nível predominante = nível com maior quantidade de alunos na turma</p>
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

