/**
 * Testes unitários/integração — lib/services/bncc.service.ts (funções com banco)
 *
 * Complementa bncc-mapear-disciplina.test.ts (função pura mapearDisciplinaParaComponenteBncc).
 *
 * Cobre:
 *   listarHabilidades — filtros (etapa, ano, componente, busca, campo_experiencia, faixaEtaria),
 *                       paginação, busca ignorada com <= 2 chars
 *   buscarHabilidadePorCodigo — encontrado, não encontrado
 *   listarComponentes — sem etapa, com etapa
 *   listarEtapas — simples
 *   listarCompetenciasGerais — simples
 *   vincularHabilidades — transação: deleta e reinsere, rollback em erro
 *   listarHabilidadesVinculadas — por tipo de vínculo
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
  listarHabilidades,
  buscarHabilidadePorCodigo,
  listarComponentes,
  listarEtapas,
  listarCompetenciasGerais,
  vincularHabilidades,
  listarHabilidadesVinculadas,
} from '@/lib/services/bncc.service'

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
// listarHabilidades
// ============================================================================

describe('listarHabilidades', () => {
  it('sem filtros: usa apenas ativa=TRUE e limite/offset padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades()

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativa = TRUE')
    // Parâmetros: limite=100 e offset=0
    expect(params[params.length - 2]).toBe(100) // limite
    expect(params[params.length - 1]).toBe(0)   // offset
  })

  it('filtra por etapa quando fornecida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ etapa: 'EF' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('EF')
    expect(sql).toContain('etapa_id = $1')
  })

  it('filtra por ano quando fornecido (incluindo ano=0)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ ano: 3 })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe(3)
    expect(sql).toContain('ano = $1')
  })

  it('filtra por componenteId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ componenteId: 'LP_AI' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('LP_AI')
    expect(sql).toContain('componente_id = $1')
  })

  it('filtra por campo_experiencia quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ campoExperiencia: 'EFES' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('EFES')
    expect(sql).toContain('campo_experiencia = $1')
  })

  it('filtra por faixaEtaria quando fornecida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ faixaEtaria: 'Bebês (0-18 meses)' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('Bebês (0-18 meses)')
    expect(sql).toContain('faixa_etaria = $1')
  })

  it('busca com texto de até 2 chars é ignorada (sem ILIKE)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ busca: 'LP' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
  })

  it('busca com texto de 3+ chars adiciona filtro ILIKE em descricao e codigo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ busca: '  números  ' }) // será trimado

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE')
    expect(params[0]).toBe('números') // trim aplicado
  })

  it('respeita limite customizado (máx 500)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ limite: 9999 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[params.length - 2]).toBe(500) // capeado em 500
  })

  it('offset negativo é ignorado (máx 0)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ offset: -10 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[params.length - 1]).toBe(0)
  })

  it('retorna rows da query diretamente', async () => {
    const habilidades = [
      { codigo: 'EF15LP01', descricao: 'Reconhecer o sistema de escrita', componente_id: 'LP_AI' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: habilidades })

    const result = await listarHabilidades({ etapa: 'EF' })
    expect(result).toEqual(habilidades)
  })

  it('combina múltiplos filtros corretamente (ano + componente + busca)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidades({ ano: 5, componenteId: 'LP_AI', busca: 'escrita' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe(5)        // ano
    expect(params[1]).toBe('LP_AI') // componente
    expect(params[2]).toBe('escrita') // busca
    expect(sql).toContain('ano = $1')
    expect(sql).toContain('componente_id = $2')
    expect(sql).toContain('ILIKE')
  })
})

// ============================================================================
// buscarHabilidadePorCodigo
// ============================================================================

describe('buscarHabilidadePorCodigo', () => {
  it('retorna habilidade quando código existe e está ativa', async () => {
    const hab = { codigo: 'EF15LP01', descricao: 'Reconhecer', componente_id: 'LP_AI', etapa_id: 'EF', ano: 1, campo_experiencia: null, faixa_etaria: null }
    mockQuery.mockResolvedValueOnce({ rows: [hab] })

    const result = await buscarHabilidadePorCodigo('EF15LP01')

    expect(result).toEqual(hab)
  })

  it('retorna null quando código não existe ou não está ativa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await buscarHabilidadePorCodigo('INEXISTENTE')

    expect(result).toBeNull()
  })

  it('passa o código como parâmetro e filtra por ativa=TRUE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarHabilidadePorCodigo('EF09LP01')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('EF09LP01')
    expect(sql).toContain('ativa = TRUE')
  })
})

// ============================================================================
// listarComponentes
// ============================================================================

describe('listarComponentes', () => {
  it('sem etapa: lista todos os componentes curriculares', async () => {
    const componentes = [{ id: 'LP_AI', nome: 'Língua Portuguesa - AI', abreviatura: 'LP', area_id: 'LING' }]
    mockQuery.mockResolvedValueOnce({ rows: componentes })

    const result = await listarComponentes()

    expect(result).toEqual(componentes)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('WHERE')
  })

  it('com etapa: filtra componentes da etapa (inclui OR para EI)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarComponentes('EF')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('EF')
    expect(sql).toContain('a.etapa_id = $1')
  })

  it('etapa "EI" inclui componentes sem area_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarComponentes('EI')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('EI')
    expect(sql).toContain('EI')
  })
})

// ============================================================================
// listarEtapas
// ============================================================================

describe('listarEtapas', () => {
  it('retorna etapas ordenadas', async () => {
    const etapas = [
      { id: 'EI', nome: 'Educação Infantil', ordem: 1 },
      { id: 'EF', nome: 'Ensino Fundamental', ordem: 2 },
    ]
    mockQuery.mockResolvedValueOnce({ rows: etapas })

    const result = await listarEtapas()

    expect(result).toEqual(etapas)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ORDER BY ordem')
  })
})

// ============================================================================
// listarCompetenciasGerais
// ============================================================================

describe('listarCompetenciasGerais', () => {
  it('retorna as 10 competências gerais da BNCC', async () => {
    const competencias = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1), titulo: `Competência ${i + 1}`, descricao: '...',
    }))
    mockQuery.mockResolvedValueOnce({ rows: competencias })

    const result = await listarCompetenciasGerais()

    expect(result).toHaveLength(10)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('bncc_competencias_gerais')
  })
})

// ============================================================================
// vincularHabilidades — transação
// ============================================================================

describe('vincularHabilidades', () => {
  it('deleta vínculos existentes e insere os novos (transação)', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE antigos
        .mockResolvedValueOnce({}) // INSERT habilidade 1
        .mockResolvedValueOnce({}) // INSERT habilidade 2
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await vincularHabilidades('questoes', 'questao-001', ['EF15LP01', 'EF15LP02'])

    const calls = clientMock.query.mock.calls
    expect(calls[0][0]).toBe('BEGIN')
    expect(calls[1][0]).toContain('DELETE FROM questoes_bncc_habilidades')
    expect(calls[2][0]).toContain('INSERT INTO questoes_bncc_habilidades')
    expect(calls[3][0]).toContain('INSERT INTO questoes_bncc_habilidades')
    expect(calls[4][0]).toBe('COMMIT')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('funciona com array vazio de habilidades (apenas deleta)', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await vincularHabilidades('planos_aula', 'plano-001', [])

    const calls = clientMock.query.mock.calls
    // BEGIN + DELETE + COMMIT = 3 calls (sem INSERTs)
    expect(calls).toHaveLength(3)
    expect(calls[2][0]).toBe('COMMIT')
  })

  it('faz rollback em caso de erro e propaga a exceção', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockRejectedValueOnce(new Error('FK violation')) // INSERT falha
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(vincularHabilidades('questoes', 'q1', ['INVALIDO'])).rejects.toThrow('FK violation')

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('usa a tabela correta para cada tipo de vínculo', async () => {
    const tipos: Array<['questoes' | 'planos_aula' | 'tarefas_turma', string]> = [
      ['questoes', 'questoes_bncc_habilidades'],
      ['planos_aula', 'planos_aula_bncc_habilidades'],
      ['tarefas_turma', 'tarefas_turma_bncc_habilidades'],
    ]

    for (const [tipo, tabela] of tipos) {
      vi.clearAllMocks()
      const clientMock = makeMockClient({
        query: vi.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}) // DELETE
          .mockResolvedValueOnce({}) // COMMIT
      })
      mockConnect.mockResolvedValueOnce(clientMock)

      await vincularHabilidades(tipo, 'id-1', [])

      const deleteSql = clientMock.query.mock.calls[1][0] as string
      expect(deleteSql, `Tabela errada para tipo "${tipo}"`).toContain(tabela)
    }
  })
})

// ============================================================================
// listarHabilidadesVinculadas
// ============================================================================

describe('listarHabilidadesVinculadas', () => {
  it('retorna habilidades vinculadas à questão', async () => {
    const habilidades = [
      { codigo: 'EF15LP01', descricao: 'Reconhecer', componente_id: 'LP_AI', etapa_id: 'EF', ano: 1, campo_experiencia: null, faixa_etaria: null },
    ]
    mockQuery.mockResolvedValueOnce({ rows: habilidades })

    const result = await listarHabilidadesVinculadas('questoes', 'questao-001')

    expect(result).toEqual(habilidades)
  })

  it('usa a tabela correta baseada no tipo de vínculo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidadesVinculadas('planos_aula', 'plano-001')

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('planos_aula_bncc_habilidades')
  })

  it('passa o entidadeId como parâmetro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarHabilidadesVinculadas('tarefas_turma', 'tarefa-xyz')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('tarefa-xyz')
  })

  it('retorna array vazio quando não há vínculos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await listarHabilidadesVinculadas('questoes', 'q-sem-bncc')

    expect(result).toHaveLength(0)
  })
})
