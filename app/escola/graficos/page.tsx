'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Filter, BarChart3, XCircle } from 'lucide-react'
import {
  GraficoDisciplinas, GraficoSeries, GraficoDistribuicao, GraficoPresenca,
} from '@/components/graficos'
import { isAnosIniciais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'

interface FiltrosGraficos {
  ano_letivo?: string
  serie?: string
  turma_id?: string
  disciplina?: string
}

export default function GraficosEscolaPage() {
  const [filtros, setFiltros] = useState<FiltrosGraficos>({})
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
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
    const controller = new AbortController()
    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar', { signal: controller.signal })
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          // Carregar nome da escola e polo
          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal: controller.signal })
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('[EscolaGraficos] Erro ao carregar dados iniciais:', (error as Error).message)
      }
    }
    carregarDadosIniciais()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    carregarTurmas(controller.signal)
    return () => controller.abort()
  }, [filtros.serie, escolaId, filtros.ano_letivo])

  const carregarTurmas = async (signal?: AbortSignal) => {
    if (!escolaId || !filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('escolas_ids', escolaId)
      params.append('serie', filtros.serie)

      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`, { signal })
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setTurmas([])
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
      
      // Se mudou a série, limpar turma selecionada
      if (campo === 'serie' && !valor) {
        delete novo.turma_id
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
      // Forçar atualização do cache para sempre buscar dados frescos
      params.append('atualizar_cache', 'true')
      if (escolaId) {
        params.append('escola_id', escolaId)
      }
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
      setErro(error.message || 'Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Análise Gráfica</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {escolaNome && `${escolaNome}`}
              {poloNome && <span className="text-gray-500 dark:text-gray-400"> - Polo: {poloNome}</span>}
            </p>
          </div>

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
                  <option value="series">Por Série</option>
                  <option value="distribuicao">Distribuição de Notas</option>
                  <option value="presenca">Presença/Falta</option>
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

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Escola
                </label>
                <input
                  type="text"
                  value={escolaNome || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

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
                  Turma
                </label>
                <select
                  value={filtros.turma_id || ''}
                  onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                  disabled={!filtros.serie || turmas.length === 0}
                >
                  <option value="">Todas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
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
              <GraficoDisciplinas disciplinas={dados.disciplinas} />
              <GraficoSeries series={dados.series} />
              <GraficoDistribuicao distribuicao={dados.distribuicao} />
              <GraficoPresenca presenca={dados.presenca} />
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg font-medium">Selecione os filtros e clique em "Gerar Gráficos"</p>
            </div>
          )}
        </div>
    </ProtectedRoute>
  )
}

