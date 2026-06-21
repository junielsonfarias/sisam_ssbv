/**
 * Testes de integração — GET /api/boletim (boletim público)
 *
 * ADR-003 (A2 — seção complementar SISAM no boletim):
 *   - O endpoint expõe `avaliacoes_sisam` lido de `vw_boletim_resultados_sisam`
 *     (JOIN resultados_consolidados × avaliacoes via avaliacao_id).
 *   - Nota escolar (notas_escolares) NÃO é alterada e NÃO carrega avaliacao_id.
 *   - PG devolve colunas `numeric` como string — o handler converte antes de
 *     expor (regressão: armadilha §8 do contexto).
 *   - Quando não há resultado SISAM para o aluno/ano, `avaliacoes_sisam` deve
 *     ser um array vazio (nunca ausente do payload — quebra clientes).
 *
 * Cobre:
 *   1. Caminho feliz: payload inclui `avaliacoes_sisam` com campos convertidos.
 *   2. Regressão ADR-003: query SISAM aponta para a view (sem JOIN inline).
 *   3. Aluno sem resultado SISAM: `avaliacoes_sisam` é array vazio.
 *   4. Campos numéricos PG (string) convertidos para number no payload.
 *   5. Sem código nem CPF+data → 404 genérico (anti-enumeração, mantido).
 *   6. CPF inválido (< 11 dígitos) → 404 genérico (mantido).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks ---

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheKey: vi.fn((...parts: string[]) => parts.join(':')),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// ---------------------------------------------------------------- imports ---

import { GET } from '@/app/api/boletim/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

// --------------------------------------------------------------- fixtures ---

const ALUNO_ID = 'aluno-uuid-001'
const ANO = '2026'

const rowAluno = {
  id: ALUNO_ID,
  nome: 'João da Silva',
  codigo: 'ALU001',
  serie: '5º Ano EF',
  ano_letivo: ANO,
  situacao: 'cursando',
  pcd: false,
  data_nascimento: '2016-03-10',
  turma_id: 'turma-uuid-001',
  escola_id: 'escola-uuid-001',
  escola_nome: 'EM Teste',
  turma_codigo: '5A',
  turma_nome: '5º Ano A',
  turma_serie: '5',
}

/** Linha retornada pela view vw_boletim_resultados_sisam (numerics como string, padrão PG). */
function rowSisamView(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    nota_lp:            '7.50',
    nota_mat:           '8.00',
    nota_ch:            null,
    nota_cn:            null,
    nota_producao:      '6.00',
    media_aluno:        '7.16',
    presenca:           true,
    nivel_aprendizagem: 'adequado',
    total_acertos_lp:   '12',
    total_acertos_mat:  '15',
    total_acertos_ch:   null,
    total_acertos_cn:   null,
    avaliacao_nome:     'Avaliação Diagnóstica 2026',
    avaliacao_tipo:     'diagnostica',
    ...overrides,
  }
}

const emptyRows = { rows: [], rowCount: 0 } as any

/**
 * Monta uma sequência de mocks `pool.query` para o caminho feliz do /api/boletim.
 * Ordem das queries no handler (Promise.all em boletim/route.ts):
 *   [0] aluno (por código)
 *   [1] disciplinas
 *   [2] periodos letivos
 *   [3] notas_escolares
 *   [4] vw_boletim_resultados_sisam (SISAM)
 *   [5] frequencia (CTE)
 *   [6] frequencia_diaria
 */
function setupMocks(sisamRows: unknown[] = [rowSisamView()]) {
  mockPool.query
    // [0] busca do aluno por código
    .mockResolvedValueOnce({ rows: [rowAluno], rowCount: 1 } as any)
    // [1] disciplinas
    .mockResolvedValueOnce({
      rows: [{ id: 'd-port', nome: 'Língua Portuguesa', codigo: 'LP', abreviacao: 'LP', ordem: 1 }],
      rowCount: 1,
    } as any)
    // [2] periodos letivos
    .mockResolvedValueOnce({
      rows: [{ id: 'p1', nome: '1º Bimestre', tipo: 'bimestre', numero: 1, data_inicio: '2026-02-01', data_fim: '2026-04-30' }],
      rowCount: 1,
    } as any)
    // [3] notas_escolares
    .mockResolvedValueOnce({
      rows: [{
        nota_final: '7.0', nota_recuperacao: null, faltas: 0,
        disciplina_id: 'd-port', periodo_id: 'p1',
        disciplina: 'Língua Portuguesa', abreviacao: 'LP', disciplina_codigo: 'LP',
        periodo: '1º Bimestre', periodo_numero: 1,
      }],
      rowCount: 1,
    } as any)
    // [4] vw_boletim_resultados_sisam
    .mockResolvedValueOnce({ rows: sisamRows, rowCount: sisamRows.length } as any)
    // [5] frequencia (CTE) — usando safeQuery, pode retornar vazio sem erro
    .mockResolvedValueOnce(emptyRows)
    // [6] frequencia_diaria
    .mockResolvedValueOnce(emptyRows)
}

/**
 * Cria requisição com IP único por teste para contornar o rate limiter
 * em memória (BOLETIM_MAX = 5 req por janela de 15 min).
 * O IP "x-forwarded-for" é extraído pelo handler; passamos um valor
 * único por chamada para que cada teste parta de um contador zerado.
 */
let reqCounter = 0
function makeReq(params: string) {
  const ip = `10.0.0.${(++reqCounter % 250) + 1}`
  return new NextRequest(new URL(`/api/boletim?${params}`, 'http://localhost:3000'), {
    headers: { 'x-forwarded-for': ip },
  })
}

// --------------------------------------------------------------- testes ---

describe('GET /api/boletim — ADR-003: seção complementar SISAM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------- 1 ---
  it('caminho feliz: payload inclui avaliacoes_sisam com campos corretos', async () => {
    setupMocks()
    const res = await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))
    expect(res.status).toBe(200)

    const body = await res.json()

    // Seção SISAM presente e com exatamente 1 entrada
    expect(body).toHaveProperty('avaliacoes_sisam')
    expect(Array.isArray(body.avaliacoes_sisam)).toBe(true)
    expect(body.avaliacoes_sisam).toHaveLength(1)

    const sisam = body.avaliacoes_sisam[0]
    expect(sisam.avaliacao).toBe('Avaliação Diagnóstica 2026')
    expect(sisam.tipo).toBe('diagnostica')
    expect(sisam.presenca).toBe(true)
    expect(sisam.nivel).toBe('adequado')
  })

  // ---------------------------------------------------------------- 2 ---
  it('regressão ADR-003: query SISAM usa vw_boletim_resultados_sisam (não JOIN inline)', async () => {
    setupMocks()
    await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))

    // Verificar que ALGUMA query referenciou a view (e não resultados_consolidados diretamente)
    const queries = mockPool.query.mock.calls.map((c) => String(c[0]))
    const querySisam = queries.find((q) => q.includes('vw_boletim_resultados_sisam'))
    expect(querySisam).toBeDefined()

    // E garantir que NÃO há JOIN entre resultados_consolidados e avaliacoes de forma inline
    // (o ADR-003 delega o JOIN para a view)
    const queryDiretaJoin = queries.find(
      (q) => q.includes('resultados_consolidados') && q.includes('INNER JOIN') && q.includes('avaliacoes')
    )
    expect(queryDiretaJoin).toBeUndefined()
  })

  // ---------------------------------------------------------------- 3 ---
  it('aluno sem resultado SISAM: avaliacoes_sisam é array vazio (nunca ausente)', async () => {
    setupMocks([])  // sem linhas SISAM
    const res = await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('avaliacoes_sisam')
    expect(Array.isArray(body.avaliacoes_sisam)).toBe(true)
    expect(body.avaliacoes_sisam).toHaveLength(0)
  })

  // ---------------------------------------------------------------- 4 ---
  it('regressão §8: campos numeric PG (devolvidos como string) são convertidos para number', async () => {
    setupMocks()
    const res = await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))
    expect(res.status).toBe(200)

    const body = await res.json()
    const sisam = body.avaliacoes_sisam[0]

    // PG devolve numeric como string; o handler deve converter para number
    expect(typeof sisam.nota_lp).toBe('number')
    expect(typeof sisam.nota_mat).toBe('number')
    expect(typeof sisam.nota_producao).toBe('number')
    expect(typeof sisam.media).toBe('number')
    expect(typeof sisam.acertos_lp).toBe('number')
    expect(typeof sisam.acertos_mat).toBe('number')

    // Verificar valores corretos pós-conversão
    expect(sisam.nota_lp).toBeCloseTo(7.5)
    expect(sisam.nota_mat).toBeCloseTo(8.0)
    expect(sisam.media).toBeCloseTo(7.16)
    expect(sisam.acertos_lp).toBe(12)
    expect(sisam.acertos_mat).toBe(15)
  })

  // ---------------------------------------------------------------- 5 ---
  it('campos nullable (nota_ch, nota_cn) chegam como null (não NaN)', async () => {
    setupMocks()
    const res = await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))
    expect(res.status).toBe(200)

    const body = await res.json()
    const sisam = body.avaliacoes_sisam[0]

    // nota_ch e nota_cn são null na fixture — devem permanecer null
    expect(sisam.nota_ch).toBeNull()
    expect(sisam.nota_cn).toBeNull()
    // acertos null → parseInt(null) = NaN → || 0, portanto 0
    expect(sisam.acertos_ch).toBe(0)
    expect(sisam.acertos_cn).toBe(0)
  })

  // ---------------------------------------------------------------- 6 ---
  it('sem código nem CPF+data retorna 404 genérico (anti-enumeração mantido)', async () => {
    const res = await GET(makeReq(`ano_letivo=${ANO}`))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toBe('Dados não encontrados')
  })

  // ---------------------------------------------------------------- 7 ---
  it('CPF com menos de 11 dígitos retorna 404 genérico (anti-enumeração mantido)', async () => {
    const res = await GET(makeReq(`cpf=12345&data_nascimento=2016-03-10&ano_letivo=${ANO}`))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toBe('Dados não encontrados')
  })

  // ---------------------------------------------------------------- 8 ---
  it('seção SISAM independente de notas_escolares (nota escolar NÃO tem avaliacao_id)', async () => {
    setupMocks()
    await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))

    const queries = mockPool.query.mock.calls.map((c) => String(c[0]))
    // Nenhuma query em notas_escolares deve referenciar avaliacao_id
    const queryNotas = queries.find((q) => q.includes('notas_escolares'))
    expect(queryNotas).toBeDefined()
    expect(queryNotas).not.toContain('avaliacao_id')
  })

  // ---------------------------------------------------------------- 9 ---
  it('múltiplas avaliações SISAM no ano: todas são retornadas ordenadas', async () => {
    const sisamRows = [
      rowSisamView({ avaliacao_nome: 'Avaliação Diagnóstica', avaliacao_tipo: 'diagnostica' }),
      rowSisamView({ avaliacao_nome: 'Avaliação Final', avaliacao_tipo: 'final' }),
    ]
    setupMocks(sisamRows)

    const res = await GET(makeReq(`codigo=ALU001&ano_letivo=${ANO}`))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.avaliacoes_sisam).toHaveLength(2)
    expect(body.avaliacoes_sisam[0].avaliacao).toBe('Avaliação Diagnóstica')
    expect(body.avaliacoes_sisam[1].avaliacao).toBe('Avaliação Final')
  })
})
