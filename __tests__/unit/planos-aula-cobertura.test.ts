import { describe, it, expect } from 'vitest'
import { resumirCobertura } from '@/lib/services/planos-aula-cobertura'

describe('resumirCobertura (Fase 4.2)', () => {
  it('lista vazia → percentual nulo', () => {
    const r = resumirCobertura([])
    expect(r).toEqual({ total_habilidades: 0, cobertas: 0, pendentes: 0, percentual: null })
  })

  it('conta cobertas e pendentes', () => {
    const r = resumirCobertura([
      { coberta: true }, { coberta: true }, { coberta: false }, { coberta: false },
    ])
    expect(r.total_habilidades).toBe(4)
    expect(r.cobertas).toBe(2)
    expect(r.pendentes).toBe(2)
    expect(r.percentual).toBe(50)
  })

  it('todas cobertas → 100%', () => {
    const r = resumirCobertura([{ coberta: true }, { coberta: true }])
    expect(r.percentual).toBe(100)
    expect(r.pendentes).toBe(0)
  })

  it('nenhuma coberta → 0%', () => {
    const r = resumirCobertura([{ coberta: false }, { coberta: false }, { coberta: false }])
    expect(r.percentual).toBe(0)
    expect(r.cobertas).toBe(0)
  })

  it('arredonda o percentual (1/3 → 33%)', () => {
    const r = resumirCobertura([{ coberta: true }, { coberta: false }, { coberta: false }])
    expect(r.percentual).toBe(33)
  })
})
