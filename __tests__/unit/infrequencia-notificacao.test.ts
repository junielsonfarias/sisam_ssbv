import { describe, it, expect } from 'vitest'
import { montarMensagemInfrequencia, deveRenotificar } from '@/lib/services/infrequencia-notificacao.service'

describe('montarMensagemInfrequencia (Fase 4.1)', () => {
  it('inclui nome, percentual e limiar arredondados', () => {
    const m = montarMensagemInfrequencia('Maria Silva', 62.4, 75)
    expect(m.titulo).toContain('frequência')
    expect(m.corpo).toContain('Maria Silva')
    expect(m.corpo).toContain('62%')
    expect(m.corpo).toContain('75%')
  })

  it('arredonda percentuais fracionados', () => {
    const m = montarMensagemInfrequencia('João', 69.6, 74.5)
    expect(m.corpo).toContain('70%')
    expect(m.corpo).toContain('75%') // 74.5 -> 75
  })
})

describe('deveRenotificar (Fase 4.1)', () => {
  const agora = new Date(2026, 5, 18, 12, 0, 0)

  it('sem notificação anterior → sempre notifica', () => {
    expect(deveRenotificar(null, agora, 7)).toBe(true)
  })

  it('dentro da janela → não renotifica', () => {
    const ha3dias = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000)
    expect(deveRenotificar(ha3dias, agora, 7)).toBe(false)
  })

  it('após a janela → renotifica', () => {
    const ha8dias = new Date(agora.getTime() - 8 * 24 * 60 * 60 * 1000)
    expect(deveRenotificar(ha8dias, agora, 7)).toBe(true)
  })

  it('exatamente na borda da janela → renotifica', () => {
    const ha7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
    expect(deveRenotificar(ha7dias, agora, 7)).toBe(true)
  })
})
