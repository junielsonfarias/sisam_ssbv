/**
 * Testes unitários — dashboard/filters + dashboard/filters/rp-filters
 *
 * Cobre: buildDashboardFilters (controle de acesso polo/escola/admin,
 *        filtros de série, tipoEnsino, presença, disciplina, faixaMedia,
 *        taxaAcerto), buildRpFilters (WHERE para resultados_provas).
 */
import { describe, it, expect, vi } from 'vitest'
import { buildDashboardFilters } from '@/lib/services/dashboard/filters'
import { buildRpFilters } from '@/lib/services/dashboard/filters/rp-filters'
import type { DashboardFiltros } from '@/lib/services/dashboard/types'
import type { Usuario } from '@/lib/types'

// Mocks de dependências externas para não precisar de conexão real
vi.mock('@/database/connection', () => ({ default: { query: vi.fn() } }))
vi.mock('@/lib/cache', () => ({ cacheDelPattern: vi.fn(), memoryCache: { get: vi.fn(), set: vi.fn() } }))
vi.mock('@/lib/api-helpers', () => ({
  getMediaGeralMixedRoundedSQL: vi.fn(() => '(CASE WHEN serie IN (2,3,5) THEN lp+mat+prod/3 ELSE lp+ch+mat+cn/4 END)'),
}))

// ============================================================================
// Helpers de fixture
// ============================================================================

function makeUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1', nome: 'Teste', email: 't@t.com',
    tipo_usuario: 'administrador',
    polo_id: null, escola_id: null,
    ativo: true, criado_em: new Date(), atualizado_em: new Date(),
    ...overrides,
  }
}

function filtrosVazios(): DashboardFiltros {
  return {
    poloId: null, escolaId: null, anoLetivo: null, avaliacaoId: null,
    serie: null, turmaId: null, presenca: null, tipoEnsino: null,
    nivelAprendizagem: null, faixaMedia: null, disciplina: null,
    taxaAcertoMin: null, taxaAcertoMax: null, questaoCodigo: null,
    areaConhecimento: null, tipoAnalise: null,
  }
}

// ============================================================================
// buildDashboardFilters — controle de acesso
// ============================================================================

describe('buildDashboardFilters — controle de acesso', () => {
  it('admin sem filtros → whereClauseBase com presença default (P/F)', () => {
    const r = buildDashboardFilters(makeUsuario(), filtrosVazios())
    // Sem condições exceto a presença default
    expect(r.whereClauseBase).toContain('rc.presenca')
    expect(r.params).toHaveLength(0) // presença default não usa parâmetro
  })

  it('usuário polo → adiciona restrição e.polo_id como primeiro parâmetro', () => {
    const r = buildDashboardFilters(
      makeUsuario({ tipo_usuario: 'polo', polo_id: 'polo-42' }),
      filtrosVazios()
    )
    expect(r.whereClauseBase).toContain('e.polo_id = $1')
    expect(r.params[0]).toBe('polo-42')
  })

  it('usuário escola → adiciona restrição rc.escola_id como primeiro parâmetro', () => {
    const r = buildDashboardFilters(
      makeUsuario({ tipo_usuario: 'escola', escola_id: 'esc-99' }),
      filtrosVazios()
    )
    expect(r.whereClauseBase).toContain('rc.escola_id = $1')
    expect(r.params[0]).toBe('esc-99')
  })

  it('filtro de polo sobreposição (admin filtra por polo)', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), poloId: 'polo-x' }
    )
    expect(r.whereClauseBase).toContain('e.polo_id')
    expect(r.params).toContain('polo-x')
  })

  it('filtro de escola (admin filtra por escola)', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), escolaId: 'esc-x' }
    )
    expect(r.whereClauseBase).toContain('rc.escola_id')
    expect(r.params).toContain('esc-x')
  })
})

// ============================================================================
// buildDashboardFilters — filtros de série e tipoEnsino
// ============================================================================

describe('buildDashboardFilters — série e tipoEnsino', () => {
  it('série com número → extrai número e usa COALESCE/REGEXP_REPLACE', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), serie: '5º Ano' })
    expect(r.whereClauseBase).toContain('COALESCE')
    expect(r.paramsBase).toContain('5')
  })

  it('série sem número → usa ILIKE', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), serie: 'EJA' })
    expect(r.whereClauseBase).toContain('ILIKE')
    expect(r.paramsBase).toContain('EJA')
  })

  it('tipoEnsino anos_iniciais → filtra séries 2,3,5 (sem parâmetro)', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), tipoEnsino: 'anos_iniciais' })
    expect(r.whereClauseBase).toContain("IN ('2', '3', '5')")
  })

  it('tipoEnsino anos_finais → filtra séries 6,7,8,9', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), tipoEnsino: 'anos_finais' })
    expect(r.whereClauseBase).toContain("IN ('6', '7', '8', '9')")
  })
})

// ============================================================================
// buildDashboardFilters — presença
// ============================================================================

describe('buildDashboardFilters — presença', () => {
  it('presença P → adiciona parâmetro P maiúsculo', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), presenca: 'p' })
    // Deve normalizar para maiúsculo
    expect(r.params).toContain('P')
  })

  it('presença F → adiciona parâmetro F maiúsculo', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), presenca: 'f' })
    expect(r.params).toContain('F')
  })

  it('sem presença → usa condição default (P e F sem parâmetro)', () => {
    const r = buildDashboardFilters(makeUsuario(), filtrosVazios())
    expect(r.params).toHaveLength(0)
    expect(r.whereClauseBase).toContain("'P'")
    expect(r.whereClauseBase).toContain("'F'")
  })
})

// ============================================================================
// buildDashboardFilters — nivelAprendizagem
// ============================================================================

describe('buildDashboardFilters — nivelAprendizagem', () => {
  it('nível normal → adiciona condição com parâmetro', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), nivelAprendizagem: 'Avançado' }
    )
    expect(r.whereClause).toContain('nivel_aprendizagem')
    expect(r.params).toContain('Avançado')
  })

  it('"Não classificado" → usa IS NULL OR = empty (sem parâmetro extra)', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), nivelAprendizagem: 'Não classificado' }
    )
    expect(r.whereClause).toContain('IS NULL')
  })
})

// ============================================================================
// buildDashboardFilters — faixaMedia
// ============================================================================

describe('buildDashboardFilters — faixaMedia', () => {
  it('faixa "5-7" → adiciona parâmetros min e max na whereClause', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), faixaMedia: '5-7' })
    expect(r.params).toContain(5)
    expect(r.params).toContain(7)
    expect(r.whereClause).toContain('>= $')
    expect(r.whereClause).toContain('< $')
  })

  it('faixa "8-10" → max se torna 10.01 (inclui nota 10)', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), faixaMedia: '8-10' })
    expect(r.params).toContain(10.01)
  })

  it('faixa com disciplina LP → filtra por campo nota_lp', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), faixaMedia: '5-8', disciplina: 'LP' }
    )
    expect(r.whereClause).toContain('nota_lp')
  })

  it('faixaMedia inválida (NaN) → não adiciona condições', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), faixaMedia: 'abc-xyz' })
    // Não deve ter parâmetros de faixa
    expect(r.params).toHaveLength(0)
  })
})

// ============================================================================
// buildDashboardFilters — taxaAcerto
// ============================================================================

describe('buildDashboardFilters — taxaAcertoMin/Max', () => {
  it('taxaAcertoMin "50" → converte para nota (5.0) e adiciona >= condição', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), taxaAcertoMin: '50' }
    )
    // 50% de 10 = 5.0
    expect(r.params).toContain(5)
    expect(r.whereClause).toContain('>=')
  })

  it('taxaAcertoMax "80" → converte para nota (8.0) e adiciona <= condição', () => {
    const r = buildDashboardFilters(
      makeUsuario(),
      { ...filtrosVazios(), taxaAcertoMax: '80' }
    )
    expect(r.params).toContain(8)
    expect(r.whereClause).toContain('<=')
  })

  it('taxaAcertoMin inválido → não adiciona condição', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), taxaAcertoMin: 'nao-numero' })
    expect(r.params).toHaveLength(0)
  })
})

// ============================================================================
// buildDashboardFilters — anoLetivo e avaliacaoId
// ============================================================================

describe('buildDashboardFilters — anoLetivo e avaliacaoId', () => {
  it('anoLetivo → condição rc.ano_letivo = $N', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), anoLetivo: '2026' })
    expect(r.whereClauseBase).toContain('rc.ano_letivo')
    expect(r.paramsBase).toContain('2026')
  })

  it('avaliacaoId → condição rc.avaliacao_id = $N', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), avaliacaoId: 'av-1' })
    expect(r.whereClauseBase).toContain('rc.avaliacao_id')
    expect(r.paramsBase).toContain('av-1')
  })

  it('turmaId → condição rc.turma_id = $N', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), turmaId: 'turma-1' })
    expect(r.whereClauseBase).toContain('rc.turma_id')
    expect(r.paramsBase).toContain('turma-1')
  })
})

// ============================================================================
// buildDashboardFilters — JOIN e structure da resposta
// ============================================================================

describe('buildDashboardFilters — estrutura da resposta', () => {
  it('retorna joinNivelAprendizagem com LEFT JOIN resultados_consolidados', () => {
    const r = buildDashboardFilters(makeUsuario(), filtrosVazios())
    expect(r.joinNivelAprendizagem).toContain('LEFT JOIN resultados_consolidados rc_table')
  })

  it('retorna seriesWhereClause com condição de série não nula', () => {
    const r = buildDashboardFilters(makeUsuario(), filtrosVazios())
    expect(r.seriesWhereClause).toContain('rc.serie IS NOT NULL')
  })

  it('retorna anosLetivosWhereClause com condição de ano letivo não nulo', () => {
    const r = buildDashboardFilters(makeUsuario(), filtrosVazios())
    expect(r.anosLetivosWhereClause).toContain('rc.ano_letivo IS NOT NULL')
  })

  it('retorna rpWhereClauseComPresenca e rpParams', () => {
    const r = buildDashboardFilters(makeUsuario(), { ...filtrosVazios(), anoLetivo: '2026' })
    expect(r.rpWhereClauseComPresenca).toBeTruthy()
    expect(r.rpParams).toBeDefined()
  })
})

// ============================================================================
// buildRpFilters — WHERE para resultados_provas
// ============================================================================

describe('buildRpFilters', () => {
  function makeAdmin(ov: Partial<Usuario> = {}): Usuario {
    return {
      id: 'u1', nome: 'Admin', email: 'a@t.com',
      tipo_usuario: 'administrador',
      polo_id: null, escola_id: null,
      ativo: true, criado_em: new Date(), atualizado_em: new Date(),
      ...ov,
    }
  }

  it('admin sem filtros → rpWhereClauseComPresenca com presença padrão P', () => {
    const r = buildRpFilters(makeAdmin(), filtrosVazios())
    expect(r.rpWhereClauseComPresenca).toContain("rp.presenca = 'P'")
    expect(r.rpParams).toHaveLength(0)
  })

  it('usuário polo → WHERE restringe por polo_id via subquery', () => {
    const r = buildRpFilters(
      makeAdmin({ tipo_usuario: 'polo', polo_id: 'polo-1' }),
      filtrosVazios()
    )
    expect(r.rpWhereClauseComPresenca).toContain('polo_id')
    expect(r.rpParams[0]).toBe('polo-1')
  })

  it('usuário escola → WHERE restringe por rp.escola_id', () => {
    const r = buildRpFilters(
      makeAdmin({ tipo_usuario: 'escola', escola_id: 'esc-1' }),
      filtrosVazios()
    )
    expect(r.rpWhereClauseComPresenca).toContain('rp.escola_id')
    expect(r.rpParams[0]).toBe('esc-1')
  })

  it('filtro anoLetivo → rp.ano_letivo = $N', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), anoLetivo: '2026' })
    expect(r.rpWhereClauseComPresenca).toContain('rp.ano_letivo')
    expect(r.rpParams).toContain('2026')
  })

  it('filtro turmaId → rp.turma_id = $N', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), turmaId: 'trm-1' })
    expect(r.rpWhereClauseComPresenca).toContain('rp.turma_id')
    expect(r.rpParams).toContain('trm-1')
  })

  it('disciplina LP → adiciona condição para todas as variantes LP (params, não no SQL)', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'LP' })
    // SQL usa $N como placeholder — 'LP' fica nos params, não no SQL
    expect(r.rpWhereClauseComPresenca).toContain('rp.disciplina')
    expect(r.rpWhereClauseComPresenca).toContain('rp.area_conhecimento')
    expect(r.rpParams).toContain('LP')
  })

  it('disciplina MAT → condição para variantes Matemática', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'MAT' })
    expect(r.rpParams).toContain('MAT')
    expect(r.rpParams).toContain('Matemática')
  })

  it('disciplina CH → condição para variantes Ciências Humanas', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'CH' })
    expect(r.rpParams).toContain('CH')
    expect(r.rpParams).toContain('Ciências Humanas')
  })

  it('disciplina CN → condição para variantes Ciências da Natureza', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'CN' })
    expect(r.rpParams).toContain('CN')
  })

  it('disciplina PT → condição para variantes Produção Textual', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'PT' })
    expect(r.rpParams).toContain('PT')
    expect(r.rpParams).toContain('Produção Textual')
  })

  it('disciplina desconhecida → usa o valor literal nos parâmetros', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), disciplina: 'XYZ' })
    expect(r.rpParams).toContain('XYZ')
  })

  it('questaoCodigo → rp.questao_codigo = $N', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), questaoCodigo: 'Q01' })
    expect(r.rpWhereClauseComPresenca).toContain('rp.questao_codigo')
    expect(r.rpParams).toContain('Q01')
  })

  it('serie com número → extrai número com regex', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), serie: '5º Ano' })
    expect(r.rpParams).toContain('5')
    expect(r.rpWhereClauseComPresenca).toContain('COALESCE')
  })

  it('serie sem número → usa ILIKE', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), serie: 'EJA' })
    expect(r.rpWhereClauseComPresenca).toContain('ILIKE')
    expect(r.rpParams).toContain('EJA')
  })

  it('rpWhereClauseSemSerie nunca inclui filtro de série mas inclui presença default', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), serie: '5º Ano', anoLetivo: '2026' })
    // SemSerie deve ter anoLetivo mas não serie
    expect(r.rpWhereClauseSemSerie).toContain('rp.ano_letivo')
    // série NÃO deve aparecer em rpWhereClauseSemSerie
    expect(r.rpWhereClauseSemSerie).not.toContain('rp.serie')
    // Deve incluir presença padrão
    expect(r.rpWhereClauseSemSerie).toContain("rp.presenca = 'P'")
  })

  it('presença F explícita → adiciona a condição explícita e não adiciona a default P separada', () => {
    const r = buildRpFilters(makeAdmin(), { ...filtrosVazios(), presenca: 'F' })
    // Deve ter o parâmetro F normalizado para maiúsculo
    expect(r.rpParams).toContain('F')
    // A cláusula com presença não deve ter o literal "rp.presenca = 'P'" default
    // (o default só é adicionado quando !presenca)
    expect(r.rpWhereClauseComPresenca).not.toContain("rp.presenca = 'P'")
    // Mas deve ter a condição paramétrica
    expect(r.rpWhereClauseComPresenca).toContain('rp.presenca = $')
  })
})
