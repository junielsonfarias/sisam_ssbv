import { describe, it, expect } from 'vitest'
import { calcularMetricasHoras, type PlanoHoras } from '@/lib/services/aee-relatorio-horas'

// Data de referência fixa (meio do ano letivo) para resultados determinísticos.
const HOJE = new Date(2026, 5, 18, 12, 0, 0) // 2026-06-18 local

const planoBase: PlanoHoras = {
  periodicidade_horas_semanais: 2,
  data_inicio: '2026-02-01',
  data_fim: null,
  ano_letivo: '2026',
}

describe('calcularMetricasHoras (Fase 4.3)', () => {
  it('converte minutos realizados em horas (somente presentes)', () => {
    // 6 sessões de 50 min = 300 min = 5h
    const r = calcularMetricasHoras(planoBase, 300, HOJE)
    expect(r.horas_realizadas).toBe(5)
  })

  it('calcula horas previstas pela periodicidade × semanas decorridas', () => {
    // 01/02 → 18/06 = 137 dias ≈ 19.6 semanas; 2h/sem ≈ 39.1h
    const r = calcularMetricasHoras(planoBase, 0, HOJE)
    expect(r.semanas_periodo).toBeCloseTo(19.6, 1)
    expect(r.horas_previstas).toBeCloseTo(39.1, 1)
    expect(r.horas_realizadas).toBe(0)
    expect(r.percentual_cobertura).toBe(0)
  })

  it('cobertura = realizadas / previstas em %', () => {
    // previstas ≈ 39.1h; 1200 min = 20h → ~51%
    const r = calcularMetricasHoras(planoBase, 1200, HOJE)
    expect(r.percentual_cobertura).toBe(Math.round((20 / r.horas_previstas!) * 100))
  })

  it('sem periodicidade no PEI → previstas e cobertura nulas', () => {
    const r = calcularMetricasHoras(
      { ...planoBase, periodicidade_horas_semanais: null },
      600,
      HOJE
    )
    expect(r.horas_previstas).toBeNull()
    expect(r.percentual_cobertura).toBeNull()
    expect(r.horas_realizadas).toBe(10)
  })

  it('não projeta carga horária futura (limita janela em hoje)', () => {
    // PEI vai até 31/12, mas só conta até 18/06
    const futuro = calcularMetricasHoras({ ...planoBase, data_fim: '2026-12-31' }, 0, HOJE)
    const semFim = calcularMetricasHoras(planoBase, 0, HOJE)
    expect(futuro.horas_previstas).toBe(semFim.horas_previstas)
  })

  it('data_fim anterior a hoje encerra a janela na vigência', () => {
    // 01/02 → 01/04 = 59 dias ≈ 8.4 semanas; 2h ≈ 16.9h
    const r = calcularMetricasHoras({ ...planoBase, data_fim: '2026-04-01' }, 0, HOJE)
    expect(r.semanas_periodo).toBeCloseTo(8.4, 1)
    expect(r.horas_previstas).toBeCloseTo(16.9, 1)
  })

  it('respeita recorte de período (inicio/fim do relatório)', () => {
    // Recorte 01/03 → 31/03 = 30 dias ≈ 4.3 semanas; 2h ≈ 8.6h
    const r = calcularMetricasHoras(planoBase, 0, HOJE, { inicio: '2026-03-01', fim: '2026-03-31' })
    expect(r.semanas_periodo).toBeCloseTo(4.3, 1)
    expect(r.horas_previstas).toBeCloseTo(8.6, 1)
  })

  it('janela negativa (início após fim) zera previstas', () => {
    const r = calcularMetricasHoras({ ...planoBase, data_inicio: '2026-12-01' }, 0, HOJE)
    expect(r.semanas_periodo).toBe(0)
    expect(r.horas_previstas).toBe(0)
  })
})
