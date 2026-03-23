import { describe, it, expect } from 'vitest'
import {
  parsePaginacao,
  buildPaginacaoResponse,
  createWhereBuilder,
  addCondition,
  addInCondition,
  addSearchCondition,
  addRawCondition,
  buildWhereString,
  buildConditionsString,
  addAccessControl,
  parseSearchParams,
  parseIntParam,
  parseBoolParam,
  buildOrderBy,
  buildLimitOffset,
  extrairNumeroSerie,
  isAnosIniciais,
  isAnosFinais,
  getDivisorSerie,
  getMediaGeralSQL,
  getPresencaSQL,
} from '@/lib/api-helpers'
import { Usuario } from '@/lib/types'

// ============================================================================
// PAGINAÇÃO
// ============================================================================

describe('parsePaginacao', () => {
  it('retorna valores padrão quando params vazios', () => {
    const sp = new URLSearchParams()
    const result = parsePaginacao(sp)
    expect(result).toEqual({ pagina: 1, limite: 50, offset: 0 })
  })

  it('calcula offset corretamente', () => {
    const sp = new URLSearchParams({ pagina: '3', limite: '20' })
    const result = parsePaginacao(sp)
    expect(result).toEqual({ pagina: 3, limite: 20, offset: 40 })
  })

  it('não permite pagina negativa', () => {
    const sp = new URLSearchParams({ pagina: '-5' })
    const result = parsePaginacao(sp)
    expect(result.pagina).toBe(1)
  })

  it('respeita limite máximo', () => {
    const sp = new URLSearchParams({ limite: '99999' })
    const result = parsePaginacao(sp)
    expect(result.limite).toBe(10000)
  })

  it('aceita limiteMax customizado', () => {
    const sp = new URLSearchParams({ limite: '300' })
    const result = parsePaginacao(sp, { limiteMax: 200 })
    expect(result.limite).toBe(200)
  })

  it('aceita campos customizados', () => {
    const sp = new URLSearchParams({ pagina_alunos: '2', limite_alunos: '25' })
    const result = parsePaginacao(sp, { camposPagina: 'pagina_alunos', camposLimite: 'limite_alunos' })
    expect(result).toEqual({ pagina: 2, limite: 25, offset: 25 })
  })

  it('trata valores não numéricos', () => {
    const sp = new URLSearchParams({ pagina: 'abc', limite: 'xyz' })
    const result = parsePaginacao(sp)
    expect(result.pagina).toBe(1)
    expect(result.limite).toBe(50)
  })
})

describe('buildPaginacaoResponse', () => {
  it('calcula totalPaginas e flags corretamente', () => {
    const result = buildPaginacaoResponse({ pagina: 2, limite: 10, offset: 10 }, 35)
    expect(result).toEqual({
      pagina: 2,
      limite: 10,
      total: 35,
      totalPaginas: 4,
      temProxima: true,
      temAnterior: true,
    })
  })

  it('primeira página não tem anterior', () => {
    const result = buildPaginacaoResponse({ pagina: 1, limite: 10, offset: 0 }, 20)
    expect(result.temAnterior).toBe(false)
    expect(result.temProxima).toBe(true)
  })

  it('última página não tem próxima', () => {
    const result = buildPaginacaoResponse({ pagina: 3, limite: 10, offset: 20 }, 25)
    expect(result.temProxima).toBe(false)
    expect(result.temAnterior).toBe(true)
  })

  it('total zero gera zero páginas', () => {
    const result = buildPaginacaoResponse({ pagina: 1, limite: 10, offset: 0 }, 0)
    expect(result.totalPaginas).toBe(0)
    expect(result.temProxima).toBe(false)
  })
})

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

describe('WHERE Clause Builder', () => {
  it('createWhereBuilder inicia limpo', () => {
    const builder = createWhereBuilder()
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
    expect(builder.paramIndex).toBe(1)
  })

  it('createWhereBuilder aceita startIndex', () => {
    const builder = createWhereBuilder(5)
    expect(builder.paramIndex).toBe(5)
  })

  it('addCondition adiciona condição com valor', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'e.polo_id', 'abc-123')
    expect(builder.conditions).toEqual(['e.polo_id = $1'])
    expect(builder.params).toEqual(['abc-123'])
    expect(builder.paramIndex).toBe(2)
  })

  it('addCondition ignora valor null/undefined/vazio', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'a.campo1', null)
    addCondition(builder, 'a.campo2', undefined)
    addCondition(builder, 'a.campo3', '')
    expect(builder.conditions).toEqual([])
    expect(builder.params).toEqual([])
    expect(builder.paramIndex).toBe(1)
  })

  it('addCondition suporta operadores diferentes', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'nota', 6, '>=')
    addCondition(builder, 'nome', '%test%', 'ILIKE')
    expect(builder.conditions[0]).toBe('nota >= $1')
    expect(builder.conditions[1]).toBe('nome ILIKE $2')
  })

  it('addInCondition gera IN com placeholders corretos', () => {
    const builder = createWhereBuilder()
    addInCondition(builder, 'serie', ['2', '3', '5'])
    expect(builder.conditions[0]).toBe('serie IN ($1, $2, $3)')
    expect(builder.params).toEqual(['2', '3', '5'])
    expect(builder.paramIndex).toBe(4)
  })

  it('addInCondition ignora array vazio', () => {
    const builder = createWhereBuilder()
    addInCondition(builder, 'serie', [])
    expect(builder.conditions).toEqual([])
  })

  it('addSearchCondition gera OR para múltiplos campos', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['a.nome', 'a.codigo'], 'João')
    expect(builder.conditions[0]).toBe('(a.nome ILIKE $1 OR a.codigo ILIKE $1)')
    expect(builder.params[0]).toBe('%João%')
  })

  it('addSearchCondition ignora busca vazia', () => {
    const builder = createWhereBuilder()
    addSearchCondition(builder, ['a.nome'], '')
    addSearchCondition(builder, ['a.nome'], null)
    addSearchCondition(builder, ['a.nome'], '   ')
    expect(builder.conditions).toEqual([])
  })

  it('addRawCondition adiciona SQL literal', () => {
    const builder = createWhereBuilder()
    addRawCondition(builder, `rc.presenca = 'P'`)
    expect(builder.conditions[0]).toBe("rc.presenca = 'P'")
    expect(builder.params).toEqual([])
  })

  it('buildWhereString gera WHERE correto', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'a.ativo', true)
    addCondition(builder, 'a.escola_id', 'abc')
    expect(buildWhereString(builder)).toBe('WHERE a.ativo = $1 AND a.escola_id = $2')
  })

  it('buildWhereString retorna vazio sem condições', () => {
    const builder = createWhereBuilder()
    expect(buildWhereString(builder)).toBe('')
  })

  it('buildWhereString aceita prefixo customizado', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'a.id', '123')
    expect(buildWhereString(builder, 'AND')).toBe('AND a.id = $1')
  })

  it('buildConditionsString retorna 1=1 sem condições', () => {
    const builder = createWhereBuilder()
    expect(buildConditionsString(builder)).toBe('1=1')
  })

  it('encadeamento completo funciona', () => {
    const builder = createWhereBuilder()
    addCondition(builder, 'e.polo_id', 'polo-1')
    addCondition(builder, 'rc.ano_letivo', '2026')
    addSearchCondition(builder, ['a.nome'], 'Maria')
    addInCondition(builder, 'rc.serie', ['2', '3'])

    expect(builder.conditions.length).toBe(4)
    expect(builder.params).toEqual(['polo-1', '2026', '%Maria%', '2', '3'])
    expect(builder.paramIndex).toBe(6)
  })
})

// ============================================================================
// CONTROLE DE ACESSO
// ============================================================================

describe('addAccessControl', () => {
  const makeUser = (overrides: Partial<Usuario>): Usuario => ({
    id: '1',
    nome: 'Test',
    email: 'test@test.com',
    tipo_usuario: 'administrador',
    ativo: true,
    criado_em: new Date(),
    atualizado_em: new Date(),
    ...overrides,
  })

  it('não adiciona filtro para admin', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'administrador' }))
    expect(builder.conditions).toEqual([])
  })

  it('não adiciona filtro para tecnico', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'tecnico' }))
    expect(builder.conditions).toEqual([])
  })

  it('filtra por polo_id para tipo polo', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'polo', polo_id: 'p1' }))
    expect(builder.conditions[0]).toBe('e.polo_id = $1')
    expect(builder.params[0]).toBe('p1')
  })

  it('filtra por escola_id para tipo escola', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'escola', escola_id: 'e1' }))
    expect(builder.conditions[0]).toBe('e.id = $1')
    expect(builder.params[0]).toBe('e1')
  })

  it('aceita alias customizado', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'escola', escola_id: 'e1' }), {
      escolaAlias: 'escolas',
      escolaIdField: 'escolas.id',
    })
    expect(builder.conditions[0]).toBe('escolas.id = $1')
  })
})

// ============================================================================
// PARSING
// ============================================================================

describe('parseSearchParams', () => {
  it('extrai múltiplos params', () => {
    const sp = new URLSearchParams({ polo_id: 'p1', serie: '5', limite: '20' })
    const result = parseSearchParams(sp, ['polo_id', 'serie', 'ausente'])
    expect(result).toEqual({ polo_id: 'p1', serie: '5', ausente: null })
  })
})

describe('parseIntParam', () => {
  it('retorna valor inteiro', () => {
    const sp = new URLSearchParams({ limite: '42' })
    expect(parseIntParam(sp, 'limite')).toBe(42)
  })

  it('retorna default para ausente', () => {
    const sp = new URLSearchParams()
    expect(parseIntParam(sp, 'limite', 10)).toBe(10)
  })

  it('retorna default para NaN', () => {
    const sp = new URLSearchParams({ limite: 'abc' })
    expect(parseIntParam(sp, 'limite', 50)).toBe(50)
  })
})

describe('parseBoolParam', () => {
  it('reconhece true/1/sim', () => {
    expect(parseBoolParam(new URLSearchParams({ a: 'true' }), 'a')).toBe(true)
    expect(parseBoolParam(new URLSearchParams({ a: '1' }), 'a')).toBe(true)
    expect(parseBoolParam(new URLSearchParams({ a: 'sim' }), 'a')).toBe(true)
  })

  it('retorna false para outros valores', () => {
    expect(parseBoolParam(new URLSearchParams({ a: 'false' }), 'a')).toBe(false)
    expect(parseBoolParam(new URLSearchParams({ a: 'no' }), 'a')).toBe(false)
  })

  it('retorna default quando ausente', () => {
    expect(parseBoolParam(new URLSearchParams(), 'a', true)).toBe(true)
  })
})

// ============================================================================
// SQL HELPERS
// ============================================================================

describe('buildOrderBy', () => {
  it('usa campo e direção padrão', () => {
    const sp = new URLSearchParams()
    expect(buildOrderBy(sp, ['nome', 'criado_em'])).toBe('ORDER BY criado_em DESC')
  })

  it('aceita campo válido do request', () => {
    const sp = new URLSearchParams({ ordenar_por: 'nome', direcao: 'ASC' })
    expect(buildOrderBy(sp, ['nome', 'criado_em'])).toBe('ORDER BY nome ASC')
  })

  it('rejeita campo não permitido', () => {
    const sp = new URLSearchParams({ ordenar_por: 'senha' })
    expect(buildOrderBy(sp, ['nome'], 'nome')).toBe('ORDER BY nome DESC')
  })

  it('sanitiza direção inválida', () => {
    const sp = new URLSearchParams({ direcao: 'DROP TABLE' })
    expect(buildOrderBy(sp, ['nome'], 'nome')).toBe('ORDER BY nome DESC')
  })
})

describe('buildLimitOffset', () => {
  it('gera SQL correto', () => {
    expect(buildLimitOffset({ pagina: 2, limite: 20, offset: 20 })).toBe('LIMIT 20 OFFSET 20')
  })
})

// ============================================================================
// SÉRIE HELPERS
// ============================================================================

describe('extrairNumeroSerie', () => {
  it('extrai número de formatos variados', () => {
    expect(extrairNumeroSerie('5º Ano')).toBe('5')
    expect(extrairNumeroSerie('9')).toBe('9')
    expect(extrairNumeroSerie('2º ano')).toBe('2')
    expect(extrairNumeroSerie('Série 3')).toBe('3')
  })
})

describe('isAnosIniciais / isAnosFinais', () => {
  it('classifica anos iniciais corretamente', () => {
    expect(isAnosIniciais('2º Ano')).toBe(true)
    expect(isAnosIniciais('3')).toBe(true)
    expect(isAnosIniciais('5º Ano')).toBe(true)
    expect(isAnosIniciais('6º Ano')).toBe(false)
  })

  it('classifica anos finais corretamente', () => {
    expect(isAnosFinais('6º Ano')).toBe(true)
    expect(isAnosFinais('9')).toBe(true)
    expect(isAnosFinais('5º Ano')).toBe(false)
  })
})

describe('getDivisorSerie', () => {
  it('retorna 3 para anos iniciais (LP+MAT+PROD)', () => {
    expect(getDivisorSerie('2º Ano')).toBe(3)
    expect(getDivisorSerie('3')).toBe(3)
    expect(getDivisorSerie('5º Ano')).toBe(3)
  })

  it('retorna 4 para anos finais (LP+CH+MAT+CN)', () => {
    expect(getDivisorSerie('6º Ano')).toBe(4)
    expect(getDivisorSerie('7')).toBe(4)
    expect(getDivisorSerie('9º Ano')).toBe(4)
  })
})

describe('getMediaGeralSQL', () => {
  it('gera CASE SQL válido', () => {
    const sql = getMediaGeralSQL()
    expect(sql).toContain('CASE')
    expect(sql).toContain("IN ('2','3','5')")
    expect(sql).toContain('nota_lp')
    expect(sql).toContain('nota_mat')
    expect(sql).toContain('/ 3.0')
    expect(sql).toContain('/ 4.0')
  })

  it('aceita alias customizado', () => {
    const sql = getMediaGeralSQL('x')
    expect(sql).toContain('x.serie')
    expect(sql).toContain('x.nota_lp')
  })
})

describe('getPresencaSQL', () => {
  it('gera condição de presença válida', () => {
    const sql = getPresencaSQL()
    expect(sql).toContain("rc.presenca = 'P'")
    expect(sql).toContain("rc.presenca = 'p'")
  })

  it('aceita alias', () => {
    const sql = getPresencaSQL('r')
    expect(sql).toContain("r.presenca = 'P'")
  })
})
