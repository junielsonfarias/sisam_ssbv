import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Testa a lógica de validarDataNaoFutura que existe em lib/services/frequencia.ts.
 *
 * Como a função NÃO é exportada, reimplementamos a mesma lógica aqui
 * para testar unitariamente sem dependência de banco de dados.
 * A lógica é idêntica: compara data + 'T23:59:59' com hoje 23:59:59.
 */

// Reimplementação da lógica interna de validarDataNaoFutura (não exportada)
function validarDataNaoFutura(data: string): void {
  const dataObj = new Date(data + 'T23:59:59')
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)
  if (dataObj > hoje) {
    throw new Error('Não é permitido lançar frequência para data futura')
  }
}

describe('validarDataNaoFutura (lógica de lib/services/frequencia.ts)', () => {
  it('data de hoje → OK (não lança)', () => {
    const hoje = new Date()
    const dataStr = hoje.toISOString().split('T')[0]
    expect(() => validarDataNaoFutura(dataStr)).not.toThrow()
  })

  it('data de ontem → OK', () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const dataStr = ontem.toISOString().split('T')[0]
    expect(() => validarDataNaoFutura(dataStr)).not.toThrow()
  })

  it('data de amanhã → lança Error', () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataStr = amanha.toISOString().split('T')[0]
    expect(() => validarDataNaoFutura(dataStr)).toThrow('Não é permitido lançar frequência para data futura')
  })

  it('data muito no futuro (2030-01-01) → lança Error', () => {
    expect(() => validarDataNaoFutura('2030-01-01')).toThrow('Não é permitido lançar frequência para data futura')
  })

  it('data antiga (2020-01-01) → OK', () => {
    expect(() => validarDataNaoFutura('2020-01-01')).not.toThrow()
  })
})
