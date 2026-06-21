/**
 * Testes unitários/integração — lib/services/pnld.service.ts
 *
 * Cobre:
 *   cadastrarTitulo — caminho feliz, campos opcionais null
 *   buscarTitulos — filtros: busca curta (<= 2 chars ignorada), componenteId, anoEscolar, anoPnld
 *   listarEstoqueEscola — passagem de parâmetros
 *   listarDistribuicoesAluno — com e sem anoLetivo
 *   atualizarEstoque — validação de estoque maior que emprestados (transação)
 *   registrarEntrega — caminho feliz, aluno não encontrado, livro indisponível, rollback
 *   registrarDevolucao — devolvido/danificado/extraviado, já finalizado, rollback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

import pool from '@/database/connection'
import {
  cadastrarTitulo,
  buscarTitulos,
  listarEstoqueEscola,
  listarDistribuicoesAluno,
  atualizarEstoque,
  registrarEntrega,
  registrarDevolucao,
} from '@/lib/services/pnld.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>
const mockConnect = pool.connect as ReturnType<typeof vi.fn>

function makeMockClient(overrides: { query?: ReturnType<typeof vi.fn> } = {}) {
  const q = overrides.query ?? vi.fn()
  return { query: q, release: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// cadastrarTitulo
// ============================================================================

describe('cadastrarTitulo', () => {
  it('retorna o id do título cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'titulo-001' }] })

    const id = await cadastrarTitulo({
      titulo: 'Matemática nos Anos Iniciais',
      ano_pnld: 2024,
      tipo_obra: 'livro_aluno',
    })

    expect(id).toBe('titulo-001')
  })

  it('campos opcionais são null quando omitidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1' }] })

    await cadastrarTitulo({
      titulo: 'Livro Teste',
      ano_pnld: 2024,
      tipo_obra: 'manual_professor',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBeNull() // isbn
    expect(params[1]).toBeNull() // codigo_pnld
    expect(params[3]).toBeNull() // autor
    expect(params[4]).toBeNull() // editora
    expect(params[5]).toBeNull() // edicao
    expect(params[7]).toBeNull() // componente_id
    expect(params[8]).toBeNull() // ano_escolar
    expect(params[10]).toBeNull() // observacoes
  })

  it('passa isbn e codigo_pnld quando fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't2' }] })

    await cadastrarTitulo({
      isbn: '978-85-12345-00-0',
      codigo_pnld: 'PNLD2024-001',
      titulo: 'Português',
      ano_pnld: 2024,
      tipo_obra: 'livro_aluno',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('978-85-12345-00-0') // isbn
    expect(params[1]).toBe('PNLD2024-001') // codigo_pnld
  })
})

// ============================================================================
// buscarTitulos
// ============================================================================

describe('buscarTitulos', () => {
  it('sem filtros: retorna todos os títulos com limite padrão 100', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({})

    const [, params] = mockQuery.mock.calls[0]
    // Apenas o parâmetro de limite
    expect(params[params.length - 1]).toBe(100)
  })

  it('busca com texto <= 2 caracteres é ignorada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ busca: 'ab' })

    // Não adiciona parâmetro de busca
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
  })

  it('busca com texto > 2 caracteres adiciona filtro ILIKE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ busca: 'matem' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE')
    expect(params[0]).toBe('matem')
  })

  it('filtra por componenteId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ componenteId: 'comp-lp' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('comp-lp')
    expect(sql).toContain('componente_id = $')
  })

  it('filtra por anoEscolar quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ anoEscolar: 3 })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain(3)
    expect(sql).toContain('ano_escolar = $')
  })

  it('filtra por anoPnld quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ anoPnld: 2024 })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain(2024)
    expect(sql).toContain('ano_pnld = $')
  })

  it('respeita limite customizado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarTitulos({ limite: 50 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[params.length - 1]).toBe(50)
  })
})

// ============================================================================
// listarEstoqueEscola
// ============================================================================

describe('listarEstoqueEscola', () => {
  it('passa escolaId e anoLetivo como parâmetros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarEstoqueEscola('escola-1', '2026')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-1')
    expect(params[1]).toBe('2026')
  })

  it('retorna dados com informações do título', async () => {
    const rows = [
      { titulo_id: 't1', titulo: 'Matemática', qtd_total: 50, qtd_disponivel: 30 },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const result = await listarEstoqueEscola('e1', '2026')
    expect(result[0].titulo).toBe('Matemática')
  })
})

// ============================================================================
// listarDistribuicoesAluno
// ============================================================================

describe('listarDistribuicoesAluno', () => {
  it('sem anoLetivo: lista todas as distribuições do aluno', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarDistribuicoesAluno('aluno-1')

    const [, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(1)
    expect(params[0]).toBe('aluno-1')
  })

  it('com anoLetivo: adiciona filtro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarDistribuicoesAluno('aluno-1', '2026')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(2)
    expect(params[1]).toBe('2026')
    expect(sql).toContain('d.ano_letivo = $2')
  })
})

// ============================================================================
// atualizarEstoque — transação com validação
// ============================================================================

describe('atualizarEstoque', () => {
  it('lança erro quando qtd_total < qtd emprestada atual', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        // SELECT com FOR UPDATE: existe e tem 30 emprestados
        .mockResolvedValueOnce({ rows: [{ qtd_emprestada: '30' }] })
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(atualizarEstoque({
      escola_id: 'e1',
      titulo_id: 't1',
      ano_letivo: '2026',
      qtd_total: 20,  // menor que 30 emprestados
    })).rejects.toThrow('menor que livros já emprestados')

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
  })

  it('atualiza estoque quando qtd_total >= qtd emprestada', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ qtd_emprestada: '10' }] }) // 10 emprestados
        .mockResolvedValueOnce({}) // UPSERT estoque
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await atualizarEstoque({
      escola_id: 'e1',
      titulo_id: 't1',
      ano_letivo: '2026',
      qtd_total: 50, // 50 >= 10 → ok
    })

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('COMMIT')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('novo estoque (sem linha existente): assume emprestada=0', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // nenhuma linha existente
        .mockResolvedValueOnce({}) // UPSERT
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    // Não deve lançar erro (emprestada = 0, qualquer qtd_total >= 0)
    await expect(atualizarEstoque({
      escola_id: 'e1',
      titulo_id: 't1',
      ano_letivo: '2026',
      qtd_total: 100,
    })).resolves.not.toThrow()
  })
})

// ============================================================================
// registrarEntrega — transação com verificação de disponibilidade
// ============================================================================

describe('registrarEntrega', () => {
  it('retorna o id da distribuição quando entrega é bem-sucedida', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'escola-1' }] }) // aluno
        .mockResolvedValueOnce({ rows: [{ qtd_disponivel: 5 }] }) // estoque
        .mockResolvedValueOnce({ rows: [{ id: 'dist-001' }] }) // INSERT distribuição
        .mockResolvedValueOnce({}) // UPDATE estoque
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    const id = await registrarEntrega({
      aluno_id: 'a1',
      titulo_id: 't1',
      ano_letivo: '2026',
      entregue_por: 'user-1',
    })

    expect(id).toBe('dist-001')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('lança erro quando aluno não é encontrado', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // aluno não existe
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarEntrega({
      aluno_id: 'inexistente',
      titulo_id: 't1',
      ano_letivo: '2026',
      entregue_por: 'u1',
    })).rejects.toThrow('Aluno não encontrado')
  })

  it('lança erro quando livro está indisponível no estoque', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }] }) // aluno ok
        .mockResolvedValueOnce({ rows: [{ qtd_disponivel: 0 }] }) // sem estoque
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarEntrega({
      aluno_id: 'a1',
      titulo_id: 't1',
      ano_letivo: '2026',
      entregue_por: 'u1',
    })).rejects.toThrow('indisponível')

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
  })

  it('rollback e release quando qualquer erro ocorre', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Falha inesperada'))
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarEntrega({
      aluno_id: 'a1',
      titulo_id: 't1',
      ano_letivo: '2026',
      entregue_por: 'u1',
    })).rejects.toThrow('Falha inesperada')

    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// registrarDevolucao
// ============================================================================

describe('registrarDevolucao', () => {
  it('reverte estoque corretamente quando livro é devolvido em bom estado', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'e1', titulo_id: 't1', ano_letivo: '2026', status_atual: 'emprestado' }] })
        .mockResolvedValueOnce({}) // UPDATE distribuição
        .mockResolvedValueOnce({}) // UPDATE estoque
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    const ok = await registrarDevolucao({
      distribuicao_id: 'dist-1',
      status: 'devolvido',
      recebido_por: 'u1',
    })

    expect(ok).toBe(true)
    // Verifica que UPDATE de estoque usa qtd_disponivel +1
    const updateEstoque = clientMock.query.mock.calls[3][0] as string
    expect(updateEstoque).toContain('qtd_disponivel = qtd_disponivel + 1')
    expect(updateEstoque).toContain('qtd_emprestada = qtd_emprestada - 1')
  })

  it('incrementa qtd_danificada quando livro danificado', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'e1', titulo_id: 't1', ano_letivo: '2026', status_atual: 'emprestado' }] })
        .mockResolvedValueOnce({}) // UPDATE dist
        .mockResolvedValueOnce({}) // UPDATE estoque
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await registrarDevolucao({
      distribuicao_id: 'dist-2',
      status: 'danificado',
      recebido_por: 'u1',
    })

    const updateEstoque = clientMock.query.mock.calls[3][0] as string
    expect(updateEstoque).toContain('qtd_danificada = qtd_danificada + 1')
  })

  it('incrementa qtd_extraviada quando livro extraviado', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'e1', titulo_id: 't1', ano_letivo: '2026', status_atual: 'emprestado' }] })
        .mockResolvedValueOnce({}) // UPDATE dist
        .mockResolvedValueOnce({}) // UPDATE estoque
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await registrarDevolucao({
      distribuicao_id: 'dist-3',
      status: 'extraviado',
      recebido_por: 'u1',
    })

    const updateEstoque = clientMock.query.mock.calls[3][0] as string
    expect(updateEstoque).toContain('qtd_extraviada = qtd_extraviada + 1')
  })

  it('lança erro quando distribuição não é encontrada', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // distribuição não existe
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarDevolucao({
      distribuicao_id: 'inexistente',
      status: 'devolvido',
      recebido_por: 'u1',
    })).rejects.toThrow('Distribuição não encontrada')
  })

  it('lança erro quando distribuição já foi finalizada', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ escola_id: 'e1', titulo_id: 't1', ano_letivo: '2026', status_atual: 'devolvido' }] }) // já devolvido
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarDevolucao({
      distribuicao_id: 'dist-4',
      status: 'devolvido',
      recebido_por: 'u1',
    })).rejects.toThrow('já foi finalizada')
  })
})
