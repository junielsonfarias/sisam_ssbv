/**
 * Testes unitários — lib/services/ficai/constants.ts
 *
 * Cobre:
 *   transicaoValidaFicai — máquina de estados do fluxo FICAI (ECA Art. 56)
 *   STATUS_LABEL — rótulos de exibição
 *   STATUS_ABERTOS — lista de status em aberto
 */

import { describe, it, expect } from 'vitest'
import {
  transicaoValidaFicai,
  STATUS_LABEL,
  STATUS_ABERTOS,
  type StatusFicai,
} from '@/lib/services/ficai/constants'

const TODOS_STATUS: StatusFicai[] = [
  'aberto',
  'contato_responsavel',
  'aluno_retornou',
  'encaminhado_conselho_tutelar',
  'encaminhado_ministerio_publico',
  'concluido_aluno_transferido',
  'concluido_resolvido',
  'concluido_evasao_confirmada',
  'cancelado',
]

// ============================================================================
// STATUS_LABEL — integridade
// ============================================================================

describe('STATUS_LABEL', () => {
  it('tem rótulo para cada status possível', () => {
    for (const s of TODOS_STATUS) {
      expect(STATUS_LABEL[s], `Label ausente para "${s}"`).toBeTruthy()
    }
  })

  it('rótulos são strings não-vazias', () => {
    for (const s of TODOS_STATUS) {
      expect(typeof STATUS_LABEL[s]).toBe('string')
      expect(STATUS_LABEL[s].length).toBeGreaterThan(0)
    }
  })

  it('status "aberto" tem label legível em pt-BR', () => {
    expect(STATUS_LABEL['aberto']).toBe('Aberto')
  })

  it('status "cancelado" tem label legível em pt-BR', () => {
    expect(STATUS_LABEL['cancelado']).toBe('Cancelado')
  })
})

// ============================================================================
// STATUS_ABERTOS
// ============================================================================

describe('STATUS_ABERTOS', () => {
  it('contém pelo menos o status "aberto"', () => {
    expect(STATUS_ABERTOS).toContain('aberto')
  })

  it('não contém status de conclusão', () => {
    const conclusoes: StatusFicai[] = [
      'concluido_aluno_transferido',
      'concluido_resolvido',
      'concluido_evasao_confirmada',
      'cancelado',
    ]
    for (const c of conclusoes) {
      expect(STATUS_ABERTOS).not.toContain(c)
    }
  })

  it('contém contato_responsavel, aluno_retornou e encaminhados', () => {
    expect(STATUS_ABERTOS).toContain('contato_responsavel')
    expect(STATUS_ABERTOS).toContain('aluno_retornou')
    expect(STATUS_ABERTOS).toContain('encaminhado_conselho_tutelar')
    expect(STATUS_ABERTOS).toContain('encaminhado_ministerio_publico')
  })
})

// ============================================================================
// transicaoValidaFicai — máquina de estados
// ============================================================================

describe('transicaoValidaFicai', () => {
  // Transições iguais são sempre válidas (idempotência)
  it('transição para o mesmo status é válida (idempotência)', () => {
    for (const s of TODOS_STATUS) {
      expect(transicaoValidaFicai(s, s), `${s} → ${s} deve ser válida`).toBe(true)
    }
  })

  // Fluxo natural: abertura → contato → conselho → MP
  it('abertura → contato com responsável (passo 1 do ECA)', () => {
    expect(transicaoValidaFicai('aberto', 'contato_responsavel')).toBe(true)
  })

  it('contato responsável → aluno retornou (resolução rápida)', () => {
    expect(transicaoValidaFicai('contato_responsavel', 'aluno_retornou')).toBe(true)
  })

  it('contato responsável → encaminhado conselho tutelar', () => {
    expect(transicaoValidaFicai('contato_responsavel', 'encaminhado_conselho_tutelar')).toBe(true)
  })

  it('encaminhado conselho tutelar → encaminhado ministério público', () => {
    expect(transicaoValidaFicai('encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico')).toBe(true)
  })

  it('encaminhado ministério público → concluído resolvido', () => {
    expect(transicaoValidaFicai('encaminhado_ministerio_publico', 'concluido_resolvido')).toBe(true)
  })

  it('cancelado pode ser reaberto (cancelado → aberto)', () => {
    expect(transicaoValidaFicai('cancelado', 'aberto')).toBe(true)
  })

  // Transições proibidas
  it('aberto → encaminhado conselho tutelar (pulo ilegal — deve recusar)', () => {
    expect(transicaoValidaFicai('aberto', 'encaminhado_conselho_tutelar')).toBe(false)
  })

  it('aberto → encaminhado ministério público (pulo ilegal)', () => {
    expect(transicaoValidaFicai('aberto', 'encaminhado_ministerio_publico')).toBe(false)
  })

  it('aberto → concluído resolvido sem passar pelo contato (pulo ilegal)', () => {
    expect(transicaoValidaFicai('aberto', 'concluido_resolvido')).toBe(false)
  })

  it('status de conclusão final não admite mais transições', () => {
    const conclusoes: StatusFicai[] = [
      'concluido_aluno_transferido',
      'concluido_resolvido',
      'concluido_evasao_confirmada',
    ]
    const outros: StatusFicai[] = ['aberto', 'contato_responsavel', 'aluno_retornou']
    for (const c of conclusoes) {
      for (const o of outros) {
        expect(transicaoValidaFicai(c, o), `${c} → ${o} não deveria ser válida`).toBe(false)
      }
    }
  })

  it('encaminhado ministério público → aberto (retrocesso ilegal)', () => {
    expect(transicaoValidaFicai('encaminhado_ministerio_publico', 'aberto')).toBe(false)
  })

  it('aluno_retornou → encaminhado_conselho_tutelar (retrocesso ilegal)', () => {
    expect(transicaoValidaFicai('aluno_retornou', 'encaminhado_conselho_tutelar')).toBe(false)
  })

  // Branches intermediários (raros mas permitidos)
  it('contato responsável → concluído resolvido (resolução direta)', () => {
    expect(transicaoValidaFicai('contato_responsavel', 'concluido_resolvido')).toBe(true)
  })

  it('contato responsável → cancelado', () => {
    expect(transicaoValidaFicai('contato_responsavel', 'cancelado')).toBe(true)
  })

  it('encaminhado conselho tutelar → aluno retornou', () => {
    expect(transicaoValidaFicai('encaminhado_conselho_tutelar', 'aluno_retornou')).toBe(true)
  })

  it('aluno_retornou → concluido_resolvido', () => {
    expect(transicaoValidaFicai('aluno_retornou', 'concluido_resolvido')).toBe(true)
  })
})
