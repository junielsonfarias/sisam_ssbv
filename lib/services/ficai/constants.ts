/**
 * Constantes e máquina de estados do fluxo FICAI.
 *
 * @module services/ficai/constants
 */

export type StatusFicai =
  | 'aberto'
  | 'contato_responsavel'
  | 'aluno_retornou'
  | 'encaminhado_conselho_tutelar'
  | 'encaminhado_ministerio_publico'
  | 'concluido_aluno_transferido'
  | 'concluido_resolvido'
  | 'concluido_evasao_confirmada'
  | 'cancelado'

export type MotivoFicai =
  | 'infrequencia_50'
  | 'ausencia_consecutiva'
  | 'abandono_suspeito'
  | 'evasao_confirmada'
  | 'outro'

export const STATUS_LABEL: Record<StatusFicai, string> = {
  aberto: 'Aberto',
  contato_responsavel: 'Contato com responsável',
  aluno_retornou: 'Aluno retornou',
  encaminhado_conselho_tutelar: 'Encaminhado ao Conselho Tutelar',
  encaminhado_ministerio_publico: 'Encaminhado ao Ministério Público',
  concluido_aluno_transferido: 'Concluído — aluno transferido',
  concluido_resolvido: 'Concluído — resolvido',
  concluido_evasao_confirmada: 'Concluído — evasão confirmada',
  cancelado: 'Cancelado',
}

/**
 * Transições válidas no fluxo FICAI (ECA Art. 56).
 * Fluxo natural: aberto → contato_responsavel → aluno_retornou (resolvido)
 *           OU: aberto → contato_responsavel → encaminhado_conselho_tutelar → encaminhado_ministerio_publico
 * Conclusões podem ser alcançadas dos status em andamento (não direto de aberto).
 */
const TRANSICOES_FICAI: Record<StatusFicai, StatusFicai[]> = {
  aberto: ['contato_responsavel', 'concluido_aluno_transferido', 'cancelado'],
  contato_responsavel: [
    'aluno_retornou',
    'encaminhado_conselho_tutelar',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  aluno_retornou: ['concluido_resolvido', 'contato_responsavel'],
  encaminhado_conselho_tutelar: [
    'encaminhado_ministerio_publico',
    'aluno_retornou',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  encaminhado_ministerio_publico: [
    'aluno_retornou',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  concluido_aluno_transferido: [],
  concluido_resolvido: [],
  concluido_evasao_confirmada: [],
  cancelado: ['aberto'], // permite reabrir caso cancelado por engano
}

export function transicaoValidaFicai(de: StatusFicai, para: StatusFicai): boolean {
  if (de === para) return true
  return TRANSICOES_FICAI[de]?.includes(para) ?? false
}

export const STATUS_ABERTOS: StatusFicai[] = [
  'aberto', 'contato_responsavel', 'aluno_retornou',
  'encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico',
]
