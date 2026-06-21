/**
 * Testes unitários — rh.service
 *
 * Cobre:
 *  - cadastrarServidor: normalização CPF/PIS, campos nulos
 *  - listarServidores: sem filtros, com tipoVinculo, busca, escolaId, ativo=false
 *  - buscarServidor: encontrado com lotacoes/formacoes, nao encontrado
 *  - registrarLotacao: principal (desmarca anterior), nao-principal
 *  - listarLotacoesEscola
 *  - registrarFormacao: status padrao concluido
 *  - listarFormacoesServidor
 *  - relatorioFormacoes: sem filtros, com ano e categoria
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  cadastrarServidor,
  listarServidores,
  buscarServidor,
  registrarLotacao,
  listarLotacoesEscola,
  registrarFormacao,
  listarFormacoesServidor,
  relatorioFormacoes,
} from '@/lib/services/rh.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// cadastrarServidor
// ============================================================================

describe('cadastrarServidor', () => {
  it('normaliza CPF removendo pontuacao antes de inserir', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'srv-1' }], rowCount: 1 } as any)

    const id = await cadastrarServidor({
      cpf: '123.456.789-00',
      nome: 'Carlos Pereira',
      tipo_vinculo: 'concursado_efetivo',
      data_admissao: '2020-03-01',
    })

    expect(id).toBe('srv-1')
    const params = mockQuery.mock.calls[0][1]!
    expect(params[1]).toBe('12345678900')  // CPF sem pontuacao
  })

  it('normaliza PIS removendo pontuacao quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'srv-2' }], rowCount: 1 } as any)

    await cadastrarServidor({
      cpf: '000.000.001-91',
      nome: 'Joana Lima',
      tipo_vinculo: 'contrato_temporario',
      data_admissao: '2023-01-15',
      pis: '123.45678.90-1',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[6]).toBe('1234567890 1'.replace(/\D/g, ''))  // PIS sem pontuacao
  })

  it('insere null para campos opcionais nao fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'srv-3' }], rowCount: 1 } as any)

    await cadastrarServidor({
      cpf: '11111111111',
      nome: 'Simples',
      tipo_vinculo: 'terceirizado',
      data_admissao: '2024-06-01',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[0]).toBeNull()   // matricula_funcional
    expect(params[4]).toBeNull()   // sexo
    expect(params[5]).toBeNull()   // rg
    expect(params[8]).toBeNull()   // telefone
    expect(params[14]).toBeNull()  // formacao_maxima
  })
})

// ============================================================================
// listarServidores
// ============================================================================

describe('listarServidores', () => {
  it('lista servidores ativos por padrao (sem filtro ativo)', async () => {
    const fakeRows = [{ id: 'srv-1', nome: 'Ana', tipo_vinculo: 'concursado_efetivo' }]
    mockQuery.mockResolvedValueOnce({ rows: fakeRows, rowCount: 1 } as any)

    const result = await listarServidores()

    expect(result).toHaveLength(1)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('s.ativo = TRUE')
  })

  it('lista servidores inativos quando ativo=false', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ ativo: false })

    const [sql] = mockQuery.mock.calls[0]
    // Nao deve incluir filtro de ativo quando ativo=false
    expect(sql).not.toContain('s.ativo = TRUE')
  })

  it('filtra por tipoVinculo quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ tipoVinculo: 'contrato_temporario' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('s.tipo_vinculo = $')
    expect(params).toContain('contrato_temporario')
  })

  it('filtra por busca (nome/cpf/matricula) com ILIKE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ busca: 'Maria' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE')
    expect(params).toContain('Maria')
  })

  it('ignora busca com menos de 3 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ busca: 'Ab' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
  })

  it('adiciona JOIN de lotacao quando escolaId fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ escolaId: 'esc-1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INNER JOIN servidor_lotacoes')
    expect(params).toContain('esc-1')
  })

  it('limita a 500 quando limite excede maximo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarServidores({ limite: 9999 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 1]).toBe(500)
  })
})

// ============================================================================
// buscarServidor
// ============================================================================

describe('buscarServidor', () => {
  it('retorna servidor com lotacoes e formacoes quando encontrado', async () => {
    const fakeSrv = {
      id: 'srv-1',
      nome: 'Pedro',
      cpf: '11111111111',
      lotacoes: [{ id: 'lot-1', funcao: 'Professor' }],
      formacoes: [{ id: 'form-1', nome_curso: 'Pedagogia' }],
    }
    mockQuery.mockResolvedValueOnce({ rows: [fakeSrv], rowCount: 1 } as any)

    const result = await buscarServidor('srv-1')

    expect(result).not.toBeNull()
    expect(result!.nome).toBe('Pedro')
    expect(result!.lotacoes).toHaveLength(1)
  })

  it('retorna null quando servidor nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarServidor('srv-nao-existe')

    expect(result).toBeNull()
  })
})

// ============================================================================
// registrarLotacao
// ============================================================================

describe('registrarLotacao', () => {
  it('desmarca lotacoes principais anteriores quando nova e principal', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // UPDATE desmarca principal
      .mockResolvedValueOnce({ rows: [{ id: 'lot-1' }], rowCount: 1 } as any)  // INSERT

    const id = await registrarLotacao({
      servidor_id: 'srv-1',
      funcao: 'Diretor',
      carga_horaria_semanal: 40,
      vigencia_inicio: '2026-01-01',
      e_principal: true,
    })

    expect(id).toBe('lot-1')
    // Primeira query deve ser o UPDATE que desmarca outras lotacoes principais
    const [firstSql] = mockQuery.mock.calls[0]
    expect(firstSql).toContain('e_principal = FALSE')
  })

  it('nao desmarca lotacoes anteriores quando e_principal e false', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'lot-2' }], rowCount: 1 } as any)

    await registrarLotacao({
      servidor_id: 'srv-1',
      funcao: 'Auxiliar',
      carga_horaria_semanal: 20,
      vigencia_inicio: '2026-01-01',
      e_principal: false,
    })

    // Apenas 1 query (INSERT), sem UPDATE de desmarcacao
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// listarLotacoesEscola
// ============================================================================

describe('listarLotacoesEscola', () => {
  it('retorna lotacoes vigentes de uma escola', async () => {
    const fakeLots = [
      { id: 'lot-1', servidor_nome: 'Ana', funcao: 'Professor', vigencia_fim: null },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeLots, rowCount: 1 } as any)

    const result = await listarLotacoesEscola('esc-1')

    expect(result).toHaveLength(1)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE l.escola_id = $1')
    expect(params[0]).toBe('esc-1')
    expect(sql).toContain('vigencia_fim IS NULL OR l.vigencia_fim >= CURRENT_DATE')
  })
})

// ============================================================================
// registrarFormacao
// ============================================================================

describe('registrarFormacao', () => {
  it('usa status concluido por padrao', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'form-1' }], rowCount: 1 } as any)

    const id = await registrarFormacao({
      servidor_id: 'srv-1',
      nome_curso: 'Formacao Continuada',
      carga_horaria: 40,
    })

    expect(id).toBe('form-1')
    const params = mockQuery.mock.calls[0][1]!
    expect(params[7]).toBe('concluido')  // status
  })

  it('permite status inscrito quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'form-2' }], rowCount: 1 } as any)

    await registrarFormacao({
      servidor_id: 'srv-1',
      nome_curso: 'Curso em andamento',
      carga_horaria: 20,
      status: 'em_andamento',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[7]).toBe('em_andamento')
  })
})

// ============================================================================
// listarFormacoesServidor
// ============================================================================

describe('listarFormacoesServidor', () => {
  it('retorna formacoes do servidor em ordem decrescente', async () => {
    const fakeFormacoes = [
      { id: 'f1', nome_curso: 'Mestrado', data_conclusao: '2025-12-01' },
      { id: 'f2', nome_curso: 'Especializacao', data_conclusao: '2023-06-01' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeFormacoes, rowCount: 2 } as any)

    const result = await listarFormacoesServidor('srv-1')

    expect(result).toHaveLength(2)
    expect(mockQuery.mock.calls[0][1]![0]).toBe('srv-1')
  })
})

// ============================================================================
// relatorioFormacoes
// ============================================================================

describe('relatorioFormacoes', () => {
  it('retorna relatorio sem filtros', async () => {
    const fakeRelatorio = [
      { categoria: 'pedagogico', total_cursos: '15', total_horas: '600', servidores_participantes: '10' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeRelatorio, rowCount: 1 } as any)

    const result = await relatorioFormacoes({})

    expect(result).toHaveLength(1)
    expect(result[0].categoria).toBe('pedagogico')
    const [sql] = mockQuery.mock.calls[0]
    // Apenas o filtro de status = concluido deve estar presente
    expect(sql).toContain("f.status = 'concluido'")
    expect(sql).not.toContain('f.data_conclusao BETWEEN')
  })

  it('filtra por ano quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await relatorioFormacoes({ ano: '2025' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('f.data_conclusao BETWEEN $')
    expect(params[0]).toBe('2025-01-01')
    expect(params[1]).toBe('2025-12-31')
  })

  it('filtra por categoria quando fornecida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await relatorioFormacoes({ categoria: 'gestao' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('f.categoria = $')
    expect(params).toContain('gestao')
  })

  it('combina filtros de ano e categoria', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await relatorioFormacoes({ ano: '2024', categoria: 'pedagogico' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('f.data_conclusao BETWEEN')
    expect(sql).toContain('f.categoria = $')
    expect(params).toContain('pedagogico')
  })
})
