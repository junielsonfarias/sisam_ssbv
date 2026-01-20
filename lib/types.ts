/**
 * Definições de Tipos do Sistema SISAM
 *
 * Este módulo contém todas as interfaces e tipos TypeScript utilizados
 * no sistema, incluindo:
 * - Entidades do banco de dados (Usuario, Escola, Polo, etc.)
 * - Resultados de avaliações
 * - Configurações de séries
 * - Filtros de análise
 *
 * @module lib/types
 */

// ============================================================================
// TIPOS DE USUÁRIO
// ============================================================================

/**
 * Tipos de usuário do sistema
 *
 * Hierarquia de permissões (do mais restrito ao mais amplo):
 * - escola: Acesso apenas à sua própria escola
 * - polo: Acesso ao seu polo e escolas vinculadas
 * - tecnico: Acesso total (mesmo que administrador)
 * - administrador: Acesso total ao sistema
 *
 * NOTA: O tipo 'admin' foi removido em favor de 'administrador' para padronização.
 * Se houver dados legados com 'admin', a função verificarPermissao em lib/auth.ts trata a compatibilidade.
 */
export type TipoUsuario = 'administrador' | 'tecnico' | 'polo' | 'escola';

// ============================================================================
// ENTIDADES PRINCIPAIS
// ============================================================================

/**
 * Usuário do sistema
 *
 * Representa um usuário autenticado com suas permissões e vínculos.
 */
export interface Usuario {
  /** ID único (UUID) */
  id: string;
  /** Nome completo do usuário */
  nome: string;
  /** Email (usado como login) */
  email: string;
  /** Tipo de usuário para controle de acesso */
  tipo_usuario: TipoUsuario;
  /** ID do polo (para usuários tipo 'polo') */
  polo_id?: string | null;
  /** ID da escola (para usuários tipo 'escola') */
  escola_id?: string | null;
  /** URL da foto de perfil */
  foto_url?: string | null;
  /** Se o usuário está ativo no sistema */
  ativo: boolean;
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
}

/**
 * Polo educacional
 *
 * Agrupa várias escolas sob uma mesma coordenação regional.
 */
export interface Polo {
  /** ID único (UUID) */
  id: string;
  /** Nome do polo */
  nome: string;
  /** Código identificador do polo */
  codigo?: string | null;
  /** Descrição ou observações */
  descricao?: string | null;
  /** Se o polo está ativo */
  ativo: boolean;
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
}

/**
 * Escola
 *
 * Unidade escolar vinculada a um polo.
 */
export interface Escola {
  /** ID único (UUID) */
  id: string;
  /** Nome da escola */
  nome: string;
  /** Código identificador da escola */
  codigo?: string | null;
  /** ID do polo ao qual a escola pertence */
  polo_id: string;
  /** Endereço completo */
  endereco?: string | null;
  /** Telefone de contato */
  telefone?: string | null;
  /** Email de contato */
  email?: string | null;
  /** Se a escola está ativa */
  ativo: boolean;
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
}

/**
 * Questão de avaliação
 *
 * Representa uma questão individual que pode ser aplicada em provas.
 */
export interface Questao {
  /** ID único (UUID) */
  id: string;
  /** Código identificador da questão (ex: Q001) */
  codigo?: string | null;
  /** Descrição ou enunciado da questão */
  descricao?: string | null;
  /** Disciplina (LP, MAT, CH, CN) */
  disciplina?: string | null;
  /** Área de conhecimento */
  area_conhecimento?: string | null;
  /** Nível de dificuldade */
  dificuldade?: string | null;
  /** Resposta correta (A, B, C, D, E) */
  gabarito?: string | null;
  /** Série para qual a questão se aplica */
  serie_aplicavel?: string | null;
  /** Tipo de questão */
  tipo_questao?: 'objetiva' | 'discursiva';
  /** Número da questão na prova */
  numero_questao?: number | null;
  /** Data de criação */
  criado_em: Date;
}

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
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
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
  criado_em: Date;
  atualizado_em: Date;
}

export interface Importacao {
  id: string;
  usuario_id: string;
  nome_arquivo: string;
  total_linhas?: number | null;
  linhas_processadas: number;
  linhas_com_erro: number;
  status: 'processando' | 'concluido' | 'erro';
  erros?: string | null;
  criado_em: Date;
  concluido_em?: Date | null;
}

export interface FiltrosAnalise {
  escola_id?: string;
  polo_id?: string;
  ano_letivo?: string;
  serie?: string;
  disciplina?: string;
  area_conhecimento?: string;
  data_inicio?: string;
  data_fim?: string;
  taxa_acertos_min?: number;
  taxa_acertos_max?: number;
}

// ========================================
// NOVOS TIPOS: Estrutura de Séries
// ========================================

export interface ConfiguracaoSerie {
  id: string;
  serie: string;
  nome_serie: string;
  qtd_questoes_lp: number;
  qtd_questoes_mat: number;
  qtd_questoes_ch: number;
  qtd_questoes_cn: number;
  total_questoes_objetivas: number;
  tem_producao_textual: boolean;
  qtd_itens_producao: number;
  avalia_lp: boolean;
  avalia_mat: boolean;
  avalia_ch: boolean;
  avalia_cn: boolean;
  peso_lp: number;
  peso_mat: number;
  peso_ch: number;
  peso_cn: number;
  peso_producao: number;
  usa_nivel_aprendizagem: boolean;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface ItemProducao {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  nota_maxima: number;
  serie_aplicavel?: string | null;
  ativo: boolean;
  criado_em: Date;
}

export interface ResultadoProducao {
  id: string;
  aluno_id: string;
  escola_id: string;
  turma_id?: string | null;
  item_producao_id: string;
  ano_letivo: string;
  serie?: string | null;
  data_avaliacao?: Date | null;
  nota?: number | null;
  observacao?: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface NivelAprendizagem {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  nota_minima: number;
  nota_maxima: number;
  ordem: number;
  serie_aplicavel?: string | null;
  ativo: boolean;
  criado_em: Date;
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

// ============================================================================
// TIPOS DE DADOS OFFLINE
// ============================================================================

/** Dados de usuário para armazenamento offline */
export interface UsuarioOffline {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id?: string | null
  escola_id?: string | null
  token?: string
}

