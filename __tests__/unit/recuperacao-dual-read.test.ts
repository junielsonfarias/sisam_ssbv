import { describe, it, expect } from 'vitest'
import {
  aplicarRecuperacaoSobreMedia,
  ajustarMediaAnualPorEsquema,
  type RecuperacaoResolvida,
} from '@/lib/services/notas'

// Config base usada nos testes (substituição é o default).
const configSub = {
  permite_recuperacao: true,
  nota_maxima: 10,
  regra_recuperacao: 'substituicao' as const,
}

const configPond = {
  permite_recuperacao: true,
  nota_maxima: 10,
  peso_avaliacao: 0.6,
  peso_recuperacao: 0.4,
  regra_recuperacao: 'ponderada' as const,
}

function rec(
  esquema: RecuperacaoResolvida['esquema'],
  nota: number,
  periodos: number[] = []
): RecuperacaoResolvida {
  return { disciplinaId: 'd1', esquema, notaRecuperacao: nota, periodosNumeros: periodos }
}

// ============================================================================
// aplicarRecuperacaoSobreMedia (função pura) — mesma semântica de calcularNotaFinal
// ============================================================================
describe('aplicarRecuperacaoSobreMedia', () => {
  it('substituição: recuperação MAIOR sobe a média', () => {
    expect(aplicarRecuperacaoSobreMedia(5, 8, configSub)).toBe(8)
  })

  it('substituição: recuperação MENOR não reduz a média', () => {
    expect(aplicarRecuperacaoSobreMedia(7, 5, configSub)).toBe(7)
  })

  it('substituição: recuperação igual mantém a média', () => {
    expect(aplicarRecuperacaoSobreMedia(6, 6, configSub)).toBe(6)
  })

  it('ponderada com pesos válidos: media*0.6 + rec*0.4', () => {
    // 5*0.6 + 8*0.4 = 3 + 3.2 = 6.2
    expect(aplicarRecuperacaoSobreMedia(5, 8, configPond)).toBeCloseTo(6.2, 5)
  })

  it('ponderada com pesos que não somam 1 → fallback substituição', () => {
    const cfg = { ...configPond, peso_avaliacao: 0.3, peso_recuperacao: 0.2 }
    expect(aplicarRecuperacaoSobreMedia(4, 9, cfg)).toBe(9)
  })

  it('config não permite recuperação → média inalterada', () => {
    expect(aplicarRecuperacaoSobreMedia(4, 9, { ...configSub, permite_recuperacao: false })).toBe(4)
  })

  it('recuperação null → média inalterada', () => {
    expect(aplicarRecuperacaoSobreMedia(7, null, configSub)).toBe(7)
  })

  it('média null → permanece null', () => {
    expect(aplicarRecuperacaoSobreMedia(null, 9, configSub)).toBeNull()
  })

  it('respeita nota_maxima (clamp)', () => {
    const cfg = { ...configPond, nota_maxima: 8 }
    // 9*0.6 + 10*0.4 = 5.4 + 4 = 9.4 → clamp para 8
    expect(aplicarRecuperacaoSobreMedia(9, 10, cfg)).toBe(8)
  })
})

// ============================================================================
// ajustarMediaAnualPorEsquema — semântica por esquema (a)-(d)
// ============================================================================
describe('ajustarMediaAnualPorEsquema', () => {
  // ----- (a) por_periodo: PARIDADE EXATA / NO-OP -----
  it("'por_periodo': NUNCA ajusta a média (no-op), mesmo com recuperações", () => {
    const recs = [rec('por_periodo', 10, [1])]
    expect(ajustarMediaAnualPorEsquema(6.3, 'por_periodo', recs, configSub)).toBe(6.3)
  })

  it("'por_periodo': média inalterada sem recuperações", () => {
    expect(ajustarMediaAnualPorEsquema(7.1, 'por_periodo', [], configSub)).toBe(7.1)
  })

  // ----- (d) final: recuperação anual sobre a média anual -----
  it("'final': recuperação anual maior substitui a média anual", () => {
    const recs = [rec('final', 7, [1, 2, 3, 4])]
    expect(ajustarMediaAnualPorEsquema(5, 'final', recs, configSub)).toBe(7)
  })

  it("'final': recuperação anual menor não reduz a média", () => {
    const recs = [rec('final', 4, [1, 2, 3, 4])]
    expect(ajustarMediaAnualPorEsquema(6, 'final', recs, configSub)).toBe(6)
  })

  it("'final': ponderada aplica pesos sobre a média anual", () => {
    const recs = [rec('final', 8, [1, 2, 3, 4])]
    // 5*0.6 + 8*0.4 = 6.2
    expect(ajustarMediaAnualPorEsquema(5, 'final', recs, configPond)).toBeCloseTo(6.2, 5)
  })

  // ----- (c) semestral / (b) por_bloco_periodos: sobre a média -----
  it("'semestral': aplica a maior recuperação de semestre sobre a média", () => {
    const recs = [rec('semestral', 6, [1, 2]), rec('semestral', 8, [3, 4])]
    // maior = 8, substituição sobre 5 → 8
    expect(ajustarMediaAnualPorEsquema(5, 'semestral', recs, configSub)).toBe(8)
  })

  it("'por_bloco_periodos': aplica a maior recuperação de bloco sobre a média", () => {
    const recs = [rec('por_bloco_periodos', 7, [1, 2])]
    expect(ajustarMediaAnualPorEsquema(5, 'por_bloco_periodos', recs, configSub)).toBe(7)
  })

  it("'por_bloco_periodos': recuperação menor não reduz a média (substituição)", () => {
    const recs = [rec('por_bloco_periodos', 4, [1, 2])]
    expect(ajustarMediaAnualPorEsquema(7, 'por_bloco_periodos', recs, configSub)).toBe(7)
  })

  // ----- esquema sem recuperações aplicáveis: fallback à média -----
  it('esquema não-periódico SEM recuperações resolvidas → média inalterada (fallback)', () => {
    expect(ajustarMediaAnualPorEsquema(6.5, 'final', [], configSub)).toBe(6.5)
  })

  it('ignora recuperações de esquema diferente do corrente', () => {
    const recs = [rec('semestral', 10, [1, 2])]
    // esquema corrente é 'final'; não há recuperação 'final' → no-op
    expect(ajustarMediaAnualPorEsquema(5, 'final', recs, configSub)).toBe(5)
  })

  it('média null permanece null em qualquer esquema', () => {
    const recs = [rec('final', 9, [1, 2, 3, 4])]
    expect(ajustarMediaAnualPorEsquema(null, 'final', recs, configSub)).toBeNull()
  })
})
