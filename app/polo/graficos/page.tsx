'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Filter, BarChart3, XCircle } from 'lucide-react'
import {
  GraficoDisciplinas, GraficoEscolas, GraficoSeries, GraficoDistribuicao, GraficoPresenca,
} from '@/components/graficos'
import { isAnosIniciais, DISCIPLINAS_OPTIONS_ANOS_INICIAIS, DISCIPLINAS_OPTIONS_ANOS_FINAIS } from '@/lib/disciplinas-mapping'

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

  // Determinar disciplinas disponíveis com base na Série selecionada
  const disciplinasDisponiveis = useMemo(() => {
    if (filtros.serie && isAnosIniciais(filtros.serie)) {
      return DISCIPLINAS_OPTIONS_ANOS_INICIAIS
    }
    return DISCIPLINAS_OPTIONS_ANOS_FINAIS
  }, [filtros.serie])

  // Limpar disciplina se não for válida para a série selecionada
  useEffect(() => {
    if (filtros.disciplina && filtros.serie) {
      const disciplinaValida = disciplinasDisponiveis.some(d => d.value === filtros.disciplina)
      if (!disciplinaValida) {
        setFiltros(prev => ({ ...prev, disciplina: undefined }))
      }
    }
  }, [disciplinasDisponiveis, filtros.disciplina, filtros.serie])

  useEffect(() => {
    const controller = new AbortController()
    carregarDadosIniciais(controller.signal)
    return () => controller.abort()
  }, [])

  const carregarDadosIniciais = async (signal?: AbortSignal) => {
    try {
      // Verificar usuario e polo_id
      const authRes = await fetch('/api/auth/verificar', { signal })
      const authData = await authRes.json()

      if (authData.usuario && authData.usuario.polo_id) {
        setPoloId(authData.usuario.polo_id)

        // Carregar nome do polo
        const poloRes = await fetch(`/api/admin/polos?id=${authData.usuario.polo_id}`, { signal })
        const poloData = await poloRes.json()
        if (Array.isArray(poloData) && poloData.length > 0) {
          setPoloNome(poloData[0].nome)
        }
      }

      // Carregar escolas do polo
      const escolasRes = await fetch('/api/polo/escolas', { signal })
      const escolasData = await escolasRes.json()
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('[PoloGraficos] Erro ao carregar dados iniciais:', (error as Error).message)
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
      // Forçar atualização do cache para sempre buscar dados frescos
      params.append('atualizar_cache', 'true')
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
    <ProtectedRoute tiposPermitidos={['polo']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Análise Gráfica</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {poloNome && <span>Polo: {poloNome}</span>}
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
                  <option value="escolas">Por Escola</option>
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
                  Polo
                </label>
                <input
                  type="text"
                  value={poloNome || 'Carregando...'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

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
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
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
                  Disciplina
                  {filtros.serie && isAnosIniciais(filtros.serie) && (
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
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
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
              <GraficoEscolas escolas={dados.escolas} />
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
