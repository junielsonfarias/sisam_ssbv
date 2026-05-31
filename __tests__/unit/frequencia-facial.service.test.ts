/**
 * Testes da propagacao de presenca facial -> frequencia_hora_aula.
 *
 * Regra: anos iniciais (creche-5o) skip; anos finais (6o-9o) propaga
 * via INSERT em frequencia_hora_aula com ON CONFLICT preservando
 * lancamentos manuais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { propagarPresencaFacialParaHoraAula } from '@/lib/services/frequencia-facial.service'

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

function criarMockClient(rowCount: number = 0) {
  return {
    query: vi.fn().mockResolvedValue({ rowCount, rows: [] }),
    release: vi.fn(),
  } as any
}

describe('propagarPresencaFacialParaHoraAula', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serie null -> skip com motivo serie_desconhecida', async () => {
    const client = criarMockClient()
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: null,
    })
    expect(r.propagado).toBe(false)
    expect(r.motivo_skip).toBe('serie_desconhecida')
    expect(client.query).not.toHaveBeenCalled()
  })

  it('1o ano (anos iniciais) -> skip', async () => {
    const client = criarMockClient()
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: '1º ano',
    })
    expect(r.propagado).toBe(false)
    expect(r.motivo_skip).toBe('serie_anos_iniciais')
    expect(client.query).not.toHaveBeenCalled()
  })

  it('5o ano (anos iniciais) -> skip', async () => {
    const client = criarMockClient()
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: '5',
    })
    expect(r.propagado).toBe(false)
    expect(r.motivo_skip).toBe('serie_anos_iniciais')
  })

  it('Creche/Pre (sem numero) -> skip', async () => {
    const client = criarMockClient()
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: 'Creche',
    })
    expect(r.propagado).toBe(false)
    expect(client.query).not.toHaveBeenCalled()
  })

  it('6o ano sem horario cadastrado -> rowCount 0 -> motivo sem_horario', async () => {
    const client = criarMockClient(0)
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: '6º ano',
    })
    expect(r.propagado).toBe(false)
    expect(r.aulas_marcadas).toBe(0)
    expect(r.motivo_skip).toBe('sem_horario')
    expect(client.query).toHaveBeenCalledTimes(1)
  })

  it('9o ano com 5 aulas no dia -> propagado=true, aulas_marcadas=5', async () => {
    const client = criarMockClient(5)
    const r = await propagarPresencaFacialParaHoraAula(client, {
      aluno_id: 'aluno-1', turma_id: 'turma-1', data: '2026-06-02', serie: '9º ano',
      usuario_id: 'user-1',
    })
    expect(r.propagado).toBe(true)
    expect(r.aulas_marcadas).toBe(5)
    expect(r.motivo_skip).toBeUndefined()

    // Verifica que a query usa EXTRACT(DOW) e ON CONFLICT correto
    const [sql, params] = client.query.mock.calls[0]
    expect(sql).toContain('horarios_aula')
    expect(sql).toContain('frequencia_hora_aula')
    expect(sql).toContain("'facial'")
    expect(sql).toContain('ON CONFLICT (aluno_id, data, numero_aula)')
    expect(sql).toContain("metodo = 'facial'") // preserva lancamento manual
    expect(params).toEqual(['turma-1', 'aluno-1', '2026-06-02', 'user-1'])
  })

  it('6, 7, 8, 9 sao todos anos finais', async () => {
    for (const s of ['6', '7', '8', '9', '6º', '7º ano', '8 ano', '9º Ano']) {
      const client = criarMockClient(2)
      const r = await propagarPresencaFacialParaHoraAula(client, {
        aluno_id: 'a', turma_id: 't', data: '2026-05-31', serie: s,
      })
      expect(r.propagado).toBe(true)
      expect(r.aulas_marcadas).toBe(2)
    }
  })
})
