// Constantes e tipos compartilhados pela gestão de publicações.
// Extraídos de page.tsx sem mudança de lógica.

export interface Publicacao {
  id: string
  tipo: string
  numero: string | null
  titulo: string
  descricao: string | null
  orgao: string
  data_publicacao: string
  ano_referencia: string | null
  url_arquivo: string | null
  ativo: boolean
  criado_em: string
}

export const TIPOS_DOCUMENTO = ['Portaria', 'Resolução', 'Decreto', 'Calendário Escolar', 'Ata', 'Parecer', 'Ofício', 'Edital', 'Comunicado']
export const ORGAOS = ['SEMED', 'CACSFUNDEB', 'CAE', 'CME', 'Prefeitura Municipal']

export const BADGE_COLORS: Record<string, string> = {
  'Portaria': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'Resolução': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'Decreto': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  'Calendário Escolar': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'Ata': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'Parecer': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  'Ofício': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'Edital': 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  'Comunicado': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}
