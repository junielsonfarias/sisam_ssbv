/**
 * Tipos e interfaces para o Painel de Dados
 * @module lib/dados/types
 */

export interface DashboardData {
  metricas: {
    total_alunos: number
    total_escolas: number
    total_turmas: number
    total_polos: number
    total_presentes: number
    total_faltantes: number
    media_geral: number
    media_lp: number
    media_mat: number
    media_ch: number
    media_cn: number
    media_producao: number
    menor_media: number
    maior_media: number
    taxa_presenca: number
    total_respostas?: number
    total_acertos?: number
    total_erros?: number
    taxa_acerto_geral?: number
    taxa_erro_geral?: number
  }
  niveis: { nivel: string; quantidade: number }[]
  mediasPorSerie: {
    serie: string
    total_alunos: number
    presentes: number
    media_geral: number
    media_lp: number
    media_mat: number
    media_ch: number | null
    media_cn: number | null
    media_prod: number | null
  }[]
  mediasPorPolo: {
    polo_id: string
    polo: string
    total_alunos: number
    media_geral: number
    media_lp: number
    media_mat: number
    presentes: number
    faltantes: number
  }[]
  mediasPorEscola: {
    escola_id: string
    escola: string
    polo: string
    total_turmas: number
    total_alunos: number
    media_geral: number
    media_lp: number
    media_mat: number
    media_prod: number
    media_ch: number
    media_cn: number
    presentes: number
    faltantes: number
  }[]
  mediasPorTurma: {
    turma_id: string
    turma: string
    escola: string
    serie: string
    total_alunos: number
    media_geral: number
    media_lp: number
    media_mat: number
    media_prod: number
    media_ch: number
    media_cn: number
    presentes: number
    faltantes: number
  }[]
  faixasNota: { faixa: string; quantidade: number }[]
  presenca: { status: string; quantidade: number }[]
  topAlunos: any[]
  alunosDetalhados: any[]
  filtros: {
    polos: { id: string; nome: string }[]
    escolas: { id: string; nome: string; polo_id: string }[]
    series: string[]
    turmas: { id: string; codigo: string; escola_id: string }[]
    anosLetivos: string[]
    niveis: string[]
    faixasMedia: string[]
  }
  analiseAcertosErros?: {
    taxaAcertoGeral: {
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto_geral: number
      taxa_erro_geral: number
    } | null
    taxaAcertoPorDisciplina: {
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
    }[]
    questoesComMaisErros: QuestaoAnalise[]
    escolasComMaisErros: EscolaAnalise[]
    turmasComMaisErros: TurmaAnalise[]
    questoesComMaisAcertos: QuestaoAnalise[]
    escolasComMaisAcertos: EscolaAnalise[]
    turmasComMaisAcertos: TurmaAnalise[]
  }
  resumosPorSerie?: {
    questoes: {
      questao_codigo: string
      questao_descricao: string
      disciplina: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
    }[]
    escolas: {
      escola_id: string
      escola: string
      polo: string
      serie: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      total_alunos: number
    }[]
    turmas: {
      turma_id: string
      turma: string
      escola: string
      serie: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      total_alunos: number
    }[]
    disciplinas: {
      disciplina: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
    }[]
  }
}

export interface QuestaoAnalise {
  questao_codigo: string
  questao_descricao: string
  disciplina: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
}

export interface EscolaAnalise {
  escola_id: string
  escola: string
  polo: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
  total_alunos: number
}

export interface TurmaAnalise {
  turma_id: string
  turma: string
  escola: string
  serie: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
  total_alunos: number
}

export interface AlunoSelecionado {
  id: string
  anoLetivo?: string
  mediaAluno?: number | string | null
  notasDisciplinas?: {
    nota_lp?: number | string | null
    nota_ch?: number | string | null
    nota_mat?: number | string | null
    nota_cn?: number | string | null
  }
  niveisDisciplinas?: {
    nivel_lp?: string | null
    nivel_mat?: string | null
    nivel_prod?: string | null
    nivel_aluno?: string | null
  }
}

export interface Ordenacao {
  coluna: string
  direcao: 'asc' | 'desc'
}

export interface ColunaTabela {
  key: string
  label: string
  format?: string
  align?: 'left' | 'center' | 'right'
  destaque?: boolean
}

export interface PaginacaoAnalises {
  questoesErros: number
  escolasErros: number
  turmasErros: number
  questoesAcertos: number
  escolasAcertos: number
  turmasAcertos: number
}

export type AbaAtiva = 'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'
