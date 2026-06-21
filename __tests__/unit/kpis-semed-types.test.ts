/**
 * Testes unitários — kpis-semed/types
 *
 * Cobre: poloDoUsuario (todos os ramos), interfaces/tipo puro.
 */
import { describe, it, expect } from 'vitest'
import { poloDoUsuario } from '@/lib/services/kpis-semed/types'
import type { UsuarioEscopo } from '@/lib/services/kpis-semed/types'

describe('poloDoUsuario', () => {
  it('retorna polo_id quando tipo_usuario é polo e polo_id existe', () => {
    const usuario: UsuarioEscopo = {
      tipo_usuario: 'polo',
      polo_id: 'polo-abc',
      escola_id: null,
    }
    expect(poloDoUsuario(usuario)).toBe('polo-abc')
  })

  it('retorna null quando tipo_usuario é polo mas polo_id é null', () => {
    const usuario: UsuarioEscopo = {
      tipo_usuario: 'polo',
      polo_id: null,
      escola_id: null,
    }
    expect(poloDoUsuario(usuario)).toBeNull()
  })

  it('retorna null para administrador mesmo com polo_id preenchido', () => {
    const usuario: UsuarioEscopo = {
      tipo_usuario: 'administrador',
      polo_id: 'polo-123',
      escola_id: null,
    }
    expect(poloDoUsuario(usuario)).toBeNull()
  })

  it('retorna null para tecnico', () => {
    const usuario: UsuarioEscopo = {
      tipo_usuario: 'tecnico',
      polo_id: null,
      escola_id: null,
    }
    expect(poloDoUsuario(usuario)).toBeNull()
  })

  it('retorna null para escola', () => {
    const usuario: UsuarioEscopo = {
      tipo_usuario: 'escola',
      polo_id: 'polo-999',
      escola_id: 'esc-1',
    }
    expect(poloDoUsuario(usuario)).toBeNull()
  })

  it('retorna null quando usuario é undefined', () => {
    expect(poloDoUsuario(undefined)).toBeNull()
  })

  it('retorna null quando usuario não tem tipo_usuario', () => {
    expect(poloDoUsuario({} as UsuarioEscopo)).toBeNull()
  })
})
