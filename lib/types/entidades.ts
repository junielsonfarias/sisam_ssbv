/**
 * Entidades principais do sistema
 *
 * @module types/entidades
 */

// ============================================================================
// ENTIDADES PRINCIPAIS
// ============================================================================

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

// ========================================
// ESTRUTURA DE SÉRIES
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

export interface Avaliacao {
  id: string;
  nome: string;
  descricao?: string | null;
  ano_letivo: string;
  tipo: 'diagnostica' | 'final' | 'unica';
  ordem: number;
  data_inicio?: Date | null;
  data_fim?: Date | null;
  ativo: boolean;
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
  avaliacao_id?: string;
  serie?: string;
  disciplina?: string;
  area_conhecimento?: string;
  data_inicio?: string;
  data_fim?: string;
  taxa_acertos_min?: number;
  taxa_acertos_max?: number;
}

// ============================================================================
// GESTOR ESCOLAR - ENTIDADES
// ============================================================================

/** Disciplina escolar (Português, Matemática, etc.) */
export interface DisciplinaEscolar {
  id: string
  nome: string
  codigo?: string | null
  abreviacao?: string | null
  ordem: number
  ativo: boolean
  criado_em: Date
  atualizado_em: Date
}

/** Período letivo (bimestre, trimestre, etc.) */
export interface PeriodoLetivo {
  id: string
  nome: string
  tipo: 'bimestre' | 'trimestre' | 'semestre' | 'anual'
  numero: number
  ano_letivo: string
  data_inicio?: string | null
  data_fim?: string | null
  ativo: boolean
  criado_em: Date
  atualizado_em: Date
}

/** Configuração de notas por escola e ano */
export interface ConfiguracaoNotasEscola {
  id: string
  escola_id: string
  ano_letivo: string
  tipo_periodo: 'bimestre' | 'trimestre' | 'semestre'
  nota_maxima: number
  media_aprovacao: number
  media_recuperacao: number
  peso_avaliacao: number
  peso_recuperacao: number
  permite_recuperacao: boolean
  criado_em: Date
  atualizado_em: Date
  // Campos via JOIN
  escola_nome?: string
}

/** Nota escolar de um aluno */
export interface NotaEscolar {
  id: string
  aluno_id: string
  disciplina_id: string
  periodo_id: string
  escola_id: string
  ano_letivo: string
  nota?: number | null
  nota_recuperacao?: number | null
  nota_final?: number | null
  faltas: number
  observacao?: string | null
  registrado_por?: string | null
  criado_em: Date
  atualizado_em: Date
  // Campos via JOIN
  aluno_nome?: string
  disciplina_nome?: string
  periodo_nome?: string
}

// ============================================================================
// RECONHECIMENTO FACIAL
// ============================================================================

/** Dispositivo de reconhecimento facial */
export interface DispositivoFacial {
  id: string
  escola_id: string
  nome: string
  localizacao: string | null
  api_key_hash: string
  api_key_prefix: string
  status: 'ativo' | 'inativo' | 'bloqueado'
  ultimo_ping: Date | null
  metadata: Record<string, unknown>
  criado_em: Date
  atualizado_em: Date
  // Campos via JOIN
  escola_nome?: string
}

/** Consentimento facial (LGPD) */
export interface ConsentimentoFacial {
  id: string
  aluno_id: string
  responsavel_nome: string
  responsavel_cpf: string | null
  consentido: boolean
  data_consentimento: Date | null
  data_revogacao: Date | null
  ip_registro: string | null
  criado_em: Date
  atualizado_em: Date
  // Campos via JOIN
  aluno_nome?: string
}

/** Embedding facial de um aluno */
export interface EmbeddingFacial {
  id: string
  aluno_id: string
  embedding_data: Buffer
  qualidade: number | null
  versao_modelo: string
  registrado_por: string | null
  criado_em: Date
  atualizado_em: Date
}

/** Registro de frequência diária */
export interface FrequenciaDiaria {
  id: string
  aluno_id: string
  turma_id: string
  escola_id: string
  data: string
  hora_entrada: string | null
  hora_saida: string | null
  metodo: 'manual' | 'facial' | 'qrcode'
  dispositivo_id: string | null
  confianca: number | null
  registrado_por: string | null
  criado_em: Date
  // Campos via JOIN
  aluno_nome?: string
  turma_nome?: string
  dispositivo_nome?: string
}

/** Log de evento de dispositivo */
export interface LogDispositivo {
  id: string
  dispositivo_id: string
  evento: string
  detalhes: Record<string, unknown>
  criado_em: Date
}

// ============================================================================
// FREQUÊNCIA POR HORA-AULA (6º-9º ANO)
// ============================================================================

/** Slot de horário de aula na grade semanal */
export interface HorarioAula {
  id: string
  turma_id: string
  dia_semana: number
  numero_aula: number
  disciplina_id: string
  criado_em: Date
  atualizado_em: Date
  // Campos via JOIN
  disciplina_nome?: string
  disciplina_codigo?: string
}

/** Registro de frequência por hora-aula */
export interface FrequenciaHoraAula {
  id: string
  aluno_id: string
  turma_id: string
  escola_id: string
  data: string
  numero_aula: number
  disciplina_id: string
  presente: boolean
  metodo: 'manual' | 'facial' | 'automatico'
  registrado_por: string | null
  criado_em: Date
  // Campos via JOIN
  aluno_nome?: string
  disciplina_nome?: string
}
