/**
 * Service FICAI — Ficha de Comunicação do Aluno Infrequente.
 *
 * Detecta infrequência, abre casos automaticamente e gerencia o fluxo
 * conforme ECA Art. 56 (escola → responsável → Conselho Tutelar → MP).
 *
 * Fachada (barrel) que re-exporta os submódulos em `ficai/`:
 *  - `ficai/constants` — tipos, labels e máquina de estados (transições)
 *  - `ficai/deteccao`  — detecção automática de infrequência
 *  - `ficai/casos`     — CRUD de casos, ações, status e estatísticas
 *
 * @module services/ficai
 */

export type { StatusFicai, MotivoFicai } from './ficai/constants'
export { STATUS_LABEL, transicaoValidaFicai, STATUS_ABERTOS } from './ficai/constants'
export { detectarInfrequencia } from './ficai/deteccao'
export {
  abrirCaso,
  atualizarStatus,
  registrarAcao,
  listarCasos,
  buscarCaso,
  obterEstatisticas,
} from './ficai/casos'
