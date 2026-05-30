import {
  Sun, Cloud, Moon, Sunrise, Calendar,
  type LucideIcon,
} from 'lucide-react'

export type StatusLancamento = 'em_dia' | 'pendente' | 'sem_lancamento' | 'sem_letivos'

export interface StatusSemanal {
  dias_letivos: number
  dias_lancados: number
  status: StatusLancamento
}

export interface Turma {
  vinculo_id: string
  tipo_vinculo: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_id: string
  escola_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abreviacao: string | null
  etapa: string | null
  total_alunos: number
  status_semanal?: StatusSemanal | null
}

export interface AnoDisponivel {
  ano: string
  status: string | null
}

export interface PeriodoLetivo {
  id: string
  nome: string
  tipo: string
  numero: number
  data_inicio: string | null
  data_fim: string | null
  ativo: boolean
}

export interface FiltrosState {
  busca: string
  escolas: string[]
  turnos: string[]
  serie: string
  tipoVinculo: 'todos' | 'polivalente' | 'disciplina'
}

export const FILTROS_DEFAULT: FiltrosState = {
  busca: '',
  escolas: [],
  turnos: [],
  serie: '',
  tipoVinculo: 'todos',
}

export const STORAGE_KEY_FILTROS = 'professor-turmas-filtros'

// Cores semanticas por turno — borda lateral do card identifica em milisegundos
interface CorTurno {
  borda: string
  icone: LucideIcon
  label: string
}

const CORES_TURNO: Record<string, CorTurno> = {
  manha:    { borda: 'border-l-amber-400 dark:border-l-amber-500',   icone: Sunrise, label: 'Manhã' },
  tarde:    { borda: 'border-l-orange-500 dark:border-l-orange-500', icone: Sun,     label: 'Tarde' },
  noite:    { borda: 'border-l-indigo-500 dark:border-l-indigo-400', icone: Moon,    label: 'Noite' },
  integral: { borda: 'border-l-violet-500 dark:border-l-violet-400', icone: Cloud,   label: 'Integral' },
}

export function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function corDoTurno(turno: string): CorTurno {
  const k = normalizarTexto(turno).split(' ')[0]
  return CORES_TURNO[k] ?? { borda: 'border-l-gray-300 dark:border-l-gray-600', icone: Calendar, label: turno }
}

// Agrupa series por etapa para o select. Ordem: infantil -> iniciais -> finais -> EJA.
export const ORDEM_ETAPA = ['Educação Infantil', 'Anos Iniciais', 'Anos Finais', 'EJA', 'Outras']

export function etapaDaSerie(serie: string, etapaDb: string | null): string {
  if (etapaDb) return etapaDb
  const num = parseInt(serie.replace(/[^\d]/g, ''), 10)
  if (!isNaN(num)) {
    if (num >= 1 && num <= 5) return 'Anos Iniciais'
    if (num >= 6 && num <= 9) return 'Anos Finais'
  }
  if (/creche|mater|jardim|infantil/i.test(serie)) return 'Educação Infantil'
  if (/eja|fase/i.test(serie)) return 'EJA'
  return 'Outras'
}
