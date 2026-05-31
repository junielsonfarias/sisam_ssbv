/**
 * Testes dos helpers de filtros de comparativos.
 */
import { describe, it, expect } from 'vitest'
import {
  construirFiltrosComparativos,
  aplicarRestricaoAcesso,
  getFiltroTipoEnsinoSQL,
  agruparPorSerie,
  encontrarMelhor,
} from '@/lib/services/comparativos/filtros'

function condicoesJoined(w: { conditions: string[] }): string {
  return w.conditions.join(' AND ')
}

describe('construirFiltrosComparativos', () => {
  it('inclui apenas filtros nao vazios', () => {
    const w = construirFiltrosComparativos({
      anoLetivo: '2026',
      avaliacaoId: 'av-1',
      serie: '5',
      escolaId: '',
      turmaId: undefined,
    } as any)
    expect(w.params).toEqual(['2026', 'av-1', '5'])
    const sql = condicoesJoined(w)
    expect(sql).toContain('rc.ano_letivo')
    expect(sql).toContain('rc.avaliacao_id')
    expect(sql).toContain('rc.serie')
    expect(sql).not.toContain('e.id')
    expect(sql).not.toContain('rc.turma_id')
  })

  it('ignora escolaId === "todas" (case-insensitive)', () => {
    const w = construirFiltrosComparativos({
      escolaId: 'Todas',
      anoLetivo: '2026',
    } as any)
    expect(w.params).toEqual(['2026'])
    expect(condicoesJoined(w)).not.toContain('e.id')
  })

  it('ignora escolaId === "undefined" string (vem do query string)', () => {
    const w = construirFiltrosComparativos({
      escolaId: 'undefined',
      turmaId: 'undefined',
    } as any)
    expect(w.params).toEqual([])
  })

  it('respeita startIndex para placeholders', () => {
    const w = construirFiltrosComparativos({ anoLetivo: '2026' } as any, 5)
    expect(condicoesJoined(w)).toContain('$5')
  })
})

describe('aplicarRestricaoAcesso', () => {
  function builder() {
    return construirFiltrosComparativos({ anoLetivo: '2026' } as any)
  }

  it('polo: filtra por polo_id', () => {
    const w = builder()
    aplicarRestricaoAcesso(w, { tipo_usuario: 'polo', polo_id: 'polo-1', escola_id: null } as any)
    expect(w.params).toContain('polo-1')
    expect(condicoesJoined(w)).toContain('e.polo_id')
  })

  it('escola: filtra por escola_id', () => {
    const w = builder()
    aplicarRestricaoAcesso(w, { tipo_usuario: 'escola', polo_id: null, escola_id: 'esc-1' } as any)
    expect(w.params).toContain('esc-1')
    expect(condicoesJoined(w)).toContain('e.id')
  })

  it('admin/tecnico: nao adiciona restricao', () => {
    const w = builder()
    const beforeParams = w.params.length
    aplicarRestricaoAcesso(w, { tipo_usuario: 'administrador' } as any)
    aplicarRestricaoAcesso(w, { tipo_usuario: 'tecnico' } as any)
    expect(w.params.length).toBe(beforeParams)
  })

  it('polo sem polo_id: nao adiciona restricao (defensivo)', () => {
    const w = builder()
    const before = w.params.length
    aplicarRestricaoAcesso(w, { tipo_usuario: 'polo', polo_id: null, escola_id: null } as any)
    expect(w.params.length).toBe(before)
  })
})

describe('getFiltroTipoEnsinoSQL', () => {
  it('anos_iniciais filtra series 2/3/5', () => {
    expect(getFiltroTipoEnsinoSQL('anos_iniciais')).toContain("IN ('2', '3', '5')")
  })

  it('anos_finais filtra series 6-9', () => {
    expect(getFiltroTipoEnsinoSQL('anos_finais')).toContain("IN ('6', '7', '8', '9')")
  })

  it('nulo/undefined retorna string vazia', () => {
    expect(getFiltroTipoEnsinoSQL(null)).toBe('')
    expect(getFiltroTipoEnsinoSQL(undefined)).toBe('')
    expect(getFiltroTipoEnsinoSQL('')).toBe('')
  })

  it('tipo desconhecido retorna string vazia', () => {
    expect(getFiltroTipoEnsinoSQL('xpto')).toBe('')
  })
})

describe('agruparPorSerie', () => {
  it('agrupa rows pelo campo serie', () => {
    const rows = [
      { serie: '5', nome: 'Ana' },
      { serie: '5', nome: 'Bia' },
      { serie: '7', nome: 'Caio' },
    ]
    const out = agruparPorSerie(rows)
    expect(out['5']).toHaveLength(2)
    expect(out['7']).toHaveLength(1)
  })

  it('rows sem serie viram chave "Sem série"', () => {
    const out = agruparPorSerie([{ nome: 'X' }, { serie: null, nome: 'Y' }])
    expect(out['Sem série']).toHaveLength(2)
  })

  it('input vazio retorna objeto vazio', () => {
    expect(agruparPorSerie([])).toEqual({})
  })
})

describe('encontrarMelhor', () => {
  it('retorna aluno com maior valor do campo', () => {
    const alunos = [
      { nome: 'A', nota: 7 },
      { nome: 'B', nota: 9 },
      { nome: 'C', nota: 8.5 },
    ]
    expect(encontrarMelhor(alunos, 'nota').nome).toBe('B')
  })

  it('trata strings numericas via parseFloat', () => {
    const alunos = [
      { nome: 'A', nota: '7.5' },
      { nome: 'B', nota: '9.0' },
    ]
    expect(encontrarMelhor(alunos, 'nota').nome).toBe('B')
  })

  it('valores nao numericos tratados como 0', () => {
    const alunos = [
      { nome: 'A', nota: 'NaN' },
      { nome: 'B', nota: 0.5 },
    ]
    expect(encontrarMelhor(alunos, 'nota').nome).toBe('B')
  })
})
