import {
  CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, RotateCcw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Aba = 'pessoal' | 'escolar' | 'notas' | 'frequencia' | 'historico' | 'sisam' | 'evolucao' | 'facial'

/** Dados do aluno retornados pela API /api/admin/alunos/[id] */
export interface AlunoDetalhe {
  id: string
  codigo: string
  nome: string
  email?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  genero?: string | null
  raca_cor?: string | null
  pcd?: boolean
  tipo_deficiencia?: string | null
  endereco?: string | null
  bairro?: string | null
  municipio?: string | null
  uf?: string | null
  cep?: string | null
  telefone?: string | null
  responsavel?: string | null
  telefone_responsavel?: string | null
  parentesco_responsavel?: string | null
  escola_id?: string | null
  escola_nome?: string | null
  polo_nome?: string | null
  turma_id?: string | null
  turma_codigo?: string | null
  turma_nome?: string | null
  turma_serie?: string | null
  serie?: string | null
  situacao?: string | null
  ano_letivo?: string | null
  ativo?: boolean
  foto_url?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/** Formulário editável do aluno */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AlunoForm = Record<string, any>

/** Dados complementares carregados para o perfil do aluno (estrutura dinâmica da API) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DadosAluno = Record<string, any>

/** Props comuns para abas que recebem aluno + form + editando */
export interface AbaEditavelProps {
  aluno: AlunoDetalhe
  form: AlunoForm
  editando: boolean
  updateForm: (campo: string, valor: string | number | boolean | null) => void
}

/** Props para abas somente leitura */
export interface AbaSomenteLeituraProps {
  aluno: AlunoDetalhe
  dados: DadosAluno
}

/** Configuração de cor de situação */
export interface SituacaoCor {
  bg: string
  text: string
  label: string
  icon: LucideIcon
}

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
