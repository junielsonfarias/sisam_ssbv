/**
 * Testes unitários — biblioteca.service
 *
 * Cobre:
 *  - obterEscolaDoAcervo: encontrado, nao encontrado (IDOR)
 *  - obterEscolaDoEmprestimo: encontrado, nao encontrado (IDOR)
 *  - cadastrarItem: campos obrigatorios, defaults qtd, campos nulos
 *  - buscarAcervo: sem filtros, com busca, categoria, apenasDisponiveis, limite
 *  - registrarEmprestimo: caminho feliz, sem aluno E servidor, indisponivel
 *  - registrarDevolucao: devolvido (incrementa estoque), extraviado (decrementa total), ja finalizado
 *  - renovarEmprestimo: sucesso, ja renovado 2x (rowCount 0)
 *  - reservarItem: validacao de aluno XOR servidor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '@/database/connection'
import {
  obterEscolaDoAcervo,
  obterEscolaDoEmprestimo,
  cadastrarItem,
  buscarAcervo,
  registrarEmprestimo,
  registrarDevolucao,
  renovarEmprestimo,
  reservarItem,
} from '@/lib/services/biblioteca.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

function criarClientFake(respostas: any[]) {
  let idx = 0
  const client = {
    query: vi.fn().mockImplementation(() => {
      const resp = respostas[idx] ?? { rows: [], rowCount: 0 }
      idx++
      return Promise.resolve(resp)
    }),
    release: vi.fn(),
  }
  mockConnect.mockResolvedValueOnce(client as any)
  return client
}

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// obterEscolaDoAcervo
// ============================================================================

describe('obterEscolaDoAcervo', () => {
  it('retorna escola_id quando acervo existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'esc-1' }], rowCount: 1 } as any)

    const result = await obterEscolaDoAcervo('acervo-1')

    expect(result).toBe('esc-1')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('SELECT escola_id FROM biblioteca_acervo WHERE id = $1')
    expect(params[0]).toBe('acervo-1')
  })

  it('retorna null quando acervo nao existe (previne IDOR)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await obterEscolaDoAcervo('acervo-nao-existe')

    expect(result).toBeNull()
  })

  it('retorna null quando escola_id e null (acervo municipal)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: null }], rowCount: 1 } as any)

    const result = await obterEscolaDoAcervo('acervo-municipal')

    expect(result).toBeNull()
  })
})

// ============================================================================
// obterEscolaDoEmprestimo
// ============================================================================

describe('obterEscolaDoEmprestimo', () => {
  it('retorna escola_id via join com acervo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'esc-2' }], rowCount: 1 } as any)

    const result = await obterEscolaDoEmprestimo('emp-1')

    expect(result).toBe('esc-2')
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('INNER JOIN biblioteca_acervo')
  })

  it('retorna null quando emprestimo nao existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await obterEscolaDoEmprestimo('emp-nao-existe')

    expect(result).toBeNull()
  })
})

// ============================================================================
// cadastrarItem
// ============================================================================

describe('cadastrarItem', () => {
  it('insere item e retorna id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ac-1' }], rowCount: 1 } as any)

    const id = await cadastrarItem({
      titulo: 'O Pequeno Principe',
      autor: 'Antoine de Saint-Exupery',
    })

    expect(id).toBe('ac-1')
  })

  it('usa qtd_total 1 por padrao quando nao fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ac-2' }], rowCount: 1 } as any)

    await cadastrarItem({ titulo: 'Dom Quixote' })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[10]).toBe(1)  // qtd_total
    expect(params[11]).toBe(1)  // qtd_disponivel
  })

  it('usa qtd_disponivel igual a qtd_total quando apenas qtd_total fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ac-3' }], rowCount: 1 } as any)

    await cadastrarItem({ titulo: 'Biblia', qtd_total: 5 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[10]).toBe(5)  // qtd_total
    expect(params[11]).toBe(5)  // qtd_disponivel (= qtd_total)
  })
})

// ============================================================================
// buscarAcervo
// ============================================================================

describe('buscarAcervo', () => {
  it('lista itens ativos sem filtros', async () => {
    const fakeItems = [{ id: 'ac-1', titulo: 'Livro A', qtd_disponivel: 2 }]
    mockQuery.mockResolvedValueOnce({ rows: fakeItems, rowCount: 1 } as any)

    const result = await buscarAcervo({})

    expect(result).toHaveLength(1)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativo = TRUE')
  })

  it('filtra por categoria quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAcervo({ categoria: 'literatura' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('categoria = $')
    expect(params).toContain('literatura')
  })

  it('filtra por disponibilidade quando apenasDisponiveis=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAcervo({ apenasDisponiveis: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('qtd_disponivel > 0')
  })

  it('busca em titulo, autor e isbn quando busca fornecida (min 3 chars)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAcervo({ busca: 'caetano' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('titulo ILIKE')
    expect(sql).toContain('autor ILIKE')
    expect(sql).toContain('isbn = $')
  })

  it('ignora busca com menos de 3 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAcervo({ busca: 'ab' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
  })

  it('limita a 200 quando limite excede maximo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAcervo({ limite: 999 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 1]).toBe(200)
  })
})

// ============================================================================
// registrarEmprestimo
// ============================================================================

describe('registrarEmprestimo', () => {
  it('registra emprestimo para aluno e decrementa estoque', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },  // BEGIN
      { rows: [{ qtd_disponivel: 3 }], rowCount: 1 },  // SELECT acervo FOR UPDATE
      { rows: [{ id: 'emp-1' }], rowCount: 1 },  // INSERT emprestimo
      { rows: [], rowCount: 1 },  // UPDATE qtd_disponivel
      { rows: [], rowCount: 0 },  // COMMIT
    ])

    const id = await registrarEmprestimo({
      acervo_id: 'ac-1',
      aluno_id: 'aluno-1',
      registrado_por: 'user-1',
    })

    expect(id).toBe('emp-1')
  })

  it('registra emprestimo para servidor', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ qtd_disponivel: 2 }], rowCount: 1 },
      { rows: [{ id: 'emp-2' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    const id = await registrarEmprestimo({
      acervo_id: 'ac-1',
      servidor_id: 'srv-1',
      registrado_por: 'user-1',
    })

    expect(id).toBe('emp-2')
  })

  it('lanca erro quando nem aluno nem servidor fornecidos', async () => {
    await expect(
      registrarEmprestimo({ acervo_id: 'ac-1', registrado_por: 'user-1' })
    ).rejects.toThrow('Informe exatamente um: aluno_id OU servidor_id')
  })

  it('lanca erro quando aluno E servidor fornecidos simultaneamente', async () => {
    await expect(
      registrarEmprestimo({
        acervo_id: 'ac-1',
        aluno_id: 'aluno-1',
        servidor_id: 'srv-1',
        registrado_por: 'user-1',
      })
    ).rejects.toThrow('Informe exatamente um: aluno_id OU servidor_id')
  })

  it('lanca erro quando item indisponivel (qtd_disponivel = 0)', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ qtd_disponivel: 0 }], rowCount: 1 },  // sem disponibilidade
    ])

    await expect(
      registrarEmprestimo({ acervo_id: 'ac-1', aluno_id: 'aluno-1', registrado_por: 'user-1' })
    ).rejects.toThrow('Item indisponível para empréstimo')
  })

  it('lanca erro quando item nao existe no acervo', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },  // acervo nao encontrado
    ])

    await expect(
      registrarEmprestimo({ acervo_id: 'ac-nao-existe', aluno_id: 'aluno-1', registrado_por: 'user-1' })
    ).rejects.toThrow('Item indisponível para empréstimo')
  })
})

// ============================================================================
// registrarDevolucao
// ============================================================================

describe('registrarDevolucao', () => {
  it('devolucao normal incrementa qtd_disponivel', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ acervo_id: 'ac-1', status: 'emprestado' }], rowCount: 1 },  // SELECT FOR UPDATE
      { rows: [], rowCount: 1 },  // UPDATE emprestimos
      { rows: [], rowCount: 1 },  // UPDATE acervo +1 disponivel
      { rows: [], rowCount: 0 },
    ])

    const result = await registrarDevolucao({ emprestimo_id: 'emp-1' })

    expect(result).toBe(true)
    const incrementa = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('qtd_disponivel = qtd_disponivel + 1')
    )
    expect(incrementa).toBeTruthy()
  })

  it('devolucao de extraviado decrementa qtd_total (sem incrementar disponivel)', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ acervo_id: 'ac-1', status: 'emprestado' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    await registrarDevolucao({ emprestimo_id: 'emp-1', status: 'extraviado' })

    const decrementaTotal = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('qtd_total = GREATEST(0, qtd_total - 1)')
    )
    expect(decrementaTotal).toBeTruthy()

    const incrementaDisponivel = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('qtd_disponivel = qtd_disponivel + 1')
    )
    expect(incrementaDisponivel).toBeFalsy()
  })

  it('lanca erro quando emprestimo nao encontrado', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },  // emprestimo nao encontrado
    ])

    await expect(
      registrarDevolucao({ emprestimo_id: 'emp-nao-existe' })
    ).rejects.toThrow('Empréstimo não encontrado')
  })

  it('lanca erro quando emprestimo ja finalizado', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ acervo_id: 'ac-1', status: 'devolvido' }], rowCount: 1 },
    ])

    await expect(
      registrarDevolucao({ emprestimo_id: 'emp-ja-devolvido' })
    ).rejects.toThrow('Empréstimo já finalizado')
  })
})

// ============================================================================
// renovarEmprestimo
// ============================================================================

describe('renovarEmprestimo', () => {
  it('renova emprestimo e retorna true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const result = await renovarEmprestimo('emp-1')

    expect(result).toBe(true)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain("status IN ('emprestado','atrasado')")
    expect(sql).toContain('renovacoes < 2')
  })

  it('retorna false quando emprestimo ja tem 2 renovacoes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await renovarEmprestimo('emp-max-renovacoes')

    expect(result).toBe(false)
  })
})

// ============================================================================
// reservarItem
// ============================================================================

describe('reservarItem', () => {
  it('reserva para aluno e retorna id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'res-1' }], rowCount: 1 } as any)

    const id = await reservarItem({ acervo_id: 'ac-1', aluno_id: 'aluno-1' })

    expect(id).toBe('res-1')
  })

  it('reserva para servidor e retorna id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'res-2' }], rowCount: 1 } as any)

    const id = await reservarItem({ acervo_id: 'ac-1', servidor_id: 'srv-1' })

    expect(id).toBe('res-2')
  })

  it('lanca erro quando nenhum beneficiario fornecido', async () => {
    await expect(
      reservarItem({ acervo_id: 'ac-1' })
    ).rejects.toThrow('Informe exatamente um: aluno_id OU servidor_id')
  })

  it('lanca erro quando aluno e servidor fornecidos simultaneamente', async () => {
    await expect(
      reservarItem({ acervo_id: 'ac-1', aluno_id: 'a1', servidor_id: 's1' })
    ).rejects.toThrow('Informe exatamente um: aluno_id OU servidor_id')
  })
})
