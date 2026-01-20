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
  topAlunos: TopAluno[]
  alunosDetalhados: AlunoDetalhado[]
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
  id: string | number
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
export type AbaPainelDados = 'geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'

// Tipos para PainelDados
export interface ResultadoConsolidadoPainel {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
  turma_codigo: string
  serie: string
  presenca: string
  total_acertos_lp: number | string
  total_acertos_ch: number | string
  total_acertos_mat: number | string
  total_acertos_cn: number | string
  nota_lp: number | string | null
  nota_ch: number | string | null
  nota_mat: number | string | null
  nota_cn: number | string | null
  media_aluno: number | string | null
  nota_producao?: number | string | null
  nivel_aprendizagem?: string | null
  nivel_aprendizagem_id?: string | null
  tipo_avaliacao?: string | null
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  nivel_lp?: string | null
  nivel_mat?: string | null
  nivel_prod?: string | null
  nivel_aluno?: string | null
}

export interface EscolaPainel {
  id: string
  nome: string
  polo_id?: string
  polo_nome?: string
  total_alunos?: number
  total_turmas?: number
  media_geral?: number
  media_lp?: number
  media_mat?: number
  media_prod?: number
  media_ch?: number
  media_cn?: number
  presentes?: number
  faltantes?: number
}

export interface TurmaPainel {
  id: string
  codigo: string
  nome?: string
  escola_id?: string
  escola_nome?: string
  serie?: string
  total_alunos?: number
  media_geral?: number
  media_lp?: number
  media_mat?: number
  media_prod?: number
  media_ch?: number
  media_cn?: number
  presentes?: number
  faltantes?: number
}

export interface EstatisticasPainel {
  totalEscolas: number
  totalPolos: number
  totalResultados: number
  totalAlunos: number
  totalAlunosAvaliados: number
  totalTurmas: number
  totalAlunosPresentes: number
  totalAlunosFaltantes: number
  mediaGeral: number
  mediaAnosIniciais: number
  mediaAnosFinais: number
  totalAnosIniciais: number
  totalAnosFinais: number
  nomeEscola?: string
  nomePolo?: string
}

export interface PainelDadosProps {
  tipoUsuario: 'admin' | 'escola' | 'tecnico' | 'polo'
  estatisticasEndpoint: string
  resultadosEndpoint: string
  escolasEndpoint?: string
  turmasEndpoint?: string
}

// Interfaces para filtros de alunos
export interface FiltrosAlunos {
  escola_id?: string
  turma_id?: string
  serie?: string
  presenca?: string
  etapa_ensino?: string
}

// Interface para paginacao basica
export interface PaginacaoInfo {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

// Interface para paginacao completa com flags de navegacao
export interface Paginacao extends PaginacaoInfo {
  temProxima: boolean
  temAnterior: boolean
}

// Interfaces simples para uso em selects e listas
export interface PoloSimples {
  id: string
  nome: string
  codigo?: string | null
  ativo?: boolean
}

export interface EscolaSimples {
  id: string
  nome: string
  polo_id: string
  polo_nome?: string
  codigo?: string | null
  ativo?: boolean
}

export interface TurmaSimples {
  id: string
  codigo: string
  nome?: string
  serie: string
  escola_id: string
  escola_nome?: string
  polo_id?: string
  ano_letivo?: string
}

// Interface para opcao de select
export interface OpcaoSelect {
  id: string
  nome?: string
  codigo?: string
  escola_id?: string
  polo_id?: string
}

// Interface para configuracao de disciplina
export interface DisciplinaConfig {
  codigo: string
  nome: string
  sigla: string
  cor: string
  campo_nota: string
  campo_acertos: string
  campo_nivel?: string
  tipo?: 'nota' | 'nivel'
}

// Interface para top alunos (resumo para exibição)
export interface TopAluno {
  nome: string
  escola: string
  media_geral: number
}

// Interface para usuario autenticado
export interface Usuario {
  id: string
  nome?: string
  email?: string
  tipo_usuario: 'administrador' | 'escola' | 'tecnico' | 'polo' | string
  escola_id?: string | number
  polo_id?: string | number
  escola_nome?: string
  polo_nome?: string
}

// Interface para aluno detalhado (usado em alunosDetalhados e topAlunos)
export interface AlunoDetalhado {
  id: string | number
  aluno_id?: string | number
  aluno: string
  aluno_nome?: string
  escola: string
  escola_nome?: string
  escola_id?: string
  polo_id?: string
  turma: string
  turma_codigo?: string
  serie: string
  presenca: string
  media_aluno: number | string | null
  media_geral?: number | string | null
  nota_lp: number | string | null
  nota_mat: number | string | null
  nota_ch: number | string | null
  nota_cn: number | string | null
  nota_producao?: number | string | null
  total_acertos_lp?: number | string
  total_acertos_mat?: number | string
  total_acertos_ch?: number | string
  total_acertos_cn?: number | string
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  nivel_aprendizagem?: string | null
  nivel_lp?: string | null
  nivel_mat?: string | null
  nivel_prod?: string | null
  nivel_aluno?: string | null
  [key: string]: unknown // Para acesso dinâmico a campos de nota/acertos
}

// Interface para registro com medias (usado em getMediaDisciplina)
export interface RegistroComMedias {
  media_geral?: number | string | null
  media_aluno?: number | string | null
  media_lp?: number | string | null
  media_mat?: number | string | null
  media_ch?: number | string | null
  media_cn?: number | string | null
  media_prod?: number | string | null
  nota_lp?: number | string | null
  nota_mat?: number | string | null
  nota_ch?: number | string | null
  nota_cn?: number | string | null
  nota_producao?: number | string | null
  [key: string]: unknown
}
