'use client'

import { memo, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Loading placeholder para graficos
const ChartLoadingPlaceholder = () => (
  <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Carregando grafico...</p>
    </div>
  </div>
)

// Lazy load dos componentes Recharts
const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer),
  { ssr: false, loading: ChartLoadingPlaceholder }
)

const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false }
)

const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { ssr: false }
)

const LazyPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { ssr: false }
)

const LazyRadarChart = dynamic(
  () => import('recharts').then(mod => mod.RadarChart),
  { ssr: false }
)

const LazyScatterChart = dynamic(
  () => import('recharts').then(mod => mod.ScatterChart),
  { ssr: false }
)

// Re-exportar componentes auxiliares (estes sao pequenos e podem ser carregados junto)
export {
  LazyResponsiveContainer as ResponsiveContainer,
  LazyBarChart as BarChart,
  LazyLineChart as LineChart,
  LazyPieChart as PieChart,
  LazyRadarChart as RadarChart,
  LazyScatterChart as ScatterChart,
  ChartLoadingPlaceholder
}

// Exportar outros componentes que nao precisam de lazy loading mas devem vir do mesmo lugar
export {
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter,
  ReferenceLine
} from 'recharts'

// Wrapper memoizado para graficos - evita re-renders desnecessarios
interface ChartWrapperProps {
  children: React.ReactElement
  height?: number | string
  width?: string
  className?: string
}

export const ChartWrapper = memo(function ChartWrapper({
  children,
  height = 350,
  width = '100%',
  className = ''
}: ChartWrapperProps) {
  return (
    <Suspense fallback={<ChartLoadingPlaceholder />}>
      <div className={`w-full ${className}`} style={{ height }}>
        <LazyResponsiveContainer width={width} height="100%">
          {children}
        </LazyResponsiveContainer>
      </div>
    </Suspense>
  )
})
