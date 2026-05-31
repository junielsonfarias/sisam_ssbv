export interface Escola { id: string; nome: string }

export interface Titulo {
  id: string
  isbn: string | null
  codigo_pnld: string | null
  titulo: string
  autor: string | null
  editora: string | null
  edicao: string | null
  ano_pnld: number
  componente_id: string | null
  ano_escolar: number | null
  tipo_obra: string
}

export interface EstoqueLinha {
  id: string
  titulo_id: string
  titulo: string
  codigo_pnld: string | null
  ano_escolar: number | null
  qtd_total: number
  qtd_disponivel: number
  qtd_danificada: number
  qtd_extraviada: number
}

export interface AlunoBusca {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
  escola_nome?: string | null
}

export interface Distribuicao {
  id: string
  titulo: string
  autor: string | null
  componente_id: string | null
  ano_letivo: string
  numero_tombamento: string | null
  status: string
  data_entrega: string
  data_devolucao_prevista: string | null
  data_devolucao_real: string | null
  observacoes_devolucao: string | null
}

export type StatusDevolucao = 'devolvido' | 'extraviado' | 'danificado'
export type AbaPnld = 'titulos' | 'estoque' | 'distribuicoes'

export interface FormTitulo {
  isbn: string
  codigo_pnld: string
  titulo: string
  autor: string
  editora: string
  edicao: string
  ano_pnld: string
  componente_id: string
  ano_escolar: string
  tipo_obra: string
  observacoes: string
}

export interface FormEstoque {
  escola_id: string
  titulo_id: string
  ano_letivo: string
  qtd_total: string
  qtd_disponivel: string
  qtd_danificada: string
  qtd_extraviada: string
}

export interface FormEntrega {
  aluno_id: string
  titulo_id: string
  ano_letivo: string
  numero_tombamento: string
  data_devolucao_prevista: string
}

export const TIPOS_OBRA = [
  { v: 'livro_aluno', label: 'Livro do aluno' },
  { v: 'manual_professor', label: 'Manual do professor' },
  { v: 'caderno_atividades', label: 'Caderno de atividades' },
  { v: 'literatura', label: 'Literatura' },
  { v: 'dicionario', label: 'Dicionário' },
  { v: 'paradidatico', label: 'Paradidático' },
  { v: 'outro', label: 'Outro' },
] as const

export const STATUS_DIST_BADGE: Record<string, string> = {
  emprestado: 'bg-blue-100 text-blue-700',
  devolvido: 'bg-green-100 text-green-700',
  danificado: 'bg-amber-100 text-amber-700',
  extraviado: 'bg-red-100 text-red-700',
}

export const TITULO_VAZIO: FormTitulo = {
  isbn: '',
  codigo_pnld: '',
  titulo: '',
  autor: '',
  editora: '',
  edicao: '',
  ano_pnld: String(new Date().getFullYear()),
  componente_id: '',
  ano_escolar: '',
  tipo_obra: 'livro_aluno',
  observacoes: '',
}

export const ESTOQUE_VAZIO: FormEstoque = {
  escola_id: '',
  titulo_id: '',
  ano_letivo: String(new Date().getFullYear()),
  qtd_total: '',
  qtd_disponivel: '',
  qtd_danificada: '',
  qtd_extraviada: '',
}

export const ENTREGA_VAZIA: FormEntrega = {
  aluno_id: '',
  titulo_id: '',
  ano_letivo: String(new Date().getFullYear()),
  numero_tombamento: '',
  data_devolucao_prevista: '',
}

export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500 outline-none'
