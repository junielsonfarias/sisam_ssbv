/**
 * Testes de validarModulo — defesa em profundidade contra bypass de
 * acesso a modulos via URL direta (auditoria 30/05/2026).
 */
import { describe, it, expect } from 'vitest'
import { validarModulo } from '@/lib/auth/validar-modulo'

function user(overrides: Partial<{
  tipo_usuario: string
  acesso_sisam: boolean
  acesso_gestor: boolean
  acesso_semed: boolean
  acesso_transparencia: boolean
  acesso_admin: boolean
}> = {}) {
  return {
    tipo_usuario: 'tecnico',
    acesso_sisam: true,
    acesso_gestor: false,
    acesso_semed: false,
    acesso_transparencia: false,
    acesso_admin: false,
    ...overrides,
  } as any
}

describe('validarModulo — administradores', () => {
  it('administrador acessa qualquer modulo independente das flags', () => {
    const u = user({ tipo_usuario: 'administrador', acesso_sisam: false, acesso_gestor: false, acesso_semed: false, acesso_transparencia: false, acesso_admin: false })
    expect(validarModulo(u, 'sisam')).toBe(true)
    expect(validarModulo(u, 'gestor')).toBe(true)
    expect(validarModulo(u, 'semed')).toBe(true)
    expect(validarModulo(u, 'transparencia')).toBe(true)
    expect(validarModulo(u, 'admin')).toBe(true)
  })

  it('tecnico NAO recebe bypass — depende das flags', () => {
    const u = user({ tipo_usuario: 'tecnico', acesso_admin: false })
    expect(validarModulo(u, 'admin')).toBe(false)
  })
})

describe('validarModulo — sisam (default true)', () => {
  it('acesso_sisam = true permite', () => {
    expect(validarModulo(user({ acesso_sisam: true }), 'sisam')).toBe(true)
  })

  it('acesso_sisam undefined ainda permite (retrocompat)', () => {
    const u = user()
    delete (u as any).acesso_sisam
    expect(validarModulo(u, 'sisam')).toBe(true)
  })

  it('acesso_sisam = false bloqueia', () => {
    expect(validarModulo(user({ acesso_sisam: false }), 'sisam')).toBe(false)
  })
})

describe('validarModulo — modulos opt-in (gestor/semed/transparencia/admin)', () => {
  it('default (undefined) bloqueia todos os opt-in', () => {
    const u = user()
    expect(validarModulo(u, 'gestor')).toBe(false)
    expect(validarModulo(u, 'semed')).toBe(false)
    expect(validarModulo(u, 'transparencia')).toBe(false)
    expect(validarModulo(u, 'admin')).toBe(false)
  })

  it('cada flag libera apenas o seu modulo', () => {
    expect(validarModulo(user({ acesso_gestor: true }), 'gestor')).toBe(true)
    expect(validarModulo(user({ acesso_gestor: true }), 'semed')).toBe(false)

    expect(validarModulo(user({ acesso_semed: true }), 'semed')).toBe(true)
    expect(validarModulo(user({ acesso_semed: true }), 'admin')).toBe(false)

    expect(validarModulo(user({ acesso_transparencia: true }), 'transparencia')).toBe(true)
    expect(validarModulo(user({ acesso_admin: true }), 'admin')).toBe(true)
  })

  it('flag === false explicito bloqueia (mesmo significado que undefined)', () => {
    expect(validarModulo(user({ acesso_admin: false }), 'admin')).toBe(false)
  })
})
