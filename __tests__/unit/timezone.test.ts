import { describe, it, expect } from 'vitest'
import { extrairDataHoraLocal, TIMEZONE_PADRAO } from '@/lib/api-helpers'

describe('extrairDataHoraLocal', () => {
  // ============================================================================
  // CONVERSÃO UTC → AMERICA/BELEM (UTC-3)
  // ============================================================================

  it('23:30 UTC → 20:30 em Belém (mesmo dia)', () => {
    const result = extrairDataHoraLocal('2026-03-24T23:30:00Z', 'America/Belem')
    expect(result.data).toBe('2026-03-24')
    expect(result.hora).toBe('20:30:00')
  })

  it('02:30 UTC dia 25 → 23:30 dia 24 em Belém (dia anterior!)', () => {
    const result = extrairDataHoraLocal('2026-03-25T02:30:00Z', 'America/Belem')
    expect(result.data).toBe('2026-03-24')
    expect(result.hora).toBe('23:30:00')
  })

  it('03:01 UTC dia 25 → 00:01 dia 25 em Belém', () => {
    const result = extrairDataHoraLocal('2026-03-25T03:01:00Z', 'America/Belem')
    expect(result.data).toBe('2026-03-25')
    expect(result.hora).toBe('00:01:00')
  })

  // ============================================================================
  // ERROS
  // ============================================================================

  it('timestamp inválido "not-a-date" → throws Error', () => {
    expect(() => extrairDataHoraLocal('not-a-date')).toThrow('Timestamp inválido')
  })

  // ============================================================================
  // MAIS CONVERSÕES UTC-3
  // ============================================================================

  it('12:00 UTC → 09:00 em Belém (UTC-3)', () => {
    const result = extrairDataHoraLocal('2026-06-15T12:00:00Z', 'America/Belem')
    expect(result.data).toBe('2026-06-15')
    expect(result.hora).toBe('09:00:00')
  })

  it('meia-noite UTC → 21:00 dia anterior em Belém', () => {
    const result = extrairDataHoraLocal('2026-03-24T00:00:00Z', 'America/Belem')
    expect(result.data).toBe('2026-03-23')
    expect(result.hora).toBe('21:00:00')
  })

  // ============================================================================
  // TIMEZONE EXPLÍCITO: AMERICA/SAO_PAULO (UTC-3, mesmo offset que Belém)
  // ============================================================================

  it('timezone America/Sao_Paulo: 23:30 UTC → 20:30 (mesmos resultados que Belém)', () => {
    const result = extrairDataHoraLocal('2026-03-24T23:30:00Z', 'America/Sao_Paulo')
    expect(result.data).toBe('2026-03-24')
    expect(result.hora).toBe('20:30:00')
  })

  it('timezone America/Sao_Paulo: meia-noite UTC → 21:00 dia anterior', () => {
    const result = extrairDataHoraLocal('2026-03-24T00:00:00Z', 'America/Sao_Paulo')
    expect(result.data).toBe('2026-03-23')
    expect(result.hora).toBe('21:00:00')
  })

  // ============================================================================
  // TIMEZONE PADRÃO
  // ============================================================================

  it('usa TIMEZONE_PADRAO (America/Belem) quando não especificado', () => {
    expect(TIMEZONE_PADRAO).toBe('America/Belem')
    const result = extrairDataHoraLocal('2026-03-24T23:30:00Z')
    expect(result.data).toBe('2026-03-24')
    expect(result.hora).toBe('20:30:00')
  })
})
