/**
 * Tipos do domínio facial (consentimento, embeddings, dispositivos, diagnóstico).
 *
 * @module services/facial/types
 */

export interface ConsentimentoAluno {
  aluno_id: string
  aluno_nome: string
  aluno_codigo?: string
  consentimento_id?: string
  responsavel_nome: string | null
  responsavel_cpf?: string | null
  consentido: boolean | null
  data_consentimento: string | null
  data_revogacao: string | null
  tem_embedding: boolean
}

export interface EmbeddingAluno {
  aluno_id: string
  nome: string
  codigo: string
  turma_id: string | null
  serie: string | null
  turma_codigo: string | null
  turma_nome: string | null
  qualidade: number | null
  embedding_base64: string | null
}

export interface DispositivoFacial {
  id: string
  nome: string
  localizacao: string | null
  status: string
  ultimo_ping: string | null
  metadata: Record<string, unknown> | null
  criado_em: string
  atualizado_em: string
  api_key_prefix: string | null
  escola_nome: string
}

export interface LogDispositivo {
  evento: string
  detalhes: Record<string, unknown> | null
  criado_em: string
}

export interface DispositivoDetalhado {
  dispositivo: Omit<DispositivoFacial, 'api_key_prefix'> & { [key: string]: unknown }
  logs: LogDispositivo[]
}

export interface DiagnosticoEmbedding {
  existe: boolean
  valido?: boolean
  tamanho_bytes?: number
  tamanho_esperado?: number
  qualidade?: number | null
  versao_modelo?: string | null
  criado_em?: string
  atualizado_em?: string
  primeiros_5_valores?: number[]
  base64_length?: number
}

export interface DiagnosticoAluno {
  aluno: {
    id: string
    nome: string
    codigo: string | null
    escola_id: string | null
    turma_id: string | null
    serie: string | null
    ano_letivo: string | null
    ativo: boolean
    situacao: string | null
  }
  consentimento: {
    consentido: boolean
    responsavel_nome: string | null
    data_consentimento: string | null
    data_revogacao: string | null
  } | null
  embedding: DiagnosticoEmbedding
  status: {
    pronto_para_terminal: boolean
    problemas: string[]
  }
}

export interface RevogarConsentimentoResult {
  embeddings: number
  consentimentos_revogados: number
  frequencias_anonimizadas: number
}

export interface FiltrosDispositivo {
  escolaId?: string | null
  poloId?: string | null
  usuario?: { tipo_usuario: string; escola_id?: string | null; polo_id?: string | null }
}
