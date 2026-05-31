export interface Escola { id: string; nome: string }

export interface ItemAcervo {
  id: string
  isbn: string | null
  titulo: string
  autor: string | null
  editora: string | null
  ano_publicacao: number | null
  categoria: string | null
  escola_id: string | null
  qtd_total: number
  qtd_disponivel: number
  estante: string | null
  prateleira: string | null
}

export interface Emprestimo {
  id: string
  acervo_id: string
  titulo: string
  aluno_nome: string | null
  servidor_nome: string | null
  data_emprestimo: string
  data_prevista_devolucao: string
  renovacoes: number
  status: string
  dias_atraso?: number | null
}

export interface AlunoBusca {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
  escola_nome?: string | null
}

export interface ServidorBusca {
  id: string
  nome: string
  matricula_funcional?: string | null
  cargo?: string | null
}

export type Pessoa = AlunoBusca | ServidorBusca
export type TipoTomador = 'aluno' | 'servidor'
export type Aba = 'acervo' | 'emprestimos'

export interface FormNovoItem {
  isbn: string; titulo: string; autor: string; editora: string; edicao: string
  ano_publicacao: string; classificacao: string; categoria: string; genero: string
  escola_id: string; qtd_total: string; estante: string; prateleira: string; observacoes: string
}

export interface FormEmprestimo {
  acervo_id: string
  aluno_id: string
  servidor_id: string
  dias_emprestimo: string
}

export const CATEGORIAS_BIBLIOTECA = [
  { v: 'literatura_infantil', label: 'Literatura infantil' },
  { v: 'literatura_juvenil', label: 'Literatura juvenil' },
  { v: 'literatura_adulta', label: 'Literatura adulta' },
  { v: 'didatico', label: 'Didático' },
  { v: 'paradidatico', label: 'Paradidático' },
  { v: 'tecnico', label: 'Técnico' },
  { v: 'referencia', label: 'Referência' },
  { v: 'dicionario', label: 'Dicionário' },
  { v: 'enciclopedia', label: 'Enciclopédia' },
  { v: 'periodico', label: 'Periódico' },
  { v: 'outro', label: 'Outro' },
] as const

export const ITEM_VAZIO: FormNovoItem = {
  isbn: '', titulo: '', autor: '', editora: '', edicao: '',
  ano_publicacao: '', classificacao: '', categoria: '', genero: '',
  escola_id: '', qtd_total: '1', estante: '', prateleira: '', observacoes: '',
}

export const EMPRESTIMO_VAZIO: FormEmprestimo = {
  acervo_id: '', aluno_id: '', servidor_id: '', dias_emprestimo: '7',
}

/** Classe utilitária de input — extraída para reuso entre componentes. */
export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rose-500 outline-none'
