/**
 * Testes unitários/integração — lib/services/ficai/casos.ts
 *
 * Cobre:
 *   abrirCaso — caminho feliz, caso já aberto (retorna false), parâmetros
 *   atualizarStatus — transição válida, inválida, timestamps específicos por status
 *   registrarAcao — caminho feliz
 *   listarCasos — filtros (escolaId, escolaIds, status, apenasAbertos, paginação)
 *   buscarCaso — com ações, não encontrado
 *   obterEstatisticas — cálculo de totais, escopo por escola
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// Mock do serviço de auditoria para não precisar de banco
vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

import pool from '@/database/connection'
import {
  abrirCaso,
  atualizarStatus,
  registrarAcao,
  listarCasos,
  buscarCaso,
  obterEstatisticas,
} from '@/lib/services/ficai/casos'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// abrirCaso
// ============================================================================

describe('abrirCaso', () => {
  it('retorna false quando já existe caso aberto para o aluno no ano', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // já existe

    const result = await abrirCaso({
      aluno_id: 'aluno-1',
      escola_id: 'escola-1',
      ano_letivo: '2026',
      origem: 'sistema',
      motivo: 'ausencia_consecutiva',
    })

    expect(result).toBe(false)
    // Deve ter chamado apenas 1 query (a verificação), não o INSERT
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('abre caso e retorna true quando não há caso aberto', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // não existe
      .mockResolvedValueOnce({ rows: [] }) // INSERT

    const result = await abrirCaso({
      aluno_id: 'aluno-2',
      escola_id: 'escola-2',
      ano_letivo: '2026',
      origem: 'manual_escola',
      motivo: 'infrequencia_50',
    })

    expect(result).toBe(true)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('passa STATUS_ABERTOS como parâmetro da query de verificação', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await abrirCaso({
      aluno_id: 'a1',
      escola_id: 'e1',
      ano_letivo: '2026',
      origem: 'sistema',
      motivo: 'abandono_suspeito',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('a1')       // aluno_id
    expect(params[1]).toBe('2026')     // ano_letivo
    expect(Array.isArray(params[2])).toBe(true) // STATUS_ABERTOS
  })

  it('inclui faltas_consecutivas no INSERT quando fornecida', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await abrirCaso({
      aluno_id: 'a1',
      escola_id: 'e1',
      ano_letivo: '2026',
      origem: 'sistema',
      motivo: 'ausencia_consecutiva',
      faltas_consecutivas: 7,
    })

    const [, params] = mockQuery.mock.calls[1]
    expect(params[6]).toBe(7) // faltas_consecutivas
  })

  it('inclui pct_faltas_mes no INSERT quando fornecida', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await abrirCaso({
      aluno_id: 'a1',
      escola_id: 'e1',
      ano_letivo: '2026',
      origem: 'sistema',
      motivo: 'infrequencia_50',
      pct_faltas_mes: 62.5,
    })

    const [, params] = mockQuery.mock.calls[1]
    expect(params[7]).toBe(62.5) // pct_faltas_mes
  })
})

// ============================================================================
// atualizarStatus
// ============================================================================

describe('atualizarStatus', () => {
  it('retorna false quando o caso não existe no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // caso não encontrado

    const result = await atualizarStatus({
      casoId: 'caso-inexistente',
      novoStatus: 'contato_responsavel',
      usuarioId: 'user-1',
    })

    expect(result).toBe(false)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('lança erro em transição inválida (pulo ilegal)', async () => {
    // Status atual: aberto → novoStatus: encaminhado_conselho_tutelar (inválido)
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'aberto' }] })

    await expect(atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'encaminhado_conselho_tutelar',
      usuarioId: 'user-1',
    })).rejects.toThrow('Transição inválida')
  })

  it('atualiza status em transição válida e retorna true', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'aberto' }] }) // busca status atual
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // INSERT acao
      // registrarAuditoria é mockada separadamente
    ;

    const result = await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'contato_responsavel',
      usuarioId: 'user-1',
    })

    expect(result).toBe(true)
  })

  it('adiciona contato_responsavel_em quando status é contato_responsavel', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'aberto' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rows: [] })

    await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'contato_responsavel',
      usuarioId: 'user-1',
    })

    const [sql] = mockQuery.mock.calls[1] // UPDATE
    expect(sql).toContain('contato_responsavel_em = NOW()')
  })

  it('adiciona encaminhado_em quando status começa com "encaminhado"', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'contato_responsavel' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rows: [] })

    await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'encaminhado_conselho_tutelar',
      usuarioId: 'user-1',
    })

    const [sql] = mockQuery.mock.calls[1]
    expect(sql).toContain('encaminhado_em = NOW()')
  })

  it('adiciona concluido_em quando status começa com "concluido"', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'contato_responsavel' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rows: [] })

    await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'concluido_resolvido',
      usuarioId: 'user-1',
    })

    const [sql] = mockQuery.mock.calls[1]
    expect(sql).toContain('concluido_em = NOW()')
  })

  it('adiciona concluido_em quando status é "cancelado"', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'aberto' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rows: [] })

    await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'cancelado',
      usuarioId: 'user-1',
    })

    const [sql] = mockQuery.mock.calls[1]
    expect(sql).toContain('concluido_em = NOW()')
  })

  it('inclui observação na ação registrada quando fornecida', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'aberto' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rows: [] })

    await atualizarStatus({
      casoId: 'caso-1',
      novoStatus: 'contato_responsavel',
      usuarioId: 'user-1',
      observacao: 'Mãe compareceu à escola',
    })

    // Verifica que a observação está na ação inserida (3ª query = INSERT ficai_acoes)
    const [, params] = mockQuery.mock.calls[2]
    expect(String(params[1])).toContain('Mãe compareceu à escola')
  })
})

// ============================================================================
// registrarAcao
// ============================================================================

describe('registrarAcao', () => {
  it('retorna o id da ação registrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'acao-001' }] })

    const id = await registrarAcao({
      caso_id: 'caso-1',
      tipo: 'visita_domiciliar',
      descricao: 'Visitou a residência do aluno',
      realizado_por: 'user-1',
    })

    expect(id).toBe('acao-001')
  })

  it('anexo_url é null quando não fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1' }] })

    await registrarAcao({
      caso_id: 'c1',
      tipo: 'ligacao',
      descricao: 'Ligou para responsável',
      realizado_por: 'u1',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[3]).toBeNull() // anexo_url
  })
})

// ============================================================================
// listarCasos
// ============================================================================

describe('listarCasos', () => {
  it('sem filtros: retorna todos os casos com paginação padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({})

    const [sql, params] = mockQuery.mock.calls[0]
    // Sem WHERE específico (só o WHERE vazio)
    expect(sql).not.toContain('f.escola_id = $')
    // Parâmetros de paginação no final
    expect(params[params.length - 2]).toBe(50)  // limite padrão
    expect(params[params.length - 1]).toBe(0)   // offset padrão
  })

  it('filtra por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ escolaId: 'escola-abc' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-abc')
    expect(sql).toContain('f.escola_id = $')
  })

  it('filtra por conjunto de escolas (polo) quando escolaIds é fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ escolaIds: ['e1', 'e2', 'e3'] })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toEqual(['e1', 'e2', 'e3'])
    expect(sql).toContain('ANY(')
  })

  it('filtra por status específico', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ status: 'aberto' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('aberto')
    expect(sql).toContain('f.status = $')
  })

  it('filtra apenas abertos quando apenasAbertos=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ apenasAbertos: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ANY(')
  })

  it('limita o máximo de registros a 500', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ limite: 9999 })

    const [, params] = mockQuery.mock.calls[0]
    // limite capeado em 500
    expect(params[params.length - 2]).toBe(500)
  })

  it('aplica offset corretamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarCasos({ offset: 100 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[params.length - 1]).toBe(100)
  })
})

// ============================================================================
// buscarCaso
// ============================================================================

describe('buscarCaso', () => {
  it('retorna null quando o caso não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await buscarCaso('caso-inexistente')

    expect(result).toBeNull()
    // Não deve buscar ações se o caso não existe
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('retorna caso com ações da timeline', async () => {
    const casoMock = { id: 'caso-1', aluno_nome: 'Pedro', status: 'aberto' }
    const acoesMock = [
      { id: 'a1', tipo: 'ligacao', realizado_por_nome: 'Ana' },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: [casoMock] }) // caso
      .mockResolvedValueOnce({ rows: acoesMock })  // ações

    const result = await buscarCaso('caso-1')

    expect(result).toBeDefined()
    expect(result!.id).toBe('caso-1')
    expect(result!.acoes).toHaveLength(1)
    expect(result!.acoes[0].tipo).toBe('ligacao')
  })
})

// ============================================================================
// obterEstatisticas
// ============================================================================

describe('obterEstatisticas', () => {
  it('calcula total geral somando todos os status', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { status: 'aberto', total: '10' },
        { status: 'concluido_resolvido', total: '5' },
        { status: 'cancelado', total: '2' },
      ],
    })

    const result = await obterEstatisticas('2026')

    expect(result.total).toBe(17)
  })

  it('conta abertos somando todos os STATUS_ABERTOS (inclui aluno_retornou)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { status: 'aberto', total: '8' },
        { status: 'contato_responsavel', total: '3' },
        { status: 'aluno_retornou', total: '2' },
        { status: 'concluido_resolvido', total: '5' },
      ],
    })

    const result = await obterEstatisticas('2026')

    // Abertos inclui aluno_retornou (ainda em STATUS_ABERTOS): 8 + 3 + 2 = 13
    expect(result.abertos).toBe(13)
    // resolvidos = concluido_resolvido(5) + aluno_retornou(2) = 7
    expect(result.resolvidos).toBe(7)
  })

  it('conta evasao_confirmada corretamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { status: 'concluido_evasao_confirmada', total: '3' },
        { status: 'aberto', total: '5' },
      ],
    })

    const result = await obterEstatisticas('2026')

    expect(result.evasao_confirmada).toBe(3)
  })

  it('inclui por_status como mapa de status → quantidade', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { status: 'aberto', total: '7' },
        { status: 'cancelado', total: '1' },
      ],
    })

    const result = await obterEstatisticas('2026')

    expect(result.por_status['aberto']).toBe(7)
    expect(result.por_status['cancelado']).toBe(1)
  })

  it('filtra por escolaId quando passado como scope', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await obterEstatisticas('2026', { escolaId: 'escola-xyz' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-xyz')
    expect(sql).toContain('escola_id = $2')
  })

  it('filtra por escolaIds quando passado array no scope', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await obterEstatisticas('2026', { escolaIds: ['e1', 'e2'] })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[1]).toEqual(['e1', 'e2'])
    expect(sql).toContain('ANY(')
  })

  it('retorna zeros quando não há casos no ano', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await obterEstatisticas('2020')

    expect(result.total).toBe(0)
    expect(result.abertos).toBe(0)
    expect(result.resolvidos).toBe(0)
    expect(result.evasao_confirmada).toBe(0)
  })
})
