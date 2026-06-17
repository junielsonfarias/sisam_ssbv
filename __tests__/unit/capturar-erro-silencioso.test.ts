import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Sentry antes de importar o módulo sob teste
const captureExceptionMock = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}))

import { reportarErroSilencioso } from '@/lib/observabilidade/capturar-erro-silencioso'

describe('reportarErroSilencioso', () => {
  beforeEach(() => {
    captureExceptionMock.mockReset()
  })

  it('reporta ao Sentry com tag silenciado=true e a origem', () => {
    const erro = new Error('column x does not exist')
    reportarErroSilencioso(erro, { origem: 'safeQuery', descricao: 'buscar notas' })

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    const [errArg, opts] = captureExceptionMock.mock.calls[0] as [Error, any]
    expect(errArg).toBe(erro)
    expect(opts.tags.silenciado).toBe(true)
    expect(opts.tags.origem).toBe('safeQuery')
    expect(opts.extra.descricao).toBe('buscar notas')
  })

  it('envia apenas o template do SQL (truncado) — nunca params/PII', () => {
    const sql = '  SELECT *\n   FROM alunos\n   WHERE cpf = $1 '
    reportarErroSilencioso(new Error('x'), { origem: 'safeQuery', sql })

    const opts = captureExceptionMock.mock.calls[0][1] as any
    // Normaliza espaços e mantém os placeholders ($1), não os valores.
    expect(opts.extra.sql).toBe('SELECT * FROM alunos WHERE cpf = $1')
    expect(opts.extra.sql).toContain('$1')
  })

  it('trunca SQL longo em 500 caracteres', () => {
    const sqlLongo = 'SELECT ' + 'a'.repeat(1000)
    reportarErroSilencioso(new Error('x'), { origem: 'executarQuerySegura', sql: sqlLongo })

    const opts = captureExceptionMock.mock.calls[0][1] as any
    expect(opts.extra.sql.length).toBe(500)
  })

  it('não lança se o Sentry falhar (observabilidade não quebra o fluxo)', () => {
    captureExceptionMock.mockImplementationOnce(() => { throw new Error('sentry offline') })
    expect(() => reportarErroSilencioso(new Error('x'), { origem: 'safeQuery' })).not.toThrow()
  })

  it('lida com descricao/sql ausentes (extra = null)', () => {
    reportarErroSilencioso(new Error('x'), { origem: 'safeQuery' })
    const opts = captureExceptionMock.mock.calls[0][1] as any
    expect(opts.extra.descricao).toBeNull()
    expect(opts.extra.sql).toBeNull()
  })
})
