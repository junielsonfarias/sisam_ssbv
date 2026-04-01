/**
 * Tipos de resultados de avaliação
 *
 * @module types/resultados
 */

// ============================================================================
// RESULTADOS DE AVALIAÇÃO
// ============================================================================

/**
 * Resultado individual de prova
 *
 * Armazena a resposta de um aluno a uma questão específica.
 * Representa o dado bruto da avaliação antes da consolidação.
 */
export interface ResultadoProva {
  /** ID único (UUID) */
  id: string;
  /** ID da escola */
  escola_id: string;
  /** ID do aluno */
  aluno_id?: string | null;
  /** Código do aluno */
  aluno_codigo?: string | null;
  /** Nome do aluno */
  aluno_nome?: string | null;
  /** ID da turma */
  turma_id?: string | null;
  /** ID da questão */
  questao_id?: string | null;
  /** Código da questão */
  questao_codigo?: string | null;
  /** Resposta dada pelo aluno (A, B, C, D, E) */
  resposta_aluno?: string | null;
  /** Se o aluno acertou a questão */
  acertou?: boolean | null;
  /** Nota da questão (se aplicável) */
  nota?: number | null;
  /** Data de realização da prova */
  data_prova?: Date | null;
  /** Ano letivo (ex: 2024) */
  ano_letivo?: string | null;
  /** Série do aluno */
  serie?: string | null;
  /** Nome/código da turma */
  turma?: string | null;
  /** Disciplina da questão */
  disciplina?: string | null;
  /** Área de conhecimento */
  area_conhecimento?: string | null;
  /** Status de presença (P=presente, F=faltou) */
  presenca?: string | null;
  /** ID da avaliação */
  avaliacao_id?: string | null;
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
}

// Tipo para estatísticas por série (view)
export interface EstatisticasSerie {
  serie: string;
  nome_serie: string;
  total_questoes_objetivas: number;
  tem_producao_textual: boolean;
  total_alunos: number;
  total_escolas: number;
  media_lp?: number | null;
  media_mat?: number | null;
  media_ch?: number | null;
  media_cn?: number | null;
  media_producao?: number | null;
  media_geral?: number | null;
  qtd_insuficiente: number;
  qtd_basico: number;
  qtd_adequado: number;
  qtd_avancado: number;
}

/**
 * Resultado consolidado do aluno
 *
 * Agrega os resultados de todas as questões de um aluno em uma única avaliação.
 * Contém notas por disciplina e média geral.
 */
export interface ResultadoConsolidado {
  /** ID único (UUID) */
  id: string;
  /** ID do aluno */
  aluno_id: string;
  /** ID da escola */
  escola_id: string;
  /** ID da turma */
  turma_id?: string | null;
  /** Ano letivo */
  ano_letivo: string;
  /** Série do aluno */
  serie?: string | null;
  /** Status de presença (P=presente, F=faltou) */
  presenca?: string | null;
  /** Total de acertos em Língua Portuguesa */
  total_acertos_lp: number;
  /** Total de acertos em Ciências Humanas */
  total_acertos_ch: number;
  /** Total de acertos em Matemática */
  total_acertos_mat: number;
  /** Total de acertos em Ciências da Natureza */
  total_acertos_cn: number;
  /** Nota em Língua Portuguesa (0-10) */
  nota_lp?: number | null;
  /** Nota em Ciências Humanas (0-10) */
  nota_ch?: number | null;
  /** Nota em Matemática (0-10) */
  nota_mat?: number | null;
  /** Nota em Ciências da Natureza (0-10) */
  nota_cn?: number | null;
  /** Média geral do aluno (0-10) */
  media_aluno?: number | null;
  // Novos campos para produção textual e nível de aprendizagem
  nota_producao?: number | null;
  nivel_aprendizagem?: string | null;
  nivel_aprendizagem_id?: string | null;
  total_questoes_respondidas?: number | null;
  total_questoes_esperadas?: number | null;
  tipo_avaliacao?: string | null;
  // Notas individuais dos itens de produção
  item_producao_1?: number | null;
  item_producao_2?: number | null;
  item_producao_3?: number | null;
  item_producao_4?: number | null;
  item_producao_5?: number | null;
  item_producao_6?: number | null;
  item_producao_7?: number | null;
  item_producao_8?: number | null;
  // Níveis por disciplina (Anos Iniciais)
  nivel_lp?: string | null;
  nivel_mat?: string | null;
  nivel_prod?: string | null;
  nivel_aluno?: string | null;
  /** ID da avaliação */
  avaliacao_id?: string | null;
  /** Nome da avaliação (via JOIN) */
  avaliacao_nome?: string | null;
  /** Tipo da avaliação (diagnostica, final, unica) */
  avaliacao_tipo?: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

// Tipo para resultado consolidado com dados da série
export interface ResultadoConsolidadoCompleto extends ResultadoConsolidado {
  aluno_codigo?: string | null;
  aluno_nome?: string | null;
  escola_nome?: string | null;
  turma_nome?: string | null;
  nome_serie?: string | null;
  nivel_nome?: string | null;
  nivel_cor?: string | null;
  qtd_questoes_esperadas?: number | null;
  avalia_ch?: boolean;
  avalia_cn?: boolean;
}

// ============================================================================
// TIPOS DE BANCO DE DADOS
// ============================================================================

// Re-exportar tipos do connection para uso em toda a aplicação
export type { QueryParams, QueryParamValue, DatabaseError } from '@/database/connection'

/** Registro genérico retornado pelo banco de dados */
export type RegistroDB = Record<string, unknown>

/** Linha de dados de importação (planilha/CSV) */
export interface LinhaImportacao {
  escola?: string
  polo?: string
  turma?: string
  aluno?: string
  nome?: string
  serie?: string
  [key: string]: string | number | null | undefined
}

// ============================================================================
// TIPOS DE RESPOSTA DE API
// ============================================================================

/** Resposta padrão de API com sucesso */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  total?: number
}

/** Status de saúde do sistema */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  database: boolean
  timestamp: string
  uptime?: number
  version?: string
}

/** Status de conexão do banco */
export interface ConnectionStatus {
  healthy: boolean
  latency: number
  error?: string
}

// ============================================================================
// TIPOS DE CACHE E CONFIGURAÇÃO
// ============================================================================

/** Configuração de personalização do sistema */
export interface PersonalizacaoConfig {
  cor_primaria?: string
  cor_secundaria?: string
  logo_url?: string
  nome_sistema?: string
  [key: string]: string | undefined
}
