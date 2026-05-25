import { describe, it, expect } from 'vitest'
import { avaliarSenha, senhaForte } from '@/lib/utils/senha-forca'

describe('senha-forca — validações', () => {
  it('rejeita senha vazia', () => {
    const r = avaliarSenha('')
    expect(r.valida).toBe(false)
    expect(r.pontuacao).toBe(0)
  })

  it('rejeita senha curta', () => {
    const r = avaliarSenha('Ab1!ef')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('12 caracteres'))).toBe(true)
  })

  it('rejeita sem maiúscula', () => {
    const r = avaliarSenha('abc123!@#defg')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('maiúscula'))).toBe(true)
  })

  it('rejeita sem minúscula', () => {
    const r = avaliarSenha('ABC123!@#DEFG')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('minúscula'))).toBe(true)
  })

  it('rejeita sem número', () => {
    const r = avaliarSenha('AbcDef!@#XyZ')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('número'))).toBe(true)
  })

  it('rejeita sem símbolo', () => {
    const r = avaliarSenha('AbcDef123XyZ')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('símbolo'))).toBe(true)
  })

  it('rejeita senha comum', () => {
    const r = avaliarSenha('Password123!')
    expect(r.valida).toBe(false)
  })

  it('rejeita sequências óbvias', () => {
    const r = avaliarSenha('Abc12345!@#X')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('sequências'))).toBe(true)
  })

  it('rejeita caracteres repetidos', () => {
    const r = avaliarSenha('Abaaaa1!@#XyZ')
    expect(r.valida).toBe(false)
    expect(r.problemas.some((p) => p.includes('sequências'))).toBe(true)
  })

  it('aceita senha forte', () => {
    const r = avaliarSenha('Pq#9mLwT3Yr$kF')
    expect(r.valida).toBe(true)
    expect(r.pontuacao).toBeGreaterThanOrEqual(4)
  })

  it('senha excelente (16+ chars com tudo)', () => {
    const r = avaliarSenha('Pq#9mLwT3Yr$kF2x')
    expect(r.valida).toBe(true)
    expect(r.pontuacao).toBe(5)
    expect(r.rotulo).toBe('Excelente')
  })

  it('helper senhaForte', () => {
    expect(senhaForte('Pq#9mLwT3Yr$kF')).toBe(true)
    expect(senhaForte('senha123')).toBe(false)
    expect(senhaForte('')).toBe(false)
  })
})
