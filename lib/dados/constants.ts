/**
 * Constantes para o Painel de Dados
 * @module lib/dados/constants
 */

export const COLORS = {
  primary: '#4F46E5',
  niveis: {
    'Insuficiente': '#EF4444',
    'Básico': '#F59E0B',
    'Basico': '#F59E0B',
    'Adequado': '#3B82F6',
    'Avançado': '#10B981',
    'Avancado': '#10B981',
    'Não classificado': '#9CA3AF',
    'Nao classificado': '#9CA3AF',
    'N1': '#EF4444',
    'N2': '#F59E0B',
    'N3': '#3B82F6',
    'N4': '#10B981'
  } as Record<string, string>,
  disciplinas: {
    lp: '#3B82F6',
    mat: '#8B5CF6',
    ch: '#10B981',
    cn: '#F59E0B',
    prod: '#EC4899'
  },
  faixas: ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E'],
  ranking: ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777']
}

export const NIVEL_NAMES: Record<string, string> = {
  'N1': 'Insuficiente',
  'N2': 'Básico',
  'N3': 'Adequado',
  'N4': 'Avançado',
  'Insuficiente': 'Insuficiente',
  'Básico': 'Básico',
  'Basico': 'Básico',
  'Adequado': 'Adequado',
  'Avançado': 'Avançado',
  'Avancado': 'Avançado',
  'Não classificado': 'Não classificado',
  'Nao classificado': 'Não classificado'
}

export const TOOLTIPS_COLUNAS: Record<string, string> = {
  // Disciplinas
  media_lp: 'Língua Portuguesa - Média das notas de LP',
  media_mat: 'Matemática - Média das notas de MAT',
  media_prod: 'Produção Textual - Média das notas de PROD (Anos Iniciais)',
  media_ch: 'Ciências Humanas - Média das notas de CH (Anos Finais)',
  media_cn: 'Ciências da Natureza - Média das notas de CN (Anos Finais)',
  // Médias
  media_geral: 'Média Geral - Média ponderada de todas as disciplinas',
  media_ai: 'Média Anos Iniciais - Média dos alunos do 2º, 3º e 5º ano',
  media_af: 'Média Anos Finais - Média dos alunos do 6º ao 9º ano',
  media_aluno: 'Média do Aluno - Média geral calculada para o aluno',
  // Notas individuais
  nota_lp: 'Nota de Língua Portuguesa',
  nota_mat: 'Nota de Matemática',
  nota_producao: 'Nota de Produção Textual (Anos Iniciais)',
  nota_ch: 'Nota de Ciências Humanas (Anos Finais)',
  nota_cn: 'Nota de Ciências da Natureza (Anos Finais)',
  // Outros campos
  total_alunos: 'Total de alunos com presença P ou F',
  presentes: 'Quantidade de alunos presentes (P)',
  faltantes: 'Quantidade de alunos faltantes (F)',
  nivel_turma: 'Nível de aprendizagem da turma: N1 (Insuficiente), N2 (Básico), N3 (Adequado), N4 (Avançado)',
  nivel_aprendizagem: 'Nível de aprendizagem: N1 (<3), N2 (3-5), N3 (5-7.5), N4 (≥7.5)',
  taxa_acerto: 'Taxa de acerto em porcentagem',
  taxa_erro: 'Taxa de erro em porcentagem',
  total_acertos: 'Total de questões acertadas',
  total_erros: 'Total de questões erradas',
  total_respostas: 'Total de respostas registradas',
  serie: 'Série/Ano escolar',
  turma: 'Código da turma',
  escola: 'Nome da escola',
  polo: 'Polo educacional',
  presenca: 'Status de presença: P (Presente) ou F (Faltante)',
  nome: 'Nome do aluno',
}

export const PAGINACAO_ANALISES_INICIAL = {
  questoesErros: 1,
  escolasErros: 1,
  turmasErros: 1,
  questoesAcertos: 1,
  escolasAcertos: 1,
  turmasAcertos: 1
}

export const FILTROS_STORAGE_KEY = 'sisam_painel_dados_filtros'

export const CORES_METRIC_CARD: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', iconBg: 'bg-green-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconBg: 'bg-red-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconBg: 'bg-purple-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200', iconBg: 'bg-amber-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', iconBg: 'bg-rose-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
}

export const CORES_DISCIPLINA_CARD: Record<string, { bg: string; bar: string; text: string; border: string; ring: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', bar: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', ring: 'ring-purple-500' },
  green: { bg: 'bg-green-50 dark:bg-green-900/30', bar: 'bg-green-500', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', ring: 'ring-green-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', ring: 'ring-rose-500' },
}

export const CORES_NIVEL_BADGE: Record<string, string> = {
  'N1': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  'N2': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
  'N3': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  'N4': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
}

export const CORES_NIVEL_TABELA: Record<string, string> = {
  'Insuficiente': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300',
  'Básico': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300',
  'Adequado': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300',
  'Avançado': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300',
  'Não classificado': 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600',
  'N1': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300',
  'N2': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300',
  'N3': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300',
  'N4': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300',
}
