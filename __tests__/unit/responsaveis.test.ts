import { describe, it, expect } from 'vitest'
import { normalizarCpf } from '@/lib/services/responsaveis.service'

describe('normalizarCpf (Fase 3.1)', () => {
  it('remove máscara e mantém 11 dígitos', () => {
    expect(normalizarCpf('123.456.789-09')).toBe('12345678909')
  })

  it('aceita 11 dígitos puros', () => {
    expect(normalizarCpf('12345678909')).toBe('12345678909')
  })

  it('retorna null para menos de 11 dígitos', () => {
    expect(normalizarCpf('123456')).toBeNull()
  })

  it('retorna null para mais de 11 dígitos', () => {
    expect(normalizarCpf('123456789012')).toBeNull()
  })

  it('retorna null para vazio/null/undefined', () => {
    expect(normalizarCpf('')).toBeNull()
    expect(normalizarCpf(null)).toBeNull()
    expect(normalizarCpf(undefined)).toBeNull()
  })

  it('ignora letras e símbolos, validando só os dígitos', () => {
    expect(normalizarCpf('abc123.456.789-09xyz')).toBe('12345678909')
  })
})
