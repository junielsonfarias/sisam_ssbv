/**
 * Testes do classificador de eventos do terminal facial.
 *
 * Quando ha horario de turma cadastrado (~98% dos casos), o classificador
 * usa o ponto medio do turno como divisor entre lado entrada e lado
 * saida. Para turma integral / sem horario, cai no fallback de janela
 * de 30min.
 */
import { describe, it, expect } from 'vitest'
import {
  classificarEvento,
  calcularJanelaTurno,
  JANELA_DUPLICADO_MIN,
  type HorarioTurma,
} from '@/lib/services/presenca-facial-eventos.service'

const MATUTINO: HorarioTurma = { turno: 'matutino', hora_inicio: '07:00', hora_fim: '12:00' }
const VESPERTINO: HorarioTurma = { turno: 'vespertino', hora_inicio: '13:00', hora_fim: '17:30' }
// turma sem horario explicito mas com turno conhecido — usa default por turno
const MATUTINO_SEM_HORA: HorarioTurma = { turno: 'matutino', hora_inicio: null, hora_fim: null }
// integral nao tem default — cai no fallback de janela
const INTEGRAL: HorarioTurma = { turno: 'integral', hora_inicio: null, hora_fim: null }
const SEM_TURNO: HorarioTurma = { turno: null, hora_inicio: null, hora_fim: null }

function dt(h: number, m: number = 0): Date {
  const d = new Date(2026, 4, 31, h, m, 0)
  return d
}

describe('calcularJanelaTurno', () => {
  it('usa hora_inicio/fim quando ambos cadastrados', () => {
    const j = calcularJanelaTurno(MATUTINO)
    expect(j).toEqual({ inicio: 7 * 60, fim: 12 * 60, meio: Math.floor((7 * 60 + 12 * 60) / 2) })
  })

  it('cai no default por turno quando hora_inicio/fim nulos', () => {
    const j = calcularJanelaTurno(MATUTINO_SEM_HORA)
    expect(j?.inicio).toBe(7 * 60)
    expect(j?.fim).toBe(12 * 60)
  })

  it('integral nao tem default -> retorna null (vai pro fallback de janela)', () => {
    expect(calcularJanelaTurno(INTEGRAL)).toBeNull()
  })

  it('sem turno e sem horas -> null', () => {
    expect(calcularJanelaTurno(SEM_TURNO)).toBeNull()
  })

  it('hora_fim <= hora_inicio -> null (defensivo)', () => {
    expect(calcularJanelaTurno({ turno: null, hora_inicio: '12:00', hora_fim: '07:00' })).toBeNull()
  })

  it('aceita HH:MM:SS (formato PG TIME)', () => {
    expect(calcularJanelaTurno({ turno: null, hora_inicio: '07:00:00', hora_fim: '12:00:00' })?.inicio).toBe(420)
  })
})

describe('classificarEvento — turma com horario (matutino 7-12, meio 9:30)', () => {
  it('cenario do usuario: 7:00 entrada + 7:15 -> duplicado (mesmo lado)', () => {
    expect(classificarEvento(null, dt(7, 0), MATUTINO)).toBe('entrada')
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 15), MATUTINO)).toBe('duplicado')
  })

  it('7:00 entrada + 8:30 -> duplicado (ainda lado entrada, antes do meio 9:30)', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(8, 30), MATUTINO)).toBe('duplicado')
  })

  it('7:00 entrada + 9:35 -> saida (apos meio 9:30, ja conta como saida)', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(9, 35), MATUTINO)).toBe('saida')
  })

  it('7:00 entrada + 11:30 -> saida (claramente lado saida)', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(11, 30), MATUTINO)).toBe('saida')
  })

  it('saida + scan logo apos -> duplicado (mesmo lado saida)', () => {
    expect(classificarEvento({ tipo: 'saida', registrado_em: dt(11, 30).toISOString() }, dt(11, 32), MATUTINO)).toBe('duplicado')
  })

  it('vespertino: 13:00 entrada + 13:30 -> duplicado', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(13, 0).toISOString() }, dt(13, 30), VESPERTINO)).toBe('duplicado')
  })

  it('vespertino: meio em 15:15 — 13:00 entrada + 15:20 -> saida', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(13, 0).toISOString() }, dt(15, 20), VESPERTINO)).toBe('saida')
  })

  it('turno matutino SEM hora explicita usa default 7-12 do helper', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 15), MATUTINO_SEM_HORA)).toBe('duplicado')
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(11, 30), MATUTINO_SEM_HORA)).toBe('saida')
  })
})

describe('classificarEvento — fallback de janela (integral / sem turno)', () => {
  it('janela e de 30 minutos', () => {
    expect(JANELA_DUPLICADO_MIN).toBe(30)
  })

  it('integral: 7:00 entrada + 7:15 -> duplicado (delta < 30min)', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 15), INTEGRAL)).toBe('duplicado')
  })

  it('integral: 7:00 entrada + 7:35 -> saida (delta >= 30min)', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 35), INTEGRAL)).toBe('saida')
  })

  it('integral: pode haver volta apos pausa de 30min+', () => {
    expect(classificarEvento({ tipo: 'saida', registrado_em: dt(11, 30).toISOString() }, dt(13, 30), INTEGRAL)).toBe('entrada')
  })

  it('sem turno e sem horario tambem cai no fallback', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 15), SEM_TURNO)).toBe('duplicado')
  })

  it('horarioTurma nao informado -> fallback', () => {
    expect(classificarEvento({ tipo: 'entrada', registrado_em: dt(7, 0).toISOString() }, dt(7, 15))).toBe('duplicado')
  })
})

describe('classificarEvento — caso defensivo', () => {
  it('ultimo=duplicado nao deveria vir do banco — devolve duplicado sem quebrar', () => {
    expect(classificarEvento({ tipo: 'duplicado', registrado_em: dt(7, 0).toISOString() }, dt(8, 0), MATUTINO)).toBe('duplicado')
  })

  it('matutino: sem evento anterior, scan as 14h (raro/erro) -> entrada (admin ajusta)', () => {
    // Estamos depois do meio (9:30), mas sem ultimo evento; vira entrada
    // (caso raro de aluno que so veio para algo no contraturno).
    expect(classificarEvento(null, dt(14, 0), MATUTINO)).toBe('entrada')
  })
})
