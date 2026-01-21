/**
 * Componentes do Painel de Dados
 * @module components/dados
 */

// Componentes de metricas e cards
export { default as MetricCard } from './MetricCard'
export { default as DisciplinaCard } from './DisciplinaCard'
export { default as NivelBadge } from './NivelBadge'
export { default as CelulaNotaComNivel } from './CelulaNotaComNivel'
export { default as CardEstatistica } from './CardEstatistica'

// Componentes de tabela
export { default as TabelaPaginada } from './TabelaPaginada'
export { default as PaginationControls } from './PaginationControls'
export { default as TabelaCarregando } from './TabelaCarregando'

// Componentes de filtros e navegacao
export { default as FiltroSelect } from './FiltroSelect'
export { default as AbaNavegacao } from './AbaNavegacao'
export type { AbaConfig } from './AbaNavegacao'
export { default as SeriesChips } from './SeriesChips'
export { default as BarraBuscaPesquisar } from './BarraBuscaPesquisar'

// Componentes de status e feedback
export { default as StatusIndicators } from './StatusIndicators'
export { default as LoadingSpinner } from './LoadingSpinner'
export { default as EmptyState, TableEmptyState } from './EmptyState'
export { default as EstadoBuscaInicial } from './EstadoBuscaInicial'

// Componentes de graficos
export { default as CustomTooltip } from './CustomTooltip'
