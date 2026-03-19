'use client'

import ProtectedRoute from '@/components/protected-route'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { BarChart3, XCircle } from 'lucide-react'
import { isAnosIniciais, isAnosFinais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'
import { useUserType } from '@/lib/hooks/useUserType'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FiltrosGraficos as FiltrosGraficosType, COLORS, DISCIPLINA_COLORS_FULL } from './components/types'

import FiltrosGraficosComponent from './components/FiltrosGraficos'
import GraficoGeral from './components/GraficoGeral'
import GraficoAcertosErros from './components/GraficoAcertosErros'
import GraficoAnalises from './components/GraficoAnalises'
import GraficoRanking from './components/GraficoRanking'
import GraficoNiveis from './components/GraficoNiveis'

export default function GraficosPage() {
  const { tipoUsuario } = useUserType()
  const [filtros, setFiltros] = useState<FiltrosGraficosType>({})
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<string>('geral')
  const [erro, setErro] = useState<string>('')
  const [carregandoSeries, setCarregandoSeries] = useState(false)

  // Filtrar series com base na Etapa de Ensino selecionada
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

  // Determinar disciplinas disponiveis com base na Etapa de Ensino ou Serie selecionada
  const disciplinasDisponiveis = useMemo(() => {
    if (filtros.serie) {
      if (isAnosIniciais(filtros.serie)) {
        return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
      } else if (isAnosFinais(filtros.serie)) {
        return DISCIPLINAS_OPTIONS_ANOS_FINAIS
      }
    }

    if (filtros.tipo_ensino === 'anos_iniciais') {
      return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
    } else if (filtros.tipo_ensino === 'anos_finais') {
      return DISCIPLINAS_OPTIONS_ANOS_FINAIS
    }

    return DISCIPLINAS_OPTIONS_ANOS_FINAIS
  }, [filtros.tipo_ensino, filtros.serie])

  // Carregar series do banco de dados
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

  // Limpar disciplina quando mudar para Anos Iniciais e disciplina nao for valida
  useEffect(() => {
    if (filtros.disciplina) {
      const disciplinaValida = disciplinasDisponiveis.some(d => d.value === filtros.disciplina)
      if (!disciplinaValida) {
        setFiltros(prev => ({ ...prev, disciplina: undefined }))
      }
    }
  }, [disciplinasDisponiveis, filtros.disciplina])

  // Limpar serie quando mudar etapa de ensino e serie nao for valida
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
      const escolaDoPolo = escolas.find(e => e.id === filtros.escola_id && e.polo_id === filtros.polo_id)
      if (filtros.escola_id && !escolaDoPolo) {
        setFiltros(prev => ({ ...prev, escola_id: undefined, turma_id: undefined }))
      }
    }
  }, [filtros.polo_id, filtros.escola_id, escolas])

  // Carregar turmas quando escola for selecionada
  useEffect(() => {
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
      setTurmas([])
      setFiltros(prev => ({ ...prev, turma_id: undefined }))
    }
  }, [filtros.escola_id, filtros.ano_letivo, filtros.serie])

  const carregarDadosIniciais = async () => {
    try {
      if (tipoUsuario === 'polo') {
        const escolasRes = await fetch('/api/polo/escolas')
        const escolasData = await escolasRes.json()
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
        setPolos([])
      } else if (tipoUsuario === 'escola') {
        setPolos([])
        setEscolas([])
      } else {
        const [polosRes, escolasRes] = await Promise.all([
          fetch('/api/admin/polos'),
          fetch('/api/admin/escolas'),
        ])

        const polosData = await polosRes.json()
        const escolasData = await escolasRes.json()

        setPolos(Array.isArray(polosData) ? polosData : [])
        setEscolas(Array.isArray(escolasData) ? escolasData : [])
      }

      setSeries([])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosGraficosType, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev, [campo]: valor || undefined }
      if (campo === 'polo_id') {
        novo.escola_id = undefined
        novo.turma_id = undefined
      }
      if (campo === 'escola_id') {
        novo.turma_id = undefined
      }
      if (campo === 'tipo_ensino') {
        novo.serie = undefined
      }
      return novo
    })
  }

  const limparFiltros = () => {
    setFiltros({})
    setDados(null)
    setErro('')
  }

  const qtdFiltrosAtivos = Object.values(filtros).filter(v => v !== undefined && v !== '').length

  const handleBuscarGraficos = async () => {
    setCarregando(true)
    setDados(null)
    setErro('')
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipoVisualizacao)
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

      if (data.series_disponiveis && Array.isArray(data.series_disponiveis)) {
        setSeries(data.series_disponiveis)
      }

      if (!data || Object.keys(data).length === 0) {
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

  // Funcao para obter descricao dos filtros ativos
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

  // Preparar dados de disciplinas ordenados por media (maior para menor) com cores
  const prepararDadosDisciplinas = (labels: string[], dados: number[]) => {
    const combined = labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0,
      fill: DISCIPLINA_COLORS_FULL[l] || COLORS[i % COLORS.length]
    }))
    return combined.sort((a, b) => b.value - a.value)
  }

  // Preparar dados de escolas com cores baseadas no desempenho e info de alunos
  const prepararDadosEscolas = (labels: string[], dados: number[], totais?: number[]) => {
    const getCorDesempenho = (media: number) => {
      if (media >= 7) return '#10B981'
      if (media >= 5) return '#F59E0B'
      return '#EF4444'
    }

    return labels.map((l, i) => ({
      name: l,
      value: dados[i] || 0,
      alunos: totais?.[i] || 0,
      fill: getCorDesempenho(dados[i] || 0),
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
          <FiltrosGraficosComponent
            filtros={filtros}
            tipoVisualizacao={tipoVisualizacao}
            setTipoVisualizacao={setTipoVisualizacao}
            handleFiltroChange={handleFiltroChange}
            limparFiltros={limparFiltros}
            qtdFiltrosAtivos={qtdFiltrosAtivos}
            polos={polos}
            escolas={escolas}
            turmas={turmas}
            seriesFiltradas={seriesFiltradas}
            disciplinasDisponiveis={disciplinasDisponiveis}
            carregandoSeries={carregandoSeries}
            tipoUsuario={tipoUsuario}
            carregando={carregando}
            dados={dados}
            handleBuscarGraficos={handleBuscarGraficos}
          />

          {/* Mensagem de Erro */}
          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {erro}
            </div>
          )}

          {/* Graficos */}
          {carregando ? (
            <LoadingSpinner text="Gerando gráficos..." centered />
          ) : dados ? (
            <div className="space-y-4 sm:space-y-6">
              <GraficoGeral
                dados={dados}
                FiltrosAtivosTag={FiltrosAtivosTag}
                prepararDadosDisciplinas={prepararDadosDisciplinas}
                prepararDadosEscolas={prepararDadosEscolas}
                prepararDadosBarras={prepararDadosBarras}
                prepararDadosPizza={prepararDadosPizza}
                prepararDadosComparativo={prepararDadosComparativo}
              />

              <GraficoAcertosErros
                dados={dados}
                filtros={filtros}
                FiltrosAtivosTag={FiltrosAtivosTag}
              />

              <GraficoAnalises
                dados={dados}
                FiltrosAtivosTag={FiltrosAtivosTag}
              />

              <GraficoRanking
                dados={dados}
                filtros={filtros}
                FiltrosAtivosTag={FiltrosAtivosTag}
              />

              <GraficoNiveis
                dados={dados}
                FiltrosAtivosTag={FiltrosAtivosTag}
              />
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
