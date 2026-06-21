/**
 * Testes unitários/integração — lib/services/pnae.service.ts
 *
 * Cobre:
 *   FAIXA_LABEL / TIPO_REFEICAO_LABEL — integridade das constantes
 *   publicarCardapio — caminho feliz, rascunho não encontrado
 *   buscarCardapioSemana — caminho feliz, sem resultado
 *   registrarAtendimentoDiario — upsert correto, defaults
 *   resumoMensalAtendimentos — com e sem escola_id
 *   registrarRestricao — caminho feliz
 *   listarNutricionistas — com/sem inativas
 *   atualizarNutricionista — campos parciais, campos vazios → false
 *
 * Não cobre criarCardapio e cadastrarNutricionista (transações pool.connect —
 * cobertos apenas em parte via mocks de client).
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
  FAIXA_LABEL,
  TIPO_REFEICAO_LABEL,
  publicarCardapio,
  buscarCardapioSemana,
  registrarAtendimentoDiario,
  resumoMensalAtendimentos,
  registrarRestricao,
  listarNutricionistas,
  atualizarNutricionista,
  criarCardapio,
} from '@/lib/services/pnae.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>
const mockConnect = pool.connect as ReturnType<typeof vi.fn>

// Helper para criar mock de client de transação
function makeMockClient(overrides: { query?: ReturnType<typeof vi.fn> } = {}) {
  const q = overrides.query ?? vi.fn()
  return { query: q, release: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Constantes — integridade
// ============================================================================

describe('FAIXA_LABEL', () => {
  const FAIXAS = ['creche', 'pre_escola', 'fundamental', 'eja', 'integral'] as const

  it('tem rótulo para cada faixa etária', () => {
    for (const f of FAIXAS) {
      expect(FAIXA_LABEL[f]).toBeTruthy()
    }
  })

  it('creche menciona faixa 0-3', () => {
    expect(FAIXA_LABEL['creche']).toContain('0-3')
  })

  it('pre_escola menciona faixa 4-5', () => {
    expect(FAIXA_LABEL['pre_escola']).toContain('4-5')
  })
})

describe('TIPO_REFEICAO_LABEL', () => {
  const TIPOS = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const

  it('tem rótulo para cada tipo de refeição', () => {
    for (const t of TIPOS) {
      expect(TIPO_REFEICAO_LABEL[t]).toBeTruthy()
    }
  })
})

// ============================================================================
// publicarCardapio
// ============================================================================

describe('publicarCardapio', () => {
  it('retorna true quando cardápio em rascunho é publicado', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const ok = await publicarCardapio('cardapio-123')

    expect(ok).toBe(true)
  })

  it('retorna false quando cardápio não existe ou já está publicado', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })

    const ok = await publicarCardapio('cardapio-inexistente')

    expect(ok).toBe(false)
  })

  it('passa o id como parâmetro da query', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    await publicarCardapio('meu-id')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('meu-id')
  })

  it('filtra por status=rascunho na query (não publica cardápios já publicados)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })

    await publicarCardapio('qualquer')

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain("'rascunho'")
  })
})

// ============================================================================
// buscarCardapioSemana
// ============================================================================

describe('buscarCardapioSemana', () => {
  it('retorna cardápio quando encontrado', async () => {
    const cardapioMock = { id: 'c1', semana_inicio: '2026-06-01', refeicoes: [] }
    mockQuery.mockResolvedValueOnce({ rows: [cardapioMock] })

    const result = await buscarCardapioSemana({
      escola_id: 'escola-1',
      data_referencia: '2026-06-10',
      faixa_etaria: 'fundamental',
    })

    expect(result).toEqual(cardapioMock)
  })

  it('retorna null quando não existe cardápio para a data/escola/faixa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await buscarCardapioSemana({
      escola_id: 'escola-sem-cardapio',
      data_referencia: '2026-01-01',
      faixa_etaria: 'creche',
    })

    expect(result).toBeNull()
  })

  it('passa escola_id, faixa_etaria e data_referencia como parâmetros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarCardapioSemana({
      escola_id: 'escola-abc',
      data_referencia: '2026-06-15',
      faixa_etaria: 'eja',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-abc')
    expect(params[1]).toBe('eja')
    expect(params[2]).toBe('2026-06-15')
  })

  it('query prioriza cardápio da escola sobre cardápio municipal (NULLS LAST)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarCardapioSemana({
      escola_id: 'e1',
      data_referencia: '2026-06-10',
      faixa_etaria: 'pre_escola',
    })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('NULLS LAST')
  })
})

// ============================================================================
// registrarAtendimentoDiario
// ============================================================================

describe('registrarAtendimentoDiario', () => {
  it('retorna o id do atendimento registrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'atend-xyz' }] })

    const id = await registrarAtendimentoDiario({
      escola_id: 'escola-1',
      data_atendimento: '2026-06-10',
      faixa_etaria: 'fundamental',
      tipo_refeicao: 'almoco',
      qtd_alunos: 120,
      registrado_por: 'user-1',
    })

    expect(id).toBe('atend-xyz')
  })

  it('usa qtd_extra=0 quando não fornecido (default)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1' }] })

    await registrarAtendimentoDiario({
      escola_id: 'escola-1',
      data_atendimento: '2026-06-10',
      faixa_etaria: 'creche',
      tipo_refeicao: 'cafe_manha',
      qtd_alunos: 50,
      registrado_por: 'user-1',
    })

    const [, params] = mockQuery.mock.calls[0]
    // qtd_extra é o 6º parâmetro ($6)
    expect(params[5]).toBe(0)
  })

  it('usa qtd_extra quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a2' }] })

    await registrarAtendimentoDiario({
      escola_id: 'escola-1',
      data_atendimento: '2026-06-10',
      faixa_etaria: 'fundamental',
      tipo_refeicao: 'lanche_tarde',
      qtd_alunos: 100,
      qtd_extra: 5,
      registrado_por: 'user-1',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toBe(5)
  })

  it('usa ON CONFLICT para atualizar se já existe registro do dia', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a3' }] })

    await registrarAtendimentoDiario({
      escola_id: 'e1',
      data_atendimento: '2026-06-11',
      faixa_etaria: 'eja',
      tipo_refeicao: 'jantar',
      qtd_alunos: 30,
      registrado_por: 'u1',
    })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('DO UPDATE')
  })
})

// ============================================================================
// resumoMensalAtendimentos
// ============================================================================

describe('resumoMensalAtendimentos', () => {
  it('sem escola_id: busca dados de todo o município', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await resumoMensalAtendimentos({ ano: 2026, mes: 6 })

    const [sql, params] = mockQuery.mock.calls[0]
    // Apenas 2 parâmetros: ano e mes
    expect(params).toHaveLength(2)
    expect(params[0]).toBe(2026)
    expect(params[1]).toBe(6)
    // SQL não deve ter cláusula de escola_id
    expect(sql).not.toContain('escola_id = $3')
  })

  it('com escola_id: adiciona filtro por escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await resumoMensalAtendimentos({ escola_id: 'escola-abc', ano: 2026, mes: 3 })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(3)
    expect(params[2]).toBe('escola-abc')
    expect(sql).toContain('escola_id = $3')
  })

  it('retorna rows agrupados por faixa_etaria e tipo_refeicao', async () => {
    const rows = [
      { faixa_etaria: 'fundamental', tipo_refeicao: 'almoco', total_alunos: '500' },
      { faixa_etaria: 'creche', tipo_refeicao: 'cafe_manha', total_alunos: '80' },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const result = await resumoMensalAtendimentos({ ano: 2026, mes: 6 })

    expect(result).toHaveLength(2)
    expect(result[0].faixa_etaria).toBe('fundamental')
  })
})

// ============================================================================
// registrarRestricao
// ============================================================================

describe('registrarRestricao', () => {
  it('retorna o id da restrição cadastrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rest-001' }] })

    const id = await registrarRestricao({
      aluno_id: 'aluno-1',
      tipo_restricao: 'alergia',
      descricao: 'Alergia a amendoim',
      registrada_por: 'enfermeira-1',
    })

    expect(id).toBe('rest-001')
  })

  it('laudo_url é null quando não fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'r2' }] })

    await registrarRestricao({
      aluno_id: 'a1',
      tipo_restricao: 'intolerancia',
      descricao: 'Intolerância à lactose',
      registrada_por: 'user-1',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[3]).toBeNull() // laudo_url
  })

  it('laudo_url é incluído quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'r3' }] })

    await registrarRestricao({
      aluno_id: 'a1',
      tipo_restricao: 'celiaco',
      descricao: 'Doença celíaca com laudo',
      laudo_url: 'https://docs.example.com/laudo.pdf',
      registrada_por: 'user-1',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[3]).toBe('https://docs.example.com/laudo.pdf')
  })
})

// ============================================================================
// listarNutricionistas
// ============================================================================

describe('listarNutricionistas', () => {
  it('por padrão filtra apenas nutricionistas ativas (ativa = TRUE)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarNutricionistas()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE ativa = TRUE')
  })

  it('incluirInativas=true remove o filtro WHERE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarNutricionistas(true)

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('WHERE ativa = TRUE')
  })

  it('ordena por responsável técnico primeiro, depois por nome', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarNutricionistas()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('responsavel_tecnico DESC, nome')
  })
})

// ============================================================================
// atualizarNutricionista
// ============================================================================

describe('atualizarNutricionista', () => {
  it('retorna false imediatamente quando nenhum campo é fornecido', async () => {
    const ok = await atualizarNutricionista('id-1', {})

    // Não deve nem chamar o banco
    expect(mockQuery).not.toHaveBeenCalled()
    expect(ok).toBe(false)
  })

  it('atualiza apenas o campo nome quando somente ele é fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const ok = await atualizarNutricionista('id-1', { nome: 'Dra. Ana' })

    expect(ok).toBe(true)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('nome = $1')
    expect(params[0]).toBe('Dra. Ana')
    expect(params[params.length - 1]).toBe('id-1') // id sempre é o último parâmetro
  })

  it('atualiza múltiplos campos de uma vez', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    await atualizarNutricionista('id-2', {
      nome: 'Dra. Paula',
      email: 'paula@escola.br',
      responsavel_tecnico: true,
    })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('nome = $1')
    expect(sql).toContain('email = $')
    expect(sql).toContain('responsavel_tecnico = $')
  })

  it('atualiza campo ativa (inativar nutricionista)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    await atualizarNutricionista('id-3', { ativa: false })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativa = $1')
    expect(params[0]).toBe(false)
  })

  it('retorna false quando nutricionista não encontrada (rowCount=0)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })

    const ok = await atualizarNutricionista('inexistente', { nome: 'Teste' })

    expect(ok).toBe(false)
  })

  it('permite setar email para null (campo nullable)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    await atualizarNutricionista('id-4', { email: null })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('email = $1')
    expect(params[0]).toBeNull()
  })
})

// ============================================================================
// criarCardapio — transação com pool.connect
// ============================================================================

describe('criarCardapio', () => {
  it('retorna o id do cardápio criado após transação bem-sucedida', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cardapio-novo' }] }) // INSERT cardapio
        .mockResolvedValueOnce({}) // INSERT refeição 1
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({}) // release não é query mas fica aqui p/ clareza
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    const id = await criarCardapio({
      escola_id: 'escola-1',
      semana_inicio: '2026-06-01',
      semana_fim: '2026-06-07',
      faixa_etaria: 'fundamental',
      refeicoes: [{
        dia_semana: 1,
        tipo: 'almoco',
        descricao: 'Arroz, feijão e frango',
      }],
    })

    expect(id).toBe('cardapio-novo')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('faz rollback quando ocorre erro durante inserção das refeições', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'c1' }] }) // INSERT cardapio
        .mockRejectedValueOnce(new Error('violação de FK')) // INSERT refeição falha
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(criarCardapio({
      escola_id: 'escola-1',
      semana_inicio: '2026-06-01',
      semana_fim: '2026-06-07',
      faixa_etaria: 'creche',
      refeicoes: [{ dia_semana: 1, tipo: 'cafe_manha', descricao: 'Mingau' }],
    })).rejects.toThrow('violação de FK')

    // Verifica que ROLLBACK foi chamado
    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })
})
