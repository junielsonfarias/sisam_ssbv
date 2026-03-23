'use client'

import ProtectedRoute from '@/components/protected-route'
import { BarChart3, XCircle } from 'lucide-react'
import { useGraficosData } from './components/useGraficosData'
import GraficosFilters from './components/GraficosFilters'
import {
  DisciplinasChart,
  EscolasChart,
  SeriesChart,
  PolosChart,
  DistribuicaoChart,
  PresencaChart,
} from './components/ChartsBasicos'
import {
  ComparativoChart,
  AcertosErrosChart,
  QuestoesChart,
  HeatmapChart,
  RadarChartSection,
  BoxplotChart,
  CorrelacaoChart,
  RankingChart,
  AprovacaoChart,
  GapsChart,
} from './components/ChartsAvancados'

export default function GraficosTecnicoPage() {
  const {
    tipoUsuario,
    filtros,
    polos,
    escolas,
    turmas,
    series,
    dados,
    carregando,
    tipoVisualizacao,
    erro,
    disciplinasDisponiveis,
    setTipoVisualizacao,
    handleFiltroChange,
    handleBuscarGraficos,
    prepararDadosComparativo,
  } = useGraficosData()

  const chartProps = { dados, filtros, prepararDadosComparativo }

  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Análise Gráfica</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Visualize comparativos e estatísticas através de gráficos</p>
          </div>

          {/* Filtros */}
          <GraficosFilters
            tipoUsuario={tipoUsuario}
            tipoVisualizacao={tipoVisualizacao}
            setTipoVisualizacao={setTipoVisualizacao}
            filtros={filtros}
            handleFiltroChange={handleFiltroChange}
            polos={polos}
            escolas={escolas}
            turmas={turmas}
            series={series}
            disciplinasDisponiveis={disciplinasDisponiveis}
            carregando={carregando}
            dados={dados}
            handleBuscarGraficos={handleBuscarGraficos}
          />

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
              <DisciplinasChart dados={dados} />
              <EscolasChart dados={dados} />
              <SeriesChart dados={dados} />
              <PolosChart dados={dados} />
              <DistribuicaoChart dados={dados} />
              <PresencaChart dados={dados} />
              <ComparativoChart {...chartProps} />
              <AcertosErrosChart {...chartProps} />
              <QuestoesChart {...chartProps} />
              <HeatmapChart {...chartProps} />
              <RadarChartSection {...chartProps} />
              <BoxplotChart {...chartProps} />
              <CorrelacaoChart {...chartProps} />
              <RankingChart {...chartProps} />
              <AprovacaoChart {...chartProps} />
              <GapsChart {...chartProps} />
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
