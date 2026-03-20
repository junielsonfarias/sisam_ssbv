import {
  CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, RotateCcw
} from 'lucide-react'

export type Aba = 'pessoal' | 'escolar' | 'notas' | 'frequencia' | 'historico' | 'sisam' | 'evolucao' | 'facial'

export const SITUACAO_CORES: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  cursando: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Cursando', icon: CheckCircle },
  aprovado: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: 'Aprovado', icon: CheckCircle },
  reprovado: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: 'Reprovado', icon: XCircle },
  transferido: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: 'Transferido', icon: ArrowLeftRight },
  abandono: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Abandono', icon: AlertTriangle },
  remanejado: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Remanejado', icon: RotateCcw },
}

export const PARECER_CORES: Record<string, { bg: string; text: string; label: string }> = {
  aprovado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprovado' },
  reprovado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reprovado' },
  recuperacao: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Recuperação' },
  progressao_parcial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Progressão Parcial' },
  sem_parecer: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Sem Parecer' },
}
