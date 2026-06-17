import { describe, it, expect } from 'vitest'
import { formatarData, formatarDataHora } from '@/lib/format'

describe('formatarData', () => {
  it('formata string date-only YYYY-MM-DD como dd/MM/yyyy SEM bug de timezone', () => {
    // O ponto crítico: new Date('2026-06-17') seria meia-noite UTC e em UTC-3
    // exibiria 16/06. O helper monta pelos componentes → 17/06 sempre.
    expect(formatarData('2026-06-17')).toBe('17/06/2026')
    expect(formatarData('2026-01-01')).toBe('01/01/2026')
    expect(formatarData('2025-12-31')).toBe('31/12/2025')
  })

  it('formata timestamp ISO (com hora) no fuso do projeto', () => {
    // 2026-06-17T02:30:00Z = 23:30 do dia 16 em Belém (UTC-3)
    expect(formatarData('2026-06-17T02:30:00Z')).toBe('16/06/2026')
    // 2026-06-17T12:00:00Z = 09:00 do dia 17 em Belém
    expect(formatarData('2026-06-17T12:00:00Z')).toBe('17/06/2026')
  })

  it('aceita objeto Date', () => {
    expect(formatarData(new Date('2026-06-17T12:00:00Z'))).toBe('17/06/2026')
  })

  it('retorna fallback para nulo/vazio/inválido', () => {
    expect(formatarData(null)).toBe('—')
    expect(formatarData(undefined)).toBe('—')
    expect(formatarData('')).toBe('—')
    expect(formatarData('data-invalida')).toBe('—')
    expect(formatarData(null, 'Nunca')).toBe('Nunca')
  })
})

describe('formatarDataHora', () => {
  it('formata timestamp como dd/MM/yyyy HH:mm no fuso de Belém', () => {
    expect(formatarDataHora('2026-06-17T12:00:00Z')).toBe('17/06/2026 09:00')
    // 02:30 UTC do dia 17 → 23:30 do dia 16 em Belém
    expect(formatarDataHora('2026-06-17T02:30:00Z')).toBe('16/06/2026 23:30')
  })

  it('retorna fallback configurável para nulo/inválido', () => {
    expect(formatarDataHora(null)).toBe('—')
    expect(formatarDataHora(null, 'Nunca')).toBe('Nunca')
    expect(formatarDataHora('xyz')).toBe('—')
  })
})
