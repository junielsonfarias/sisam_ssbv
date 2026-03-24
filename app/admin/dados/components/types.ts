import type { DashboardData, AlunoDetalhado, ColunaTabela, PaginacaoAnalises } from '@/lib/dados/types'
import type { Disciplina } from '@/lib/disciplinas-por-serie'

// Props comuns para abas que mostram "pesquise primeiro"
export interface AbaBaseProps {
  pesquisaRealizada: boolean
}

export interface AbaVisaoGeralProps extends AbaBaseProps {
  dados: DashboardData
  filtroSerie: string
  filtroTipoEnsino: string
  filtroDisciplina: string
}

export interface AbaEscolasProps extends AbaBaseProps {
  escolasPaginadas: any[]
  escolasOrdenadas: any[]
  filtroSerie: string
  filtroTipoEnsino: string
  filtroDisciplina: string
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  handleOrdenacao: (coluna: string) => void
  paginaAtual: number
  totalPaginas: number
  setPaginaAtual: (p: number) => void
  itensPorPagina: number
}

export interface AbaTurmasProps extends AbaBaseProps {
  dados: DashboardData
  turmasPaginadas: any[]
  turmasOrdenadas: any[]
  filtroSerie: string
  filtroTipoEnsino: string
  filtroDisciplina: string
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  handleOrdenacao: (coluna: string) => void
  paginaAtual: number
  setPaginaAtual: (p: number) => void
  itensPorPagina: number
}

export interface AbaAlunosProps extends AbaBaseProps {
  alunosPaginados: AlunoDetalhado[]
  alunosOrdenados: any[]
  disciplinasExibir: Disciplina[]
  filtroSerie: string
  filtroTipoEnsino: string
  filtroDisciplina: string
  filtroAnoLetivo: string
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  handleOrdenacao: (coluna: string) => void
  paginaAtual: number
  totalPaginas: number
  setPaginaAtual: (p: number) => void
  itensPorPagina: number
  isDisciplinaAplicavel: (serie: string | null | undefined, disciplinaCodigo: string) => boolean
  getTotalQuestoesPorSerie: (resultado: any, codigoDisciplina: string) => number | undefined
  setAlunoSelecionado: (aluno: any) => void
  setModalAberto: (open: boolean) => void
}

export interface AbaAnalisesProps extends AbaBaseProps {
  dados: DashboardData
  filtroSerie: string
  filtroDisciplina: string
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  handleOrdenacao: (coluna: string) => void
  paginasAnalises: PaginacaoAnalises
  setPaginasAnalises: (fn: (prev: PaginacaoAnalises) => PaginacaoAnalises) => void
  itensPorPagina: number
}
