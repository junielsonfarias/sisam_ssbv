/**
 * Hooks customizados do SISAM
 * @module lib/hooks
 */

// Hooks de dados e fetch
export { useBuscaDados } from './useBuscaDados'
export type { UseBuscaDadosOptions, UseBuscaDadosResult } from './useBuscaDados'

// Hooks de filtros
export { useFiltrosDados } from './useFiltrosDados'
export type { FiltrosDadosState, UseFiltrosDadosOptions } from './useFiltrosDados'

// Hooks de debounce
export { useDebounce, useDebouncedCallback, useDebounceWithLoading } from './useDebounce'

// Hooks de paginacao
export { usePaginacao } from './usePaginacao'

// Hooks de modal
export { useModal } from './useModal'

// Hooks de tipo de usuario
export { useUserType } from './useUserType'
