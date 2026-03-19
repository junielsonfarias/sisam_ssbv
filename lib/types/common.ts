/**
 * Tipos comuns reutilizados em múltiplas páginas do SISAM.
 * Importar daqui em vez de redefinir em cada página.
 */

export interface EscolaSimples {
  id: string
  nome: string
  codigo?: string | null
  polo_id?: string | null
  polo_nome?: string | null
}

export interface TurmaSimples {
  id: string
  codigo: string
  nome: string | null
  serie: string
  ano_letivo: string
  escola_id?: string
  total_alunos?: number
  capacidade_maxima?: number
}

export interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
  ordem?: number
}

export interface Periodo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio?: string | null
  data_fim?: string | null
}

export interface AlunoSimples {
  id: string
  nome: string
  codigo: string | null
  serie?: string | null
  situacao?: string | null
  pcd?: boolean
  turma_id?: string | null
  escola_id?: string | null
}

export interface PoloSimples {
  id: string
  nome: string
  codigo?: string | null
}

export interface SerieEscolarSimples {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
}

/** Cores e labels para situação do aluno */
export const SITUACAO_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  cursando: { label: 'Cursando', cor: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  aprovado: { label: 'Aprovado', cor: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  reprovado: { label: 'Reprovado', cor: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' },
  transferido: { label: 'Transferido', cor: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  abandono: { label: 'Abandono', cor: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800' },
  remanejado: { label: 'Remanejado', cor: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  em_recuperacao: { label: 'Em Recuperação', cor: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' },
}

/** Cores e labels para etapas de ensino */
export const ETAPA_CONFIG: Record<string, { label: string; cor: string }> = {
  educacao_infantil: { label: 'Educação Infantil', cor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300' },
  fundamental_anos_iniciais: { label: 'Fund. Anos Iniciais', cor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300' },
  fundamental_anos_finais: { label: 'Fund. Anos Finais', cor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300' },
  eja: { label: 'EJA', cor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300' },
}

/** Formatar tipo_periodo para exibição */
export function formatTipoPeriodo(tipo: string): string {
  const map: Record<string, string> = {
    bimestre: 'Bimestre', bimestral: 'Bimestral',
    trimestre: 'Trimestre', trimestral: 'Trimestral',
    semestre: 'Semestre', semestral: 'Semestral',
    anual: 'Anual',
  }
  return map[tipo] || tipo
}
