// SISAM - Tipos e Interfaces para Sistema de Divergências

export type NivelDivergencia = 'critico' | 'importante' | 'aviso' | 'informativo'

export type TipoDivergencia =
  // Críticas
  | 'alunos_duplicados'
  | 'alunos_orfaos'
  | 'resultados_orfaos'
  | 'escolas_sem_polo'
  | 'turmas_sem_escola'
  // Importantes
  | 'medias_inconsistentes'
  | 'total_acertos_errado'
  | 'notas_fora_range'
  | 'nivel_aprendizagem_errado'
  | 'questoes_sem_gabarito'
  | 'serie_nao_configurada'
  // Avisos
  | 'ano_letivo_invalido'
  | 'presenca_inconsistente'
  | 'nome_codigo_divergente'
  | 'escolas_inativas_dados_ativos'
  | 'serie_aluno_turma_divergente'
  | 'importacoes_erro_pendente'
  // Informativos
  | 'alunos_sem_resultados'
  | 'escolas_sem_alunos'
  | 'polos_sem_escolas'
  | 'questoes_nao_utilizadas'
  | 'turmas_vazias'

export interface DivergenciaDetalhe {
  id: string
  entidade: string
  entidadeId: string
  nome?: string
  codigo?: string
  escola?: string
  escolaId?: string
  polo?: string
  poloId?: string
  turma?: string
  turmaId?: string
  serie?: string
  anoLetivo?: string
  descricaoProblema: string
  valorAtual?: string | number | null
  valorEsperado?: string | number | null
  sugestaoCorrecao?: string
  dadosExtras?: Record<string, any>
}

export interface Divergencia {
  id: string
  tipo: TipoDivergencia
  nivel: NivelDivergencia
  titulo: string
  descricao: string
  quantidade: number
  detalhes: DivergenciaDetalhe[]
  corrigivel: boolean
  correcaoAutomatica: boolean
  acaoCorrecao?: string
  icone?: string
}

export interface ResumoDivergencias {
  criticos: number
  importantes: number
  avisos: number
  informativos: number
  total: number
  ultimaVerificacao: string | null
}

export interface ResultadoVerificacao {
  resumo: ResumoDivergencias
  divergencias: Divergencia[]
  dataVerificacao: string
}

export interface HistoricoDivergencia {
  id: string
  tipo: TipoDivergencia
  nivel: NivelDivergencia
  titulo: string
  descricao: string
  entidade?: string
  entidadeId?: string
  entidadeNome?: string
  dadosAntes?: Record<string, any>
  dadosDepois?: Record<string, any>
  acaoRealizada: string
  correcaoAutomatica: boolean
  usuarioId?: string
  usuarioNome?: string
  createdAt: string
}

export interface ParametrosCorrecao {
  tipo: TipoDivergencia
  ids?: string[]
  corrigirTodos?: boolean
  dadosCorrecao?: Record<string, any>
}

export interface ResultadoCorrecao {
  sucesso: boolean
  mensagem: string
  corrigidos: number
  erros: number
  detalhes?: string[]
}

// Configuração de cada tipo de divergência
export interface ConfigDivergencia {
  tipo: TipoDivergencia
  nivel: NivelDivergencia
  titulo: string
  descricao: string
  icone: string
  corrigivel: boolean
  correcaoAutomatica: boolean
  acaoCorrecao?: string
}

// Mapeamento de configurações
export const CONFIGURACOES_DIVERGENCIAS: Record<TipoDivergencia, ConfigDivergencia> = {
  // CRÍTICAS
  alunos_duplicados: {
    tipo: 'alunos_duplicados',
    nivel: 'critico',
    titulo: 'Alunos Duplicados',
    descricao: 'Alunos com mesmo código cadastrados mais de uma vez',
    icone: 'Users',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Mesclar ou excluir registros duplicados'
  },
  alunos_orfaos: {
    tipo: 'alunos_orfaos',
    nivel: 'critico',
    titulo: 'Alunos Órfãos',
    descricao: 'Alunos sem escola ou turma válida vinculada',
    icone: 'UserX',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Vincular escola/turma ou excluir aluno'
  },
  resultados_orfaos: {
    tipo: 'resultados_orfaos',
    nivel: 'critico',
    titulo: 'Resultados Órfãos',
    descricao: 'Resultados apontando para alunos ou escolas inexistentes',
    icone: 'FileX',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Limpar resultados sem referência'
  },
  escolas_sem_polo: {
    tipo: 'escolas_sem_polo',
    nivel: 'critico',
    titulo: 'Escolas sem Polo',
    descricao: 'Escolas sem polo vinculado ou com polo inválido',
    icone: 'Building',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Vincular polo à escola'
  },
  turmas_sem_escola: {
    tipo: 'turmas_sem_escola',
    nivel: 'critico',
    titulo: 'Turmas sem Escola',
    descricao: 'Turmas sem escola vinculada ou com escola inválida',
    icone: 'Users',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Vincular escola ou excluir turma'
  },

  // IMPORTANTES
  medias_inconsistentes: {
    tipo: 'medias_inconsistentes',
    nivel: 'importante',
    titulo: 'Médias Inconsistentes',
    descricao: 'Média do aluno diferente do cálculo real baseado nas notas',
    icone: 'Calculator',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Recalcular média do aluno'
  },
  total_acertos_errado: {
    tipo: 'total_acertos_errado',
    nivel: 'importante',
    titulo: 'Total de Acertos Incorreto',
    descricao: 'Total de acertos não corresponde à contagem real',
    icone: 'Hash',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Recalcular total de acertos'
  },
  notas_fora_range: {
    tipo: 'notas_fora_range',
    nivel: 'importante',
    titulo: 'Notas Fora do Intervalo',
    descricao: 'Notas com valor menor que 0 ou maior que 10',
    icone: 'AlertTriangle',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Corrigir nota para valor válido'
  },
  nivel_aprendizagem_errado: {
    tipo: 'nivel_aprendizagem_errado',
    nivel: 'importante',
    titulo: 'Nível de Aprendizagem Incorreto',
    descricao: 'Nível de aprendizagem não corresponde à média do aluno',
    icone: 'Award',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Reclassificar nível de aprendizagem'
  },
  questoes_sem_gabarito: {
    tipo: 'questoes_sem_gabarito',
    nivel: 'importante',
    titulo: 'Questões sem Gabarito',
    descricao: 'Questões utilizadas em provas sem gabarito definido',
    icone: 'HelpCircle',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Definir gabarito da questão'
  },
  serie_nao_configurada: {
    tipo: 'serie_nao_configurada',
    nivel: 'importante',
    titulo: 'Série Não Configurada',
    descricao: 'Alunos ou resultados com série sem configuração no sistema',
    icone: 'Settings',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Configurar série no sistema'
  },

  // AVISOS
  ano_letivo_invalido: {
    tipo: 'ano_letivo_invalido',
    nivel: 'aviso',
    titulo: 'Ano Letivo Inválido',
    descricao: 'Registros com ano letivo em formato inválido ou fora do range esperado',
    icone: 'Calendar',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Corrigir ano letivo'
  },
  presenca_inconsistente: {
    tipo: 'presenca_inconsistente',
    nivel: 'aviso',
    titulo: 'Presença Inconsistente',
    descricao: 'Aluno marcado como faltante mas possui respostas registradas',
    icone: 'UserCheck',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Corrigir status de presença'
  },
  nome_codigo_divergente: {
    tipo: 'nome_codigo_divergente',
    nivel: 'aviso',
    titulo: 'Nome/Código Divergente',
    descricao: 'Mesmo código de aluno com nomes diferentes em anos distintos',
    icone: 'UserCog',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Verificar e corrigir nome do aluno'
  },
  escolas_inativas_dados_ativos: {
    tipo: 'escolas_inativas_dados_ativos',
    nivel: 'aviso',
    titulo: 'Escolas Inativas com Dados',
    descricao: 'Escolas marcadas como inativas mas com alunos ou resultados do ano atual',
    icone: 'Building2',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Reativar escola ou mover dados'
  },
  serie_aluno_turma_divergente: {
    tipo: 'serie_aluno_turma_divergente',
    nivel: 'aviso',
    titulo: 'Série Aluno ≠ Turma',
    descricao: 'Série do aluno diferente da série da turma vinculada',
    icone: 'GitBranch',
    corrigivel: true,
    correcaoAutomatica: false,
    acaoCorrecao: 'Corrigir série do aluno ou turma'
  },
  importacoes_erro_pendente: {
    tipo: 'importacoes_erro_pendente',
    nivel: 'aviso',
    titulo: 'Importações com Erro',
    descricao: 'Importações em status de erro ou processando há muito tempo',
    icone: 'Upload',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Cancelar importações pendentes'
  },

  // INFORMATIVOS
  alunos_sem_resultados: {
    tipo: 'alunos_sem_resultados',
    nivel: 'informativo',
    titulo: 'Alunos sem Resultados',
    descricao: 'Alunos cadastrados sem nenhum resultado de prova registrado',
    icone: 'UserMinus',
    corrigivel: false,
    correcaoAutomatica: false
  },
  escolas_sem_alunos: {
    tipo: 'escolas_sem_alunos',
    nivel: 'informativo',
    titulo: 'Escolas sem Alunos',
    descricao: 'Escolas ativas sem nenhum aluno cadastrado',
    icone: 'School',
    corrigivel: false,
    correcaoAutomatica: false
  },
  polos_sem_escolas: {
    tipo: 'polos_sem_escolas',
    nivel: 'informativo',
    titulo: 'Polos sem Escolas',
    descricao: 'Polos ativos sem nenhuma escola vinculada',
    icone: 'MapPin',
    corrigivel: false,
    correcaoAutomatica: false
  },
  questoes_nao_utilizadas: {
    tipo: 'questoes_nao_utilizadas',
    nivel: 'informativo',
    titulo: 'Questões Não Utilizadas',
    descricao: 'Questões cadastradas que nunca foram utilizadas em provas',
    icone: 'FileQuestion',
    corrigivel: false,
    correcaoAutomatica: false
  },
  turmas_vazias: {
    tipo: 'turmas_vazias',
    nivel: 'informativo',
    titulo: 'Turmas Vazias',
    descricao: 'Turmas ativas sem nenhum aluno vinculado',
    icone: 'Users',
    corrigivel: true,
    correcaoAutomatica: true,
    acaoCorrecao: 'Inativar turmas vazias'
  }
}

// Cores por nível
export const CORES_NIVEL: Record<NivelDivergencia, { bg: string; text: string; border: string; icon: string }> = {
  critico: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500'
  },
  importante: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-500'
  },
  aviso: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500'
  },
  informativo: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500'
  }
}

// Labels em português
export const LABELS_NIVEL: Record<NivelDivergencia, string> = {
  critico: 'Crítico',
  importante: 'Importante',
  aviso: 'Aviso',
  informativo: 'Informativo'
}
