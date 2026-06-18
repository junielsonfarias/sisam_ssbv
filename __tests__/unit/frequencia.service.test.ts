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

/**
 * Formata uma data como YYYY-MM-DD em horário LOCAL.
 * A função sob teste interpreta `data + 'T23:59:59'` em horário local; gerar a
 * string via toISOString() (UTC) tornava o teste flaky à noite em fusos
 * negativos (ex.: America/Belem, quando a data UTC já virou para o dia seguinte).
 */
function dataLocalStr(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

describe('validarDataNaoFutura (lógica de lib/services/frequencia.ts)', () => {
  it('data de hoje → OK (não lança)', () => {
    const dataStr = dataLocalStr(new Date())
    expect(() => validarDataNaoFutura(dataStr)).not.toThrow()
  })

  it('data de ontem → OK', () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    expect(() => validarDataNaoFutura(dataLocalStr(ontem))).not.toThrow()
  })

  it('data de amanhã → lança Error', () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    expect(() => validarDataNaoFutura(dataLocalStr(amanha))).toThrow('Não é permitido lançar frequência para data futura')
  })

  it('data muito no futuro (2030-01-01) → lança Error', () => {
    expect(() => validarDataNaoFutura('2030-01-01')).toThrow('Não é permitido lançar frequência para data futura')
  })

  it('data antiga (2020-01-01) → OK', () => {
    expect(() => validarDataNaoFutura('2020-01-01')).not.toThrow()
  })
})
