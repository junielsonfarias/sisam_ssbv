/**
 * Testes do classificador de eventos do terminal facial.
 *
 * Janela: 30 minutos. Eventos dentro da janela viram duplicado.
 */
import { describe, it, expect } from 'vitest'
import { classificarEvento, JANELA_DUPLICADO_MIN } from '@/lib/services/presenca-facial-eventos.service'

function iso(min: number, base = new Date('2026-05-31T07:00:00-03:00')): string {
  return new Date(base.getTime() + min * 60_000).toISOString()
}

describe('classificarEvento', () => {
  it('janela e de 30 minutos', () => {
    expect(JANELA_DUPLICADO_MIN).toBe(30)
  })

  it('sem evento anterior -> entrada', () => {
    const r = classificarEvento(null, new Date('2026-05-31T07:00:00-03:00'))
    expect(r).toBe('entrada')
  })

  it('cenario do usuario: 7:00 entrada + 7:15 -> duplicado (acidental)', () => {
    const ultimo = { tipo: 'entrada' as const, registrado_em: iso(0) }
    const agora = new Date(iso(15))
    expect(classificarEvento(ultimo, agora)).toBe('duplicado')
  })

  it('7:00 entrada + 7:29 -> ainda duplicado (limite inferior)', () => {
    const ultimo = { tipo: 'entrada' as const, registrado_em: iso(0) }
    const agora = new Date(iso(29))
    expect(classificarEvento(ultimo, agora)).toBe('duplicado')
  })

  it('7:00 entrada + 7:30 -> saida (exatamente no limite)', () => {
    const ultimo = { tipo: 'entrada' as const, registrado_em: iso(0) }
    const agora = new Date(iso(30))
    expect(classificarEvento(ultimo, agora)).toBe('saida')
  })

  it('7:00 entrada + 11:30 -> saida (muito alem da janela)', () => {
    const ultimo = { tipo: 'entrada' as const, registrado_em: iso(0) }
    const agora = new Date(iso(270))
    expect(classificarEvento(ultimo, agora)).toBe('saida')
  })

  it('11:30 saida + 11:32 -> duplicado (passou de novo logo apos sair)', () => {
    const ultimo = { tipo: 'saida' as const, registrado_em: iso(270) }
    const agora = new Date(iso(272))
    expect(classificarEvento(ultimo, agora)).toBe('duplicado')
  })

  it('11:30 saida + 13:00 -> entrada (volta apos pausa)', () => {
    const ultimo = { tipo: 'saida' as const, registrado_em: iso(270) }
    const agora = new Date(iso(360))
    expect(classificarEvento(ultimo, agora)).toBe('entrada')
  })

  it('fluxo completo do dia (entrada -> duplicado -> saida -> duplicado -> entrada -> saida)', () => {
    const t0 = iso(0)   // 7:00 entrada
    const t1 = iso(15)  // 7:15 duplicado (acidental)
    const t2 = iso(270) // 11:30 saida
    const t3 = iso(272) // 11:32 duplicado
    const t4 = iso(360) // 13:00 entrada (volta apos pausa)
    const t5 = iso(600) // 17:00 saida final

    expect(classificarEvento(null, new Date(t0))).toBe('entrada')
    expect(classificarEvento({ tipo: 'entrada', registrado_em: t0 }, new Date(t1))).toBe('duplicado')
    // ultimo nao-duplicado ainda eh t0 (entrada). Agora chega t2:
    expect(classificarEvento({ tipo: 'entrada', registrado_em: t0 }, new Date(t2))).toBe('saida')
    expect(classificarEvento({ tipo: 'saida', registrado_em: t2 }, new Date(t3))).toBe('duplicado')
    expect(classificarEvento({ tipo: 'saida', registrado_em: t2 }, new Date(t4))).toBe('entrada')
    expect(classificarEvento({ tipo: 'entrada', registrado_em: t4 }, new Date(t5))).toBe('saida')
  })

  it('caso defensivo: ultimo=duplicado nao deveria vir do banco — devolve duplicado sem quebrar', () => {
    const ultimo = { tipo: 'duplicado' as const, registrado_em: iso(0) }
    const r = classificarEvento(ultimo, new Date(iso(60)))
    expect(r).toBe('duplicado')
  })
})
