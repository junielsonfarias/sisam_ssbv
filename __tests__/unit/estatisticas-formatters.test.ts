/**
 * Testes unitários — estatisticas/formatters
 *
 * Cobre: executarQuerySegura, determinarEscopo, montarFiltroEscopo, getEstatisticasPadrao.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executarQuerySegura,
  determinarEscopo,
  montarFiltroEscopo,
  getEstatisticasPadrao,
} from '@/lib/services/estatisticas/formatters'
import type { Usuario } from '@/lib/types'

// Mock do logger e observabilidade para não poluir saída de teste
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/observabilidade/capturar-erro-silencioso', () => ({
  reportarErroSilencioso: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  PRESENCA: { PRESENTE: 'P', FALTOU: 'F' },
}))

// ============================================================================
// executarQuerySegura
// ============================================================================

describe('executarQuerySegura', () => {
  it('retorna { sucesso: true, dados } quando a função resolve', async () => {
    const fn = vi.fn().mockResolvedValue([{ id: '1' }])
    const r = await executarQuerySegura(fn, 'teste')
    expect(r.sucesso).toBe(true)
    expect(r.dados).toEqual([{ id: '1' }])
    expect(r.erro).toBeUndefined()
  })

  it('retorna { sucesso: false, erro } quando a função rejeita', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('falha de banco'))
    const r = await executarQuerySegura(fn, 'teste falho')
    expect(r.sucesso).toBe(false)
    expect(r.erro).toBe('falha de banco')
    expect(r.dados).toBeUndefined()
  })

  it('trata erro não-Error como string genérica', async () => {
    const fn = vi.fn().mockRejectedValue('string de erro')
    const r = await executarQuerySegura(fn, 'erro string')
    expect(r.sucesso).toBe(false)
    expect(r.erro).toBe('Erro desconhecido')
  })

  it('chama a função exatamente uma vez', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    await executarQuerySegura(fn, 'contagem')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// determinarEscopo
// ============================================================================

describe('determinarEscopo', () => {
  function makeUsuario(tipo: string): Usuario {
    return {
      id: 'u1',
      nome: 'Teste',
      email: 't@t.com',
      tipo_usuario: tipo as Usuario['tipo_usuario'],
      polo_id: null,
      escola_id: null,
      ativo: true,
      criado_em: new Date(),
      atualizado_em: new Date(),
    }
  }

  it('administrador → escopo global', () => {
    expect(determinarEscopo(makeUsuario('administrador'))).toBe('global')
  })

  it('tecnico → escopo global', () => {
    expect(determinarEscopo(makeUsuario('tecnico'))).toBe('global')
  })

  it('"admin" legado → escopo global', () => {
    // tipo legado aceito pelo cast para string
    expect(determinarEscopo(makeUsuario('admin'))).toBe('global')
  })

  it('polo → escopo polo', () => {
    expect(determinarEscopo(makeUsuario('polo'))).toBe('polo')
  })

  it('escola → escopo escola', () => {
    expect(determinarEscopo(makeUsuario('escola'))).toBe('escola')
  })

  it('professor → escopo escola (default)', () => {
    expect(determinarEscopo(makeUsuario('professor'))).toBe('escola')
  })

  it('editor → escopo escola (default)', () => {
    expect(determinarEscopo(makeUsuario('editor'))).toBe('escola')
  })
})

// ============================================================================
// montarFiltroEscopo
// ============================================================================

describe('montarFiltroEscopo', () => {
  it('escopo global → where vazio, params vazio', () => {
    const r = montarFiltroEscopo('global', { poloId: 'polo-1', escolaId: 'esc-1' })
    expect(r.where).toBe('')
    expect(r.params).toHaveLength(0)
  })

  it('escopo polo com poloId → where usando alias escola', () => {
    const r = montarFiltroEscopo('polo', { poloId: 'polo-abc' })
    expect(r.where).toContain('polo_id')
    expect(r.where).toContain('$1')
    expect(r.params).toEqual(['polo-abc'])
  })

  it('escopo polo sem poloId → where vazio', () => {
    const r = montarFiltroEscopo('polo', { poloId: null })
    expect(r.where).toBe('')
    expect(r.params).toHaveLength(0)
  })

  it('escopo escola com escolaId → where usando alias resultado', () => {
    const r = montarFiltroEscopo('escola', { escolaId: 'esc-xyz' })
    expect(r.where).toContain('escola_id')
    expect(r.where).toContain('$1')
    expect(r.params).toEqual(['esc-xyz'])
  })

  it('escopo escola sem escolaId → where vazio', () => {
    const r = montarFiltroEscopo('escola', { escolaId: null })
    expect(r.where).toBe('')
  })

  it('respeita aliases customizados', () => {
    const r = montarFiltroEscopo('polo', { poloId: 'p1' }, 'escolas', 'resultados')
    expect(r.where).toContain('escolas.polo_id')
  })

  it('escopo escola usa aliasResultado customizado', () => {
    const r = montarFiltroEscopo('escola', { escolaId: 'e1' }, 'e', 'res')
    expect(r.where).toContain('res.escola_id')
  })
})

// ============================================================================
// getEstatisticasPadrao
// ============================================================================

describe('getEstatisticasPadrao', () => {
  it('retorna objeto com todos os campos zerados', () => {
    const r = getEstatisticasPadrao()

    expect(r.totalEscolas).toBe(0)
    expect(r.totalResultados).toBe(0)
    expect(r.totalAlunos).toBe(0)
    expect(r.totalAlunosAvaliados).toBe(0)
    expect(r.totalTurmas).toBe(0)
    expect(r.totalAlunosPresentes).toBe(0)
    expect(r.totalAlunosFaltantes).toBe(0)
    expect(r.mediaGeral).toBe(0)
    expect(r.taxaAprovacao).toBe(0)
    expect(r.mediaAnosIniciais).toBe(0)
    expect(r.mediaAnosFinais).toBe(0)
    expect(r.totalAnosIniciais).toBe(0)
    expect(r.totalAnosFinais).toBe(0)
    expect(r.mediaLp).toBe(0)
    expect(r.mediaMat).toBe(0)
    expect(r.mediaProd).toBe(0)
    expect(r.mediaCh).toBe(0)
    expect(r.mediaCn).toBe(0)
  })

  it('retorna novo objeto a cada chamada (sem compartilhamento de referência)', () => {
    const a = getEstatisticasPadrao()
    const b = getEstatisticasPadrao()
    a.totalEscolas = 999
    expect(b.totalEscolas).toBe(0)
  })
})
