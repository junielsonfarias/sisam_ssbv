/**
 * Constantes Centralizadas do Sistema Educatec
 *
 * Este arquivo contém todas as constantes (magic numbers) utilizadas
 * no sistema, organizadas por categoria para facilitar manutenção.
 *
 * @module lib/constants
 */

// ============================================================================
// NOTAS E AVALIAÇÃO
// ============================================================================

/**
 * Constantes relacionadas a notas e aprovação
 */
export const NOTAS = {
  /** Nota mínima para aprovação */
  APROVACAO: 6.0,
  /** Nota considerada boa */
  BOA: 7.0,
  /** Nota considerada muito boa */
  MUITO_BOA: 8.0,
  /** Nota máxima possível */
  MAXIMA: 10.0,
  /** Nota mínima possível */
  MINIMA: 0.0
} as const

/**
 * Faixas de notas para distribuição em gráficos
 */
export const FAIXAS_NOTAS = {
  INSUFICIENTE: { min: 0, max: 4, label: '0-4' },
  REGULAR: { min: 4, max: 6, label: '4-6' },
  BOM: { min: 6, max: 8, label: '6-8' },
  EXCELENTE: { min: 8, max: 10, label: '8-10' }
} as const

// ============================================================================
// CACHE E SESSÃO
// ============================================================================

/**
 * Configurações de cache do dashboard
 */
export const CACHE = {
  /** Tempo de expiração do cache em milissegundos (1 hora) */
  EXPIRACAO_MS: 60 * 60 * 1000,
  /** Tempo de expiração do cache em minutos */
  EXPIRACAO_MINUTOS: 60,
  /** Intervalo de limpeza automática de caches expirados (5 minutos) */
  INTERVALO_LIMPEZA_MS: 5 * 60 * 1000
} as const

/**
 * Configurações de sessão/autenticação
 */
export const SESSAO = {
  /** Tempo de expiração do cookie em segundos (7 dias) */
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7,
  /** Tempo de expiração do token JWT em dias */
  TOKEN_EXPIRACAO_DIAS: 7,
  /** Nome do cookie de autenticação */
  COOKIE_NAME: 'educatec_auth'
} as const

// ============================================================================
// TIMEOUTS E CONEXÃO
// ============================================================================

/**
 * Configurações de timeout para requisições
 */
export const TIMEOUT = {
  /** Timeout padrão para fetch em ms (30 segundos) */
  FETCH_DEFAULT: 30000,
  /** Timeout para queries de banco em ms */
  QUERY: 30000,
  /** Timeout para statements de banco em ms */
  STATEMENT: 30000,
  /** Intervalo de health check da conexão em ms */
  HEALTH_CHECK_INTERVAL: 30000,
  /** Timeout de conexão idle para Supabase em ms (60s para suportar 50+ usuários) */
  IDLE_SUPABASE: 60000,
  /** Timeout de conexão idle padrão em ms */
  IDLE_DEFAULT: 30000
} as const

/**
 * Configurações de retry para requisições
 */
export const RETRY = {
  /** Número máximo de tentativas */
  MAX_TENTATIVAS: 3,
  /** Delay inicial entre tentativas em ms */
  DELAY_INICIAL: 1000,
  /** Multiplicador do delay progressivo */
  DELAY_MULTIPLICADOR: 2
} as const

// ============================================================================
// PAGINAÇÃO E LIMITES
// ============================================================================

/**
 * Limites de paginação para diferentes contextos
 */
export const LIMITES = {
  /** Limite para listas compactas (ex: top 10) */
  LISTA_COMPACTA: 10,
  /** Limite para rankings e listagens */
  RANKING: 20,
  /** Limite para dados de gráficos */
  GRAFICOS: 30,
  /** Limite para listagens detalhadas */
  LISTAGEM_DETALHADA: 50,
  /** Limite para exportações pequenas */
  EXPORTACAO_PEQUENA: 100,
  /** Limite para queries bulk */
  BULK_QUERY: 1000,
  /** Limite para dados offline (cabe em localStorage) */
  OFFLINE_DATA: 10000,
  /** Limite padrão para paginação de API */
  PAGINACAO_PADRAO: 50
} as const

// ============================================================================
// POOL DE CONEXÕES
// ============================================================================

/**
 * Configurações do pool de conexões do banco de dados
 */
export const POOL = {
  /** Tamanho mínimo do pool de conexões */
  MIN_CONEXOES: 2,
  /** Tamanho máximo do pool de conexões */
  MAX_CONEXOES: 10,
  /** Máximo de conexões para Supabase (limitado pelo plano) */
  MAX_CONEXOES_SUPABASE: 5
} as const

// ============================================================================
// UPLOAD E ARQUIVOS
// ============================================================================

/**
 * Limites para upload de arquivos
 */
export const UPLOAD = {
  /** Tamanho máximo de arquivo em bytes (5 MB) */
  MAX_TAMANHO_BYTES: 5 * 1024 * 1024,
  /** Tamanho máximo de arquivo em MB */
  MAX_TAMANHO_MB: 5,
  /** Tipos MIME permitidos para importação */
  TIPOS_IMPORTACAO: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  /** Extensões permitidas para importação */
  EXTENSOES_IMPORTACAO: ['.csv', '.xls', '.xlsx']
} as const

// ============================================================================
// ANOS ESCOLARES
// ============================================================================

/**
 * Configurações de anos escolares
 */
export const ANOS_ESCOLARES = {
  /** Anos iniciais do ensino fundamental */
  INICIAIS: ['2º Ano', '3º Ano', '5º Ano'],
  /** Anos finais do ensino fundamental */
  FINAIS: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  /** Códigos/sufixos de anos iniciais (para queries) */
  SUFIXOS_INICIAIS: ['2', '3', '5'],
  /** Códigos/sufixos de anos finais (para queries) */
  SUFIXOS_FINAIS: ['6', '7', '8', '9']
} as const

// ============================================================================
// MENSAGENS PADRÃO
// ============================================================================

/**
 * Mensagens de erro padronizadas
 */
export const MENSAGENS = {
  ERRO: {
    NAO_AUTENTICADO: 'Não autenticado',
    NAO_AUTORIZADO: 'Não autorizado',
    NAO_ENCONTRADO: 'Recurso não encontrado',
    PARAMETRO_INVALIDO: 'Parâmetro inválido',
    ERRO_INTERNO: 'Erro interno do servidor',
    SERVICO_INDISPONIVEL: 'Serviço temporariamente indisponível',
    CONEXAO_BANCO: 'Erro de conexão com o banco de dados',
    TIMEOUT: 'Tempo limite excedido'
  },
  SUCESSO: {
    CRIADO: 'Registro criado com sucesso',
    ATUALIZADO: 'Registro atualizado com sucesso',
    REMOVIDO: 'Registro removido com sucesso',
    IMPORTACAO: 'Importação realizada com sucesso'
  }
} as const

// ============================================================================
// TIPOS DE USUÁRIO
// ============================================================================

/**
 * Tipos de usuário do sistema
 */
export const TIPOS_USUARIO = {
  ADMINISTRADOR: 'administrador',
  TECNICO: 'tecnico',
  POLO: 'polo',
  ESCOLA: 'escola'
} as const

/**
 * Hierarquia de permissões (maior número = mais permissão)
 */
export const HIERARQUIA_PERMISSAO = {
  [TIPOS_USUARIO.ESCOLA]: 1,
  [TIPOS_USUARIO.POLO]: 2,
  [TIPOS_USUARIO.TECNICO]: 3,
  [TIPOS_USUARIO.ADMINISTRADOR]: 4
} as const

// ============================================================================
// CONFIGURAÇÕES DE QUESTÕES
// ============================================================================

/**
 * Quantidade padrão de questões por disciplina/série
 */
export const QUESTOES = {
  /** Quantidade padrão de questões por disciplina */
  PADRAO_POR_DISCIPLINA: 20,
  /** Quantidade mínima de questões */
  MINIMO: 1,
  /** Quantidade máxima de questões */
  MAXIMO: 50
} as const

// ============================================================================
// DISCIPLINAS
// ============================================================================

/**
 * Códigos e nomes das disciplinas
 */
export const DISCIPLINAS = {
  LP: { codigo: 'LP', nome: 'Língua Portuguesa', campo: 'nota_lp' },
  MAT: { codigo: 'MAT', nome: 'Matemática', campo: 'nota_mat' },
  CH: { codigo: 'CH', nome: 'Ciências Humanas', campo: 'nota_ch' },
  CN: { codigo: 'CN', nome: 'Ciências da Natureza', campo: 'nota_cn' }
} as const

/**
 * Lista de códigos de disciplinas
 */
export const CODIGOS_DISCIPLINAS = ['LP', 'MAT', 'CH', 'CN'] as const

// ============================================================================
// PRESENÇA
// ============================================================================

/**
 * Status de presença do aluno
 */
export const PRESENCA = {
  PRESENTE: 'P',
  FALTOU: 'F',
  TRANSFERIDO: 'T'
} as const

// ============================================================================
// HORÁRIO DE AULA (6º-9º ANO)
// ============================================================================

/**
 * Configurações de horário de aula para frequência por hora-aula
 */
export const HORARIO_AULA = {
  /** Total de aulas por dia */
  TOTAL_AULAS_DIA: 6,
  /** Dias da semana letivos */
  DIAS_SEMANA: [
    { valor: 1, nome: 'Segunda-feira', abrev: 'Seg' },
    { valor: 2, nome: 'Terça-feira', abrev: 'Ter' },
    { valor: 3, nome: 'Quarta-feira', abrev: 'Qua' },
    { valor: 4, nome: 'Quinta-feira', abrev: 'Qui' },
    { valor: 5, nome: 'Sexta-feira', abrev: 'Sex' },
  ],
} as const

// ============================================================================
// RECONHECIMENTO FACIAL
// ============================================================================

/**
 * Configurações do módulo de reconhecimento facial
 */
export const FACIAL = {
  /** Confiança mínima para aceitar reconhecimento (0-1) */
  CONFIANCA_MINIMA: 0.85,
  /** Dispositivo considerado offline após X minutos sem ping */
  PING_TIMEOUT_MINUTOS: 5,
  /** Alerta se dispositivo offline por mais de X minutos */
  ALERTA_OFFLINE_MINUTOS: 60,
  /** Máximo de registros por requisição em lote */
  LOTE_MAXIMO: 500,
  /** Prefixo das API keys de dispositivos */
  API_KEY_PREFIX: 'educatec_dev_',
  /** Dias para reter logs de dispositivos */
  RETENCAO_LOGS_DIAS: 365,
} as const

// ============================================================================
// REGEX E VALIDAÇÕES
// ============================================================================

/**
 * Expressões regulares para validação
 */
// ============================================================================
// CÓDIGOS DE ERRO POSTGRESQL
// ============================================================================

export const PG_ERRORS = {
  /** Violação de chave única (registro duplicado) */
  UNIQUE_VIOLATION: '23505',
  /** Violação de check constraint */
  CHECK_VIOLATION: '23514',
  /** Violação de foreign key */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Tabela não encontrada */
  UNDEFINED_TABLE: '42P01',
  /** Sintaxe de input inválida */
  INVALID_TEXT_REPRESENTATION: '22P02',
  /** Falha de autenticação */
  INVALID_PASSWORD: '28P01',
  /** Query cancelada por timeout */
  QUERY_CANCELED: '57014',
  /** Conexão recusada */
  CONNECTION_REFUSED: 'ECONNREFUSED',
  /** Host não encontrado */
  HOST_NOT_FOUND: 'ENOTFOUND',
  /** Rede inacessível */
  NETWORK_UNREACHABLE: 'ENETUNREACH',
  /** Timeout de conexão */
  CONNECTION_TIMEOUT: 'ETIMEDOUT',
} as const

export const REGEX = {
  /** Email válido */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Código de aluno (formato: AAANNNN) */
  CODIGO_ALUNO: /^[A-Z]{3}\d{4}$/,
  /** Código de escola (números) */
  CODIGO_ESCOLA: /^\d+$/,
  /** Senha forte (min 8 chars, 1 maiúscula, 1 minúscula, 1 número) */
  SENHA_FORTE: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
} as const
