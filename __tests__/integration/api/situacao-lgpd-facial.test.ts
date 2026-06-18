import { describe, it, expect, vi, beforeEach } from 'vitest'

// withTransaction apenas invoca a callback com um client mockado
vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: (fn: any) => fn(mockClient),
}))

vi.mock('@/lib/services/facial.service', () => ({
  anonimizarDadosFaciaisTx: vi.fn().mockResolvedValue({
    embeddings: 3, consentimentos_revogados: 1, frequencias_anonimizadas: 12,
  }),
}))

const mockClient = { query: vi.fn() }

import { alterarSituacao } from '@/lib/services/alunos.service'
import { anonimizarDadosFaciaisTx } from '@/lib/services/facial.service'

const mockFacial = vi.mocked(anonimizarDadosFaciaisTx)

function comSituacaoAtual(atual: string) {
  mockClient.query.mockReset()
  // 1ª query: SELECT situacao atual; demais (UPDATE/INSERT): genéricas
  mockClient.query
    .mockResolvedValueOnce({ rows: [{ id: 'al-1', situacao: atual, ativo: true }], rowCount: 1 })
    .mockResolvedValue({ rows: [], rowCount: 1 })
}

describe('alterarSituacao — exclusão LGPD facial ao sair da rede (Fase 4.4)', () => {
  beforeEach(() => {
    mockFacial.mockClear()
  })

  it('exclui dados faciais ao transferir', async () => {
    comSituacaoAtual('cursando')
    const r = await alterarSituacao('al-1', { situacao: 'transferido' }, 'admin-1')
    expect(r.sucesso).toBe(true)
    expect(mockFacial).toHaveBeenCalledTimes(1)
    expect(mockFacial).toHaveBeenCalledWith(mockClient, 'al-1')
    expect(r.dados_faciais_removidos).toEqual({
      embeddings: 3, consentimentos_revogados: 1, frequencias_anonimizadas: 12,
    })
  })

  it('exclui dados faciais no abandono', async () => {
    comSituacaoAtual('cursando')
    await alterarSituacao('al-1', { situacao: 'abandono' }, 'admin-1')
    expect(mockFacial).toHaveBeenCalledTimes(1)
  })

  it('NÃO exclui dados faciais ao aprovar (aluno continua na rede)', async () => {
    comSituacaoAtual('cursando')
    const r = await alterarSituacao('al-1', { situacao: 'aprovado' }, 'admin-1')
    expect(mockFacial).not.toHaveBeenCalled()
    expect(r.dados_faciais_removidos).toBeUndefined()
  })

  it('NÃO exclui ao remanejar (permanece na rede)', async () => {
    comSituacaoAtual('cursando')
    await alterarSituacao('al-1', { situacao: 'remanejado' }, 'admin-1')
    expect(mockFacial).not.toHaveBeenCalled()
  })
})
