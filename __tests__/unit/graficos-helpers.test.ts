/**
 * Testes unitários — graficos/helpers
 *
 * Cobre: getQuestaoRangeFilter, getCampoNota, isEscolaIdValida, buildGraficosFilters.
 * Sem I/O: funções puras que geram SQL/flags.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  getQuestaoRangeFilter,
  getCampoNota,
  isEscolaIdValida,
  buildGraficosFilters,
} from '@/lib/services/graficos/helpers'

// Mock do pool para não abrir conexão real
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// ============================================================================
// getQuestaoRangeFilter
// ============================================================================

describe('getQuestaoRangeFilter — filtro de questões por série', () => {
  describe('2º e 3º Ano', () => {
    it('LP → Q1-Q14', () => {
      const r = getQuestaoRangeFilter('2º Ano', 'LP', null)
      expect(r).toContain('BETWEEN 1 AND 14')
    })

    it('MAT → Q15-Q28', () => {
      const r = getQuestaoRangeFilter('3º Ano', 'MAT', null)
      expect(r).toContain('BETWEEN 15 AND 28')
    })

    it('sem disciplina → Q1-Q28 completo', () => {
      const r = getQuestaoRangeFilter('2º Ano', null, null)
      expect(r).toContain('BETWEEN 1 AND 28')
    })
  })

  describe('5º Ano', () => {
    it('LP → Q1-Q14', () => {
      const r = getQuestaoRangeFilter('5º Ano', 'LP', null)
      expect(r).toContain('BETWEEN 1 AND 14')
    })

    it('MAT → Q15-Q34', () => {
      const r = getQuestaoRangeFilter('5º Ano', 'MAT', null)
      expect(r).toContain('BETWEEN 15 AND 34')
    })

    it('sem disciplina → Q1-Q34', () => {
      const r = getQuestaoRangeFilter('5º Ano', null, null)
      expect(r).toContain('BETWEEN 1 AND 34')
    })
  })

  describe('Anos Finais (6-9)', () => {
    it('LP → Q1-Q20', () => {
      const r = getQuestaoRangeFilter('8º Ano', 'LP', null)
      expect(r).toContain('BETWEEN 1 AND 20')
    })

    it('CH → Q21-Q30', () => {
      const r = getQuestaoRangeFilter('9º Ano', 'CH', null)
      expect(r).toContain('BETWEEN 21 AND 30')
    })

    it('MAT → Q31-Q50', () => {
      const r = getQuestaoRangeFilter('6º Ano', 'MAT', null)
      expect(r).toContain('BETWEEN 31 AND 50')
    })

    it('CN → Q51-Q60', () => {
      const r = getQuestaoRangeFilter('7º Ano', 'CN', null)
      expect(r).toContain('BETWEEN 51 AND 60')
    })

    it('sem disciplina → Q1-Q60', () => {
      const r = getQuestaoRangeFilter('6º Ano', null, null)
      expect(r).toContain('BETWEEN 1 AND 60')
    })
  })

  describe('tipoEnsino como fallback (série nula)', () => {
    it('anos_iniciais LP → Q1-Q14', () => {
      const r = getQuestaoRangeFilter(null, 'LP', 'anos_iniciais')
      expect(r).toContain('BETWEEN 1 AND 14')
    })

    it('anos_iniciais MAT → Q15-Q34', () => {
      const r = getQuestaoRangeFilter(null, 'MAT', 'anos_iniciais')
      expect(r).toContain('BETWEEN 15 AND 34')
    })

    it('anos_iniciais sem disciplina → Q1-Q34', () => {
      const r = getQuestaoRangeFilter(null, null, 'anos_iniciais')
      expect(r).toContain('BETWEEN 1 AND 34')
    })

    it('anos_finais LP → Q1-Q20', () => {
      const r = getQuestaoRangeFilter(null, 'LP', 'anos_finais')
      expect(r).toContain('BETWEEN 1 AND 20')
    })

    it('anos_finais CH → Q21-Q30', () => {
      const r = getQuestaoRangeFilter(null, 'CH', 'anos_finais')
      expect(r).toContain('BETWEEN 21 AND 30')
    })

    it('anos_finais MAT → Q31-Q50', () => {
      const r = getQuestaoRangeFilter(null, 'MAT', 'anos_finais')
      expect(r).toContain('BETWEEN 31 AND 50')
    })

    it('anos_finais CN → Q51-Q60', () => {
      const r = getQuestaoRangeFilter(null, 'CN', 'anos_finais')
      expect(r).toContain('BETWEEN 51 AND 60')
    })

    it('anos_finais sem disciplina → Q1-Q60', () => {
      const r = getQuestaoRangeFilter(null, null, 'anos_finais')
      expect(r).toContain('BETWEEN 1 AND 60')
    })
  })

  describe('casos sem filtro aplicável', () => {
    it('retorna null quando série e tipoEnsino são null', () => {
      expect(getQuestaoRangeFilter(null, 'LP', null)).toBeNull()
    })

    it('retorna null quando série não tem número', () => {
      expect(getQuestaoRangeFilter('EJA', 'LP', null)).toBeNull()
    })

    it('retorna null para série não mapeada (ex: 4º Ano)', () => {
      // 4º Ano não está na lista de séries avaliadas (2,3,5,6,7,8,9)
      expect(getQuestaoRangeFilter('4º Ano', 'LP', null)).toBeNull()
    })
  })
})

// ============================================================================
// getCampoNota
// ============================================================================

describe('getCampoNota — campo e label por disciplina', () => {
  it('LP → campo rc.nota_lp, 20 questões', () => {
    const r = getCampoNota('LP')
    expect(r.campo).toBe('rc.nota_lp')
    expect(r.label).toBe('Língua Portuguesa')
    expect(r.totalQuestoes).toBe(20)
    expect(r.isCalculated).toBeUndefined()
  })

  it('CH → campo rc.nota_ch, 10 questões', () => {
    const r = getCampoNota('CH')
    expect(r.campo).toBe('rc.nota_ch')
    expect(r.label).toBe('Ciências Humanas')
    expect(r.totalQuestoes).toBe(10)
  })

  it('MAT → campo rc.nota_mat, 20 questões', () => {
    const r = getCampoNota('MAT')
    expect(r.campo).toBe('rc.nota_mat')
    expect(r.label).toBe('Matemática')
    expect(r.totalQuestoes).toBe(20)
  })

  it('CN → campo rc.nota_cn, 10 questões', () => {
    const r = getCampoNota('CN')
    expect(r.campo).toBe('rc.nota_cn')
    expect(r.label).toBe('Ciências da Natureza')
    expect(r.totalQuestoes).toBe(10)
  })

  it('PT → campo rc.nota_producao, 1 questão', () => {
    const r = getCampoNota('PT')
    expect(r.campo).toBe('rc.nota_producao')
    expect(r.label).toBe('Produção Textual')
    expect(r.totalQuestoes).toBe(1)
  })

  it('null (padrão) → média geral calculada, 60 questões, isCalculated=true', () => {
    const r = getCampoNota(null)
    expect(r.label).toBe('Média Geral')
    expect(r.totalQuestoes).toBe(60)
    expect(r.isCalculated).toBe(true)
    // O campo deve ser um CASE SQL
    expect(r.campo).toContain('CASE')
  })

  it('disciplina desconhecida cai no default (média geral)', () => {
    const r = getCampoNota('XPTO')
    expect(r.label).toBe('Média Geral')
    expect(r.isCalculated).toBe(true)
  })
})

// ============================================================================
// isEscolaIdValida
// ============================================================================

describe('isEscolaIdValida', () => {
  it('id válido retorna true', () => {
    expect(isEscolaIdValida('escola-123')).toBe(true)
  })

  it('null retorna false', () => {
    expect(isEscolaIdValida(null)).toBe(false)
  })

  it('string vazia retorna false', () => {
    expect(isEscolaIdValida('')).toBe(false)
  })

  it('"undefined" como string retorna false', () => {
    expect(isEscolaIdValida('undefined')).toBe(false)
  })

  it('"Todas" (case-insensitive) retorna false', () => {
    expect(isEscolaIdValida('Todas')).toBe(false)
    expect(isEscolaIdValida('TODAS')).toBe(false)
    expect(isEscolaIdValida('todas')).toBe(false)
  })
})

// ============================================================================
// buildGraficosFilters — controle de acesso e construção de WHERE
// ============================================================================

describe('buildGraficosFilters — acesso e WHERE', () => {
  const usuarioAdmin = {
    id: 'u1', nome: 'Admin', email: 'a@test.com',
    tipo_usuario: 'administrador' as const,
    polo_id: null, escola_id: null,
    ativo: true, criado_em: new Date(), atualizado_em: new Date(),
  }

  const usuarioPolo = {
    ...usuarioAdmin, tipo_usuario: 'polo' as const, polo_id: 'polo-001',
  }

  const usuarioEscola = {
    ...usuarioAdmin, tipo_usuario: 'escola' as const, escola_id: 'escola-001',
  }

  it('admin sem filtros → WHERE vazio', () => {
    const r = buildGraficosFilters(usuarioAdmin, {})
    expect(r.whereClause).toBe('')
    expect(r.params).toHaveLength(0)
  })

  it('admin com anoLetivo → WHERE com rc.ano_letivo', () => {
    const r = buildGraficosFilters(usuarioAdmin, { anoLetivo: '2026' })
    expect(r.whereClause).toContain('rc.ano_letivo')
    expect(r.params).toContain('2026')
  })

  it('usuário escola → WHERE restringe pelo escola_id', () => {
    const r = buildGraficosFilters(usuarioEscola, {})
    expect(r.whereClause).toContain('rc.escola_id')
    expect(r.params).toContain('escola-001')
  })

  it('usuário polo → WHERE restringe pelo polo_id', () => {
    const r = buildGraficosFilters(usuarioPolo, {})
    expect(r.whereClause).toContain('e.polo_id')
    expect(r.params).toContain('polo-001')
  })

  it('admin pode filtrar por poloId', () => {
    const r = buildGraficosFilters(usuarioAdmin, { poloId: 'polo-xyz' })
    expect(r.whereClause).toContain('e.polo_id')
    expect(r.params).toContain('polo-xyz')
  })

  it('polo não pode usar poloId adicional (não admin/tecnico)', () => {
    // O código só aplica poloId para admin/tecnico
    const r = buildGraficosFilters(usuarioPolo, { poloId: 'polo-outro' })
    // polo-001 vem do usuário; polo-outro NÃO deve aparecer como parâmetro extra
    expect(r.params.filter(p => p === 'polo-outro')).toHaveLength(0)
  })

  it('tipoEnsino anos_iniciais → filtra séries 2,3,5', () => {
    const r = buildGraficosFilters(usuarioAdmin, { tipoEnsino: 'anos_iniciais' })
    expect(r.whereClause).toContain("IN ('2', '3', '5')")
  })

  it('tipoEnsino anos_finais → filtra séries 6,7,8,9', () => {
    const r = buildGraficosFilters(usuarioAdmin, { tipoEnsino: 'anos_finais' })
    expect(r.whereClause).toContain("IN ('6', '7', '8', '9')")
  })

  it('escolaId inválida ("Todas") não é adicionada ao WHERE', () => {
    const r = buildGraficosFilters(usuarioAdmin, { escolaId: 'Todas' })
    expect(r.whereClause).toBe('')
    expect(r.deveRemoverLimites).toBe(true)
  })

  it('escolaId válida é adicionada + deveRemoverLimites=false', () => {
    const r = buildGraficosFilters(usuarioAdmin, { escolaId: 'esc-1' })
    expect(r.whereClause).toContain('rc.escola_id')
    expect(r.deveRemoverLimites).toBe(false)
  })

  it('serie e turmaId são incluídos quando presentes', () => {
    const r = buildGraficosFilters(usuarioAdmin, { serie: '5º Ano', turmaId: 'turma-1' })
    expect(r.whereClause).toContain('rc.serie')
    expect(r.whereClause).toContain('rc.turma_id')
    expect(r.params).toContain('5º Ano')
    expect(r.params).toContain('turma-1')
  })

  it('paramIndex começa em 1 e incrementa corretamente', () => {
    const r = buildGraficosFilters(usuarioEscola, { anoLetivo: '2026', serie: '5º Ano' })
    // escola_id=$1, ano_letivo=$2, serie=$3
    expect(r.paramIndex).toBe(4)
    expect(r.params).toHaveLength(3)
  })
})
