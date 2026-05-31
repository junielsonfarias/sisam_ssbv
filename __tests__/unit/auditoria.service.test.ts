/**
 * Testes do auditoria.service — registrar acoes sem bloquear operacao principal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

import pool from '@/database/connection'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

describe('registrarAuditoria', () => {
  it('insere com todos os campos quando todos estao presentes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarAuditoria({
      usuarioId: 'user-1',
      usuarioEmail: 'a@b.com',
      acao: 'PNAE_REGISTRAR_ATENDIMENTO',
      entidade: 'pnae_atendimentos',
      entidadeId: 'aten-1',
      detalhes: { qtd: 50, escola_id: 'esc-1' },
      ip: '1.2.3.4',
    })

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO logs_auditoria')
    expect(params).toEqual([
      'user-1',
      'a@b.com',
      'PNAE_REGISTRAR_ATENDIMENTO',
      'pnae_atendimentos',
      'aten-1',
      '{"qtd":50,"escola_id":"esc-1"}',
      '1.2.3.4',
    ])
  })

  it('converte campos opcionais undefined em null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarAuditoria({
      acao: 'LOGIN',
      entidade: 'usuarios',
    })

    const params = mockQuery.mock.calls[0][1]
    expect(params[0]).toBeNull() // usuarioId
    expect(params[1]).toBeNull() // usuarioEmail
    expect(params[4]).toBeNull() // entidadeId
    expect(params[5]).toBeNull() // detalhes
    expect(params[6]).toBeNull() // ip
  })

  it('serializa detalhes JSON', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarAuditoria({
      acao: 'X', entidade: 'y',
      detalhes: { campo_a: 1, lista: ['x', 'y'] },
    })

    const params = mockQuery.mock.calls[0][1]
    expect(params[5]).toBe('{"campo_a":1,"lista":["x","y"]}')
  })

  it('NAO lanca exceção se INSERT falhar (auditoria nao bloqueia operacao)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB indisponivel'))

    await expect(
      registrarAuditoria({ acao: 'X', entidade: 'y' })
    ).resolves.toBeUndefined()
  })

  it('detalhes null nao chama JSON.stringify', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    await registrarAuditoria({ acao: 'X', entidade: 'y', detalhes: null })
    expect(mockQuery.mock.calls[0][1][5]).toBeNull()
  })
})
