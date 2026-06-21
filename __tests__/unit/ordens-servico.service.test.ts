/**
 * Testes unitários — ordens-servico.service
 *
 * Cobre:
 *  - transicaoValida: tabela de transições, mesmo status, inválido
 *  - abrirOrdem: inserção com prioridade padrão e customizada
 *  - atualizarStatus: transição válida, inválida, concluida, cancelada
 *  - adicionarComentario
 *  - avaliarServico: estrelas válidas e fora do intervalo
 *  - listarOrdens: sem filtros, com filtros, apenasAbertas
 *  - estatisticas: com/sem escola
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '@/database/connection'
import {
  transicaoValida,
  abrirOrdem,
  atualizarStatus,
  adicionarComentario,
  avaliarServico,
  listarOrdens,
  estatisticas,
} from '@/lib/services/ordens-servico.service'
import type { StatusOS } from '@/lib/services/ordens-servico.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// transicaoValida
// ============================================================================

describe('transicaoValida', () => {
  it('aceita transicoes do fluxo principal', () => {
    expect(transicaoValida('aberta', 'em_analise')).toBe(true)
    expect(transicaoValida('em_analise', 'aprovada')).toBe(true)
    expect(transicaoValida('aprovada', 'em_atendimento')).toBe(true)
    expect(transicaoValida('em_atendimento', 'concluida')).toBe(true)
  })

  it('aceita cancelamento de qualquer status nao-terminal', () => {
    expect(transicaoValida('aberta', 'cancelada')).toBe(true)
    expect(transicaoValida('em_analise', 'cancelada')).toBe(true)
    expect(transicaoValida('aprovada', 'cancelada')).toBe(true)
    expect(transicaoValida('em_atendimento', 'cancelada')).toBe(true)
    expect(transicaoValida('aguardando_material', 'cancelada')).toBe(true)
    expect(transicaoValida('aguardando_terceiros', 'cancelada')).toBe(true)
  })

  it('aceita reabrir de concluida ou cancelada', () => {
    expect(transicaoValida('concluida', 'reaberta')).toBe(true)
    expect(transicaoValida('cancelada', 'reaberta')).toBe(true)
  })

  it('retorna true quando status de origem e destino sao iguais (mesmo status = noop)', () => {
    expect(transicaoValida('aberta', 'aberta')).toBe(true)
    expect(transicaoValida('concluida', 'concluida')).toBe(true)
  })

  it('rejeita transicoes invalidas', () => {
    // Nao pode ir de aberta para concluida direto
    expect(transicaoValida('aberta', 'concluida')).toBe(false)
    // Nao pode ir de concluida para em_analise diretamente
    expect(transicaoValida('concluida', 'em_analise')).toBe(false)
    // Aprovada nao pode voltar para aberta
    expect(transicaoValida('aprovada', 'aberta')).toBe(false)
    // em_atendimento nao pode voltar para aprovada
    expect(transicaoValida('em_atendimento', 'aprovada')).toBe(false)
  })
})

// ============================================================================
// abrirOrdem
// ============================================================================

describe('abrirOrdem', () => {
  it('insere com prioridade media por padrao', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'os-1', numero: 'OS-2026-001' }], rowCount: 1 } as any)

    const result = await abrirOrdem({
      escola_id: 'esc-1',
      tipo: 'predial',
      titulo: 'Telhado com goteira',
      descricao: 'Viga Q3 com infiltracao',
      aberta_por: 'user-1',
    })

    expect(result.id).toBe('os-1')
    expect(result.numero).toBe('OS-2026-001')
    const params = mockQuery.mock.calls[0][1]!
    expect(params[2]).toBe('media')  // prioridade padrao
  })

  it('usa prioridade urgente quando fornecida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'os-2', numero: 'OS-2026-002' }], rowCount: 1 } as any)

    await abrirOrdem({
      escola_id: 'esc-1',
      tipo: 'eletrica',
      prioridade: 'urgente',
      titulo: 'Curto circuito',
      descricao: 'Risco de incendio',
      aberta_por: 'user-1',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[2]).toBe('urgente')
  })
})

// ============================================================================
// atualizarStatus
// ============================================================================

describe('atualizarStatus', () => {
  const setupClientMock = (statusAtual: StatusOS) => {
    const client = {
      query: vi.fn(),
      release: vi.fn(),
    }
    // BEGIN -> resolve
    // SELECT FOR UPDATE -> retorna o status
    // UPDATE ordens_servico -> resolve
    // INSERT comentario -> resolve
    // COMMIT -> resolve
    client.query.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT status, numero FROM ordens_servico')) {
        return Promise.resolve({ rows: [{ status: statusAtual, numero: 'OS-001' }], rowCount: 1 })
      }
      return Promise.resolve({ rows: [], rowCount: 0 })
    })
    mockConnect.mockResolvedValueOnce(client as any)
    return client
  }

  it('atualiza status de aberta para em_analise com sucesso', async () => {
    setupClientMock('aberta')

    const result = await atualizarStatus({
      ordem_id: 'os-1',
      novo_status: 'em_analise',
      comentario: 'Analisando...',
      autor_id: 'user-1',
    })

    expect(result.statusAnterior).toBe('aberta')
    expect(result.numero).toBe('OS-001')
  })

  it('lanca erro em transicao invalida (aberta para concluida)', async () => {
    setupClientMock('aberta')

    await expect(
      atualizarStatus({
        ordem_id: 'os-1',
        novo_status: 'concluida',
        comentario: 'Forcando conclusao',
        autor_id: 'user-1',
      })
    ).rejects.toThrow('Transição inválida')
  })

  it('lanca erro quando ordem nao encontrada', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValue({ rows: [], rowCount: 0 } as any),
      release: vi.fn(),
    }
    mockConnect.mockResolvedValueOnce(client as any)

    await expect(
      atualizarStatus({
        ordem_id: 'os-nao-existe',
        novo_status: 'em_analise',
        comentario: 'teste',
        autor_id: 'user-1',
      })
    ).rejects.toThrow('Ordem não encontrada')
  })

  it('adiciona concluida_em quando status e concluida', async () => {
    const client = setupClientMock('em_atendimento')

    await atualizarStatus({
      ordem_id: 'os-1',
      novo_status: 'concluida',
      comentario: 'Servico concluido',
      autor_id: 'user-1',
    })

    // Verifica que UPDATE contem concluida_em = NOW()
    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE ordens_servico')
    )
    expect(updateCall).toBeTruthy()
    expect(updateCall![0]).toContain('concluida_em = NOW()')
  })

  it('adiciona cancelada_em quando status e cancelada', async () => {
    const client = setupClientMock('em_atendimento')

    await atualizarStatus({
      ordem_id: 'os-1',
      novo_status: 'cancelada',
      comentario: 'Cancelado pelo responsavel',
      autor_id: 'user-1',
    })

    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE ordens_servico')
    )
    expect(updateCall![0]).toContain('cancelada_em = NOW()')
  })
})

// ============================================================================
// adicionarComentario
// ============================================================================

describe('adicionarComentario', () => {
  it('insere comentario e retorna id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'com-1' }], rowCount: 1 } as any)

    const id = await adicionarComentario({
      ordem_id: 'os-1',
      autor_id: 'user-1',
      texto: 'Aguardando material de reparo',
      anexos_urls: ['http://arquivo.pdf'],
    })

    expect(id).toBe('com-1')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO ordens_servico_comentarios')
    expect(params[2]).toBe('Aguardando material de reparo')
  })

  it('usa array vazio para anexos quando nao fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'com-2' }], rowCount: 1 } as any)

    await adicionarComentario({
      ordem_id: 'os-1',
      autor_id: 'user-1',
      texto: 'Comentario sem anexos',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[3]).toEqual([])  // anexos_urls
  })
})

// ============================================================================
// avaliarServico
// ============================================================================

describe('avaliarServico', () => {
  it('aceita avaliacao de 1 a 5 estrelas', async () => {
    for (const estrelas of [1, 2, 3, 4, 5]) {
      vi.clearAllMocks()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

      const result = await avaliarServico({ ordem_id: 'os-1', estrelas })
      expect(result).toBe(true)
    }
  })

  it('lanca erro para avaliacao menor que 1', async () => {
    await expect(
      avaliarServico({ ordem_id: 'os-1', estrelas: 0 })
    ).rejects.toThrow('Avaliação deve ser entre 1 e 5 estrelas')
  })

  it('lanca erro para avaliacao maior que 5', async () => {
    await expect(
      avaliarServico({ ordem_id: 'os-1', estrelas: 6 })
    ).rejects.toThrow('Avaliação deve ser entre 1 e 5 estrelas')
  })

  it('retorna false quando ordem nao esta concluida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await avaliarServico({ ordem_id: 'os-em-aberto', estrelas: 5 })

    expect(result).toBe(false)
  })
})

// ============================================================================
// listarOrdens
// ============================================================================

describe('listarOrdens', () => {
  it('lista ordens sem filtros com prioridade de ordenacao', async () => {
    const fakeOrdens = [
      { id: 'os-1', prioridade: 'urgente', status: 'aberta' },
      { id: 'os-2', prioridade: 'media', status: 'em_analise' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeOrdens, rowCount: 2 } as any)

    const result = await listarOrdens({})

    expect(result).toHaveLength(2)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('CASE o.prioridade')
  })

  it('filtra por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarOrdens({ escolaId: 'esc-1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('o.escola_id = $')
    expect(params).toContain('esc-1')
  })

  it('filtra apenasAbertas (exclui concluida e cancelada)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarOrdens({ apenasAbertas: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain("NOT IN ('concluida', 'cancelada')")
  })

  it('limita a 200 quando limite excede maximo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarOrdens({ limite: 999 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 1]).toBe(200)
  })
})

// ============================================================================
// estatisticas
// ============================================================================

describe('estatisticas', () => {
  it('retorna metricas agregadas sem filtro de escola', async () => {
    const fakeStats = {
      total: '10',
      abertas: '3',
      concluidas: '7',
      urgentes_abertas: '1',
      dias_medio_atendimento: '5.2',
      avaliacao_media: '4.5',
    }
    mockQuery.mockResolvedValueOnce({ rows: [fakeStats], rowCount: 1 } as any)

    const result = await estatisticas()

    expect(result.total).toBe('10')
    expect(result.avaliacao_media).toBe('4.5')
    const [sql, params] = mockQuery.mock.calls[0]
    // O SQL usa FILTER (WHERE ...) que e parte de aggregate functions, nao um WHERE de tabela
    // Sem escolaId, nao deve ter WHERE escola_id
    expect(sql).not.toContain('WHERE escola_id')
    expect(params).toHaveLength(0)
  })

  it('adiciona WHERE escola_id quando escolaId fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}], rowCount: 1 } as any)

    await estatisticas('esc-1')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE escola_id = $1')
    expect(params[0]).toBe('esc-1')
  })
})
