export interface PoloSimples { id: string; nome: string }
export interface EscolaSimples { id: string; nome: string; polo_id?: string }

export interface TurmaVaga {
  id: string; codigo: string; serie: string; ano_letivo: string
  capacidade_maxima: number; alunos_matriculados: number
  vagas_disponiveis: number; fila_espera: number
  percentual_ocupacao: number; escola_nome: string; escola_id: string
}

export interface Resumo {
  total_turmas: number; total_vagas: number; total_matriculados: number
  total_disponiveis: number; total_fila: number; turmas_lotadas: number
  ocupacao_media: number
}

export interface DadosSerie {
  serie: string; capacidade: number; matriculados: number; vagas: number; fila: number
}

export interface ItemFila {
  id: string; posicao: number; status: string; observacao: string
  data_entrada: string; data_convocacao: string | null; data_resolucao: string | null
  aluno_nome: string; aluno_codigo: string; aluno_id: string
  aluno_serie: string | null; dias_espera: number
  turma_codigo: string; turma_serie: string; turma_id: string
  escola_nome: string; escola_id: string
}

export interface ResumoFila {
  total: number; aguardando: number; convocados: number; matriculados: number; desistentes: number
}

export interface AlunoParaFila {
  id: string; nome: string; codigo: string; serie: string | null; escola_nome: string
}

export type FiltroOcupacao = '' | 'lotada' | 'com_vagas' | 'com_fila'
