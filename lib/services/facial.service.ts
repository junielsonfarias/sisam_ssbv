// ============================================================================
// Service Facial — lógica compartilhada para consentimento, embeddings,
// dispositivos e LGPD.
//
// Fachada (barrel) que re-exporta os submódulos em `facial/`:
//  - `facial/types`          — interfaces do domínio facial
//  - `facial/consentimentos` — consentimentos LGPD e anonimização
//  - `facial/embeddings`     — embeddings biométricos do terminal
//  - `facial/diagnostico`    — diagnóstico de dados faciais por aluno
//  - `facial/dispositivos`   — dispositivos (terminais) e logs
// ============================================================================

export type {
  ConsentimentoAluno,
  EmbeddingAluno,
  DispositivoFacial,
  LogDispositivo,
  DispositivoDetalhado,
  DiagnosticoEmbedding,
  DiagnosticoAluno,
  RevogarConsentimentoResult,
  FiltrosDispositivo,
} from './facial/types'

export {
  buscarConsentimentos,
  buscarConsentimentoAluno,
  revogarConsentimento,
  anonimizarDadosFaciaisTx,
  purgarDadosFaciaisLGPD,
} from './facial/consentimentos'

export { buscarEmbeddings } from './facial/embeddings'

export { diagnosticarAluno } from './facial/diagnostico'

export {
  buscarDispositivos,
  buscarDispositivoDetalhado,
  excluirDispositivo,
} from './facial/dispositivos'
