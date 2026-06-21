import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Prova o comportamento NOVO do UPSERT de notas_escolares (MELHORIA B / Parte 1):
 * o conflict target deve usar COALESCE(disciplina_id, sentinela) para inferir o
 * indice de expressao notas_escolares_upsert_uidx. Sem isso, parecer descritivo
 * com disciplina_id NULL nao deduplica (NULL nunca conflita na UNIQUE padrao) e
 * o lancamento geraria linhas DUPLICADAS em vez de atualizar.
 *
 * Estrategia: mockar o pool (snapshot anterior), o withTransaction (executa o
 * callback com um client fake) e o dual-write (no-op). Capturamos a string SQL
 * do INSERT ... ON CONFLICT e asseguramos que usa COALESCE — e NAO o conflict
 * target ingenuo (aluno_id, disciplina_id, periodo_id).
 */

// SQL capturado do INSERT principal
let sqlCapturado = ''

vi.mock('@/database/connection', () => ({
  default: {
    // snapshot das notas anteriores (passo 1b) — sem linhas anteriores
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  },
}))

vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: vi.fn(async (fn: (client: any) => Promise<any>) => {
    const client = {
      query: vi.fn(async (text: string) => {
        if (typeof text === 'string' && text.includes('INSERT INTO notas_escolares')) {
          sqlCapturado = text
          return { rows: [{ id: 'nota-1', aluno_id: 'aluno-1' }], rowCount: 1 }
        }
        return { rows: [], rowCount: 0 }
      }),
    }
    return fn(client)
  }),
}))

vi.mock('@/lib/services/notas/recuperacao-dual-write', () => ({
  dualWriteRecuperacao: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/notas/auditoria', () => ({
  montarAuditoriaNotas: vi.fn().mockReturnValue([]),
  registrarAuditoriaNotas: vi.fn().mockResolvedValue(undefined),
}))

import { lancarNotas } from '@/lib/services/notas/lancamento'

const SENTINELA = "'00000000-0000-0000-0000-000000000000'::uuid"

const configPadrao = {
  nota_maxima: 10,
  media_aprovacao: 6,
  permite_recuperacao: true,
} as any

describe('lancarNotas — conflict target deduplica disciplina_id NULL', () => {
  beforeEach(() => {
    sqlCapturado = ''
  })

  it('usa COALESCE no ON CONFLICT (infere notas_escolares_upsert_uidx) quando disciplina_id e NULL', async () => {
    const res = await lancarNotas({
      turmaId: 'turma-1',
      disciplinaId: null, // parecer descritivo sem disciplina
      periodoId: 'periodo-1',
      escolaId: 'escola-1',
      anoLetivo: '2026',
      notas: [{ aluno_id: 'aluno-1', parecer_descritivo: 'Otimo desempenho' } as any],
      config: configPadrao,
      registradoPor: 'user-1',
    })

    expect(res.processados).toBe(1)
    expect(sqlCapturado).toContain('ON CONFLICT')
    // Comportamento novo correto: normaliza o NULL via COALESCE para o sentinela.
    expect(sqlCapturado).toContain(`COALESCE(disciplina_id, ${SENTINELA})`)
    // Guarda anti-regressao: NAO pode usar o conflict target ingenuo, que deixa
    // o NULL escapar da deduplicacao.
    expect(sqlCapturado).not.toMatch(/ON CONFLICT \(aluno_id, disciplina_id, periodo_id\)/)
  })

  it('mantem o mesmo conflict target COALESCE tambem com disciplina_id preenchida (comportamento identico)', async () => {
    const res = await lancarNotas({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      periodoId: 'periodo-1',
      escolaId: 'escola-1',
      anoLetivo: '2026',
      notas: [{ aluno_id: 'aluno-1', nota: 8 } as any],
      config: configPadrao,
      registradoPor: 'user-1',
    })

    expect(res.processados).toBe(1)
    expect(sqlCapturado).toContain(`COALESCE(disciplina_id, ${SENTINELA})`)
  })
})
