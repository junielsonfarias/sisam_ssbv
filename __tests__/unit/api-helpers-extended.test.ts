import { describe, it, expect } from 'vitest'
import {
  parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  createWhereBuilder, addCondition, addSearchCondition, addAccessControl,
  addRawCondition, addInCondition,
  buildWhereString, buildConditionsString,
  parseSearchParams, parseIntParam, parseBoolParam,
  buildOrderBy,
} from '@/lib/api-helpers'
import type { Usuario } from '@/lib/types'

// ============================================================================
// PAGINACAO
// ============================================================================

describe('parsePaginacao', () => {
  it('retorna valores padrao (pagina=1, limite=50)', () => {
    const params = new URLSearchParams()
    const result = parsePaginacao(params)
    expect(result.pagina).toBe(1)
    expect(result.limite).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('calcula offset corretamente (pagina=3, limite=20 -> offset=40)', () => {
    const params = new URLSearchParams({ pagina: '3', limite: '20' })
    const result = parsePaginacao(params)
    expect(result.pagina).toBe(3)
    expect(result.limite).toBe(20)
    expect(result.offset).toBe(40)
  })

  it('aplica limiteMax quando limite excede (999 -> 100)', () => {
    const params = new URLSearchParams({ limite: '999' })
    const result = parsePaginacao(params, { limiteMax: 100 })
    expect(result.limite).toBe(100)
  })

  it('trata pagina negativa como 1', () => {
    const params = new URLSearchParams({ pagina: '-5' })
    const result = parsePaginacao(params)
    expect(result.pagina).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('trata pagina zero como 1', () => {
    const params = new URLSearchParams({ pagina: '0' })
    const result = parsePaginacao(params)
    expect(result.pagina).toBe(1)
  })

  it('trata limite negativo como 1', () => {
    const params = new URLSearchParams({ limite: '-10' })
    const result = parsePaginacao(params)
    expect(result.limite).toBeGreaterThanOrEqual(1)
  })

  it('aceita limitePadrao customizado', () => {
    const params = new URLSearchParams()
    const result = parsePaginacao(params, { limitePadrao: 25 })
    expect(result.limite).toBe(25)
  })

  it('aceita campos customizados (page/size)', () => {
    const params = new URLSearchParams({ page: '2', size: '15' })
    const result = parsePaginacao(params, { camposPagina: 'page', camposLimite: 'size' })
    expect(result.pagina).toBe(2)
    expect(result.limite).toBe(15)
    expect(result.offset).toBe(15)
  })

  it('trata valor nao-numerico como padrao', () => {
    const params = new URLSearchParams({ pagina: 'abc', limite: 'xyz' })
    const result = parsePaginacao(params)
    expect(result.pagina).toBe(1)
    expect(result.limite).toBe(50)
  })
})

describe('buildPaginacaoResponse', () => {
  it('calcula corretamente para pagina intermediaria', () => {
    const paginacao = { pagina: 2, limite: 10, offset: 10 }
    const result = buildPaginacaoResponse(paginacao, 100)
    expect(result.totalPaginas).toBe(10)
    expect(result.temProxima).toBe(true)
    expect(result.temAnterior).toBe(true)
    expect(result.total).toBe(100)
  })

  it('retorna temProxima=false e temAnterior=false para pagina unica', () => {
    const paginacao = { pagina: 1, limite: 10, offset: 0 }
    const result = buildPaginacaoResponse(paginacao, 5)
    expect(result.totalPaginas).toBe(1)
    expect(result.temProxima).toBe(false)
    expect(result.temAnterior).toBe(false)
  })

  it('retorna temProxima=false na ultima pagina', () => {
    const paginacao = { pagina: 5, limite: 10, offset: 40 }
    const result = buildPaginacaoResponse(paginacao, 50)
    expect(result.temProxima).toBe(false)
    expect(result.temAnterior).toBe(true)
  })

  it('retorna temAnterior=false na primeira pagina', () => {
    const paginacao = { pagina: 1, limite: 10, offset: 0 }
    const result = buildPaginacaoResponse(paginacao, 50)
    expect(result.temProxima).toBe(true)
    expect(result.temAnterior).toBe(false)
  })

  it('trata total=0 corretamente', () => {
    const paginacao = { pagina: 1, limite: 10, offset: 0 }
    const result = buildPaginacaoResponse(paginacao, 0)
    expect(result.totalPaginas).toBe(0)
    expect(result.temProxima).toBe(false)
    expect(result.temAnterior).toBe(false)
  })
})

describe('buildLimitOffset', () => {
  it('gera SQL correto', () => {
    const result = buildLimitOffset({ pagina: 2, limite: 20, offset: 20 })
    expect(result).toBe('LIMIT 20 OFFSET 20')
  })
})

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

describe('createWhereBuilder', () => {
  it('cria builder vazio com paramIndex=1 por padrao', () => {
    const builder = createWhereBuilder()
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
    expect(builder.paramIndex).toBe(1)
  })

  it('aceita startIndex customizado', () => {
    const builder = createWhereBuilder(5)
    expect(builder.paramIndex).toBe(5)
  })
})

describe('addCondition', () => {
  it('adiciona condicao e parametro quando valor existe', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', 'Joao')
    expect(builder.conditions).toEqual(['nome = $1'])
    expect(builder.params).toEqual(['Joao'])
    expect(builder.paramIndex).toBe(2)
  })

  it('ignora valor null', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', null)
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('ignora valor undefined', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', undefined)
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('ignora string vazia', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', '')
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('suporta operador customizado', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nota', 6, '>=')
    expect(builder.conditions).toEqual(['nota >= $1'])
    expect(builder.params).toEqual([6])
  })

  it('incrementa paramIndex para multiplas condicoes', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', 'Joao')
    addCondition(builder, 'ativo', true)
    addCondition(builder, 'nota', 8, '>')
    expect(builder.conditions).toEqual(['nome = $1', 'ativo = $2', 'nota > $3'])
    expect(builder.params).toEqual(['Joao', true, 8])
    expect(builder.paramIndex).toBe(4)
  })

  it('aceita valor booleano false', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'ativo', false)
    expect(builder.conditions).toEqual(['ativo = $1'])
    expect(builder.params).toEqual([false])
  })

  it('aceita valor numerico 0', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nota', 0)
    expect(builder.conditions).toEqual(['nota = $1'])
    expect(builder.params).toEqual([0])
  })
})

describe('addSearchCondition', () => {
  it('adiciona ILIKE com % para termo valido', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome', 'email'], 'Joao')
    expect(builder.conditions).toEqual(['(nome ILIKE $1 OR email ILIKE $1)'])
    expect(builder.params).toEqual(['%Joao%'])
    expect(builder.paramIndex).toBe(2)
  })

  it('ignora null', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome'], null)
    expect(builder.conditions).toEqual([])
  })

  it('ignora undefined', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome'], undefined)
    expect(builder.conditions).toEqual([])
  })

  it('ignora string vazia', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome'], '')
    expect(builder.conditions).toEqual([])
  })

  it('ignora string apenas com espacos', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome'], '   ')
    expect(builder.conditions).toEqual([])
  })

  it('faz trim do termo de busca', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['nome'], '  Maria  ')
    expect(builder.params).toEqual(['%Maria%'])
  })
})

describe('addInCondition', () => {
  it('adiciona IN com placeholders corretos', () => {
    const builder = createWhereBuilder()
    addInCondition(builder, 'status', ['a', 'b', 'c'])
    expect(builder.conditions).toEqual(['status IN ($1, $2, $3)'])
    expect(builder.params).toEqual(['a', 'b', 'c'])
    expect(builder.paramIndex).toBe(4)
  })

  it('ignora array vazio', () => {
    const builder = createWhereBuilder()
    addInCondition(builder, 'status', [])
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('funciona com array de numeros', () => {
    const builder = createWhereBuilder()
    addInCondition(builder, 'id', [1, 2, 3])
    expect(builder.conditions).toEqual(['id IN ($1, $2, $3)'])
    expect(builder.params).toEqual([1, 2, 3])
  })

  it('continua paramIndex de condicoes anteriores', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'ativo', true)
    addInCondition(builder, 'tipo', ['a', 'b'])
    expect(builder.conditions).toEqual(['ativo = $1', 'tipo IN ($2, $3)'])
    expect(builder.params).toEqual([true, 'a', 'b'])
    expect(builder.paramIndex).toBe(4)
  })
})

describe('addRawCondition', () => {
  it('adiciona SQL literal', () => {
    const builder = createWhereBuilder()
    addRawCondition(builder, 'created_at > NOW() - interval \'7 days\'')
    expect(builder.conditions).toEqual(["created_at > NOW() - interval '7 days'"])
    expect(builder.params).toEqual([])
  })

  it('adiciona SQL com valores parametrizados', () => {
    const builder = createWhereBuilder()
    addRawCondition(builder, 'nota BETWEEN $1 AND $2', [5, 10])
    expect(builder.conditions).toEqual(['nota BETWEEN $1 AND $2'])
    expect(builder.params).toEqual([5, 10])
    expect(builder.paramIndex).toBe(3)
  })
})

describe('buildWhereString', () => {
  it('retorna string vazia para builder sem condicoes', () => {
    const builder = createWhereBuilder()
    expect(buildWhereString(builder)).toBe('')
  })

  it('gera WHERE com condicoes AND', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nome', 'Joao')
    addCondition(builder, 'ativo', true)
    expect(buildWhereString(builder)).toBe('WHERE nome = $1 AND ativo = $2')
  })

  it('suporta prefixo customizado', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'ativo', true)
    expect(buildWhereString(builder, 'AND')).toBe('AND ativo = $1')
  })
})

describe('buildConditionsString', () => {
  it('retorna "1=1" para builder sem condicoes', () => {
    const builder = createWhereBuilder()
    expect(buildConditionsString(builder)).toBe('1=1')
  })

  it('retorna condicoes AND sem prefixo WHERE', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'a', 1)
    addCondition(builder, 'b', 2)
    expect(buildConditionsString(builder)).toBe('a = $1 AND b = $2')
  })
})

// ============================================================================
// CONTROLE DE ACESSO
// ============================================================================

describe('addAccessControl', () => {
  const makeUsuario = (overrides: Partial<Usuario>): Usuario => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Test',
    email: 'test@test.com',
    tipo_usuario: 'administrador',
    ativo: true,
    criado_em: new Date(),
    ...overrides,
  } as Usuario)

  it('adiciona filtro polo_id para usuario tipo polo', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'polo', polo_id: 'polo-uuid-123' })
    addAccessControl(builder, usuario)
    expect(builder.conditions).toEqual(['e.polo_id = $1'])
    expect(builder.params).toEqual(['polo-uuid-123'])
  })

  it('adiciona filtro escola_id para usuario tipo escola', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'escola', escola_id: 'escola-uuid-456' })
    addAccessControl(builder, usuario)
    expect(builder.conditions).toEqual(['e.id = $1'])
    expect(builder.params).toEqual(['escola-uuid-456'])
  })

  it('nao adiciona condicao para admin', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'administrador' })
    addAccessControl(builder, usuario)
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('nao adiciona condicao para tecnico', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'tecnico' })
    addAccessControl(builder, usuario)
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
  })

  it('usa alias customizado', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'polo', polo_id: 'p123' })
    addAccessControl(builder, usuario, { escolaAlias: 'esc' })
    expect(builder.conditions).toEqual(['esc.polo_id = $1'])
  })

  it('usa campos customizados', () => {
    const builder = createWhereBuilder()
    const usuario = makeUsuario({ tipo_usuario: 'escola', escola_id: 'e456' })
    addAccessControl(builder, usuario, { escolaIdField: 'escola.id' })
    expect(builder.conditions).toEqual(['escola.id = $1'])
  })
})

// ============================================================================
// PARSING DE SEARCH PARAMS
// ============================================================================

describe('parseSearchParams', () => {
  it('extrai multiplos parametros', () => {
    const params = new URLSearchParams({ nome: 'Joao', serie: '5' })
    const result = parseSearchParams(params, ['nome', 'serie', 'turma'])
    expect(result.nome).toBe('Joao')
    expect(result.serie).toBe('5')
    expect(result.turma).toBeNull()
  })
})

describe('parseIntParam', () => {
  it('retorna valor inteiro', () => {
    const params = new URLSearchParams({ page: '5' })
    expect(parseIntParam(params, 'page')).toBe(5)
  })

  it('retorna defaultValue para parametro ausente', () => {
    const params = new URLSearchParams()
    expect(parseIntParam(params, 'page', 1)).toBe(1)
  })

  it('retorna defaultValue para valor nao-numerico', () => {
    const params = new URLSearchParams({ page: 'abc' })
    expect(parseIntParam(params, 'page', 0)).toBe(0)
  })

  it('retorna 0 como defaultValue padrao', () => {
    const params = new URLSearchParams()
    expect(parseIntParam(params, 'missing')).toBe(0)
  })
})

describe('parseBoolParam', () => {
  it('retorna true para "true"', () => {
    const params = new URLSearchParams({ ativo: 'true' })
    expect(parseBoolParam(params, 'ativo')).toBe(true)
  })

  it('retorna true para "1"', () => {
    const params = new URLSearchParams({ ativo: '1' })
    expect(parseBoolParam(params, 'ativo')).toBe(true)
  })

  it('retorna true para "sim"', () => {
    const params = new URLSearchParams({ ativo: 'sim' })
    expect(parseBoolParam(params, 'ativo')).toBe(true)
  })

  it('retorna false para "false"', () => {
    const params = new URLSearchParams({ ativo: 'false' })
    expect(parseBoolParam(params, 'ativo')).toBe(false)
  })

  it('retorna false para valor arbitrario', () => {
    const params = new URLSearchParams({ ativo: 'maybe' })
    expect(parseBoolParam(params, 'ativo')).toBe(false)
  })

  it('retorna defaultValue quando parametro ausente', () => {
    const params = new URLSearchParams()
    expect(parseBoolParam(params, 'ativo')).toBe(false)
    expect(parseBoolParam(params, 'ativo', true)).toBe(true)
  })
})

// ============================================================================
// SQL HELPERS
// ============================================================================

describe('buildOrderBy', () => {
  const allowedFields = ['nome', 'criado_em', 'nota']

  it('usa campo valido fornecido', () => {
    const params = new URLSearchParams({ ordenar_por: 'nome' })
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY nome DESC')
  })

  it('usa campo padrao quando campo invalido', () => {
    const params = new URLSearchParams({ ordenar_por: 'hack' })
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY criado_em DESC')
  })

  it('usa campo padrao customizado quando campo invalido', () => {
    const params = new URLSearchParams({ ordenar_por: 'hack' })
    expect(buildOrderBy(params, allowedFields, 'nota')).toBe('ORDER BY nota DESC')
  })

  it('respeita direcao ASC', () => {
    const params = new URLSearchParams({ ordenar_por: 'nome', direcao: 'ASC' })
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY nome ASC')
  })

  it('respeita direcao DESC', () => {
    const params = new URLSearchParams({ ordenar_por: 'nome', direcao: 'DESC' })
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY nome DESC')
  })

  it('normaliza direcao invalida para DESC', () => {
    const params = new URLSearchParams({ ordenar_por: 'nome', direcao: 'INVALID' })
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY nome DESC')
  })

  it('usa defaultDir customizado', () => {
    const params = new URLSearchParams()
    expect(buildOrderBy(params, allowedFields, 'criado_em', 'ASC')).toBe('ORDER BY criado_em ASC')
  })

  it('usa padrao quando nenhum parametro fornecido', () => {
    const params = new URLSearchParams()
    expect(buildOrderBy(params, allowedFields)).toBe('ORDER BY criado_em DESC')
  })
})
