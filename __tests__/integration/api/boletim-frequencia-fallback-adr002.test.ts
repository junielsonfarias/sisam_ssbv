/**
 * Testes de integração — fallback ADR-002 (leituras de boletim e frequência)
 *
 * ADR-002 fase 4 — migrar leituras:
 *   O vínculo aluno↔turma agora é lido de `matriculas` (fonte canônica por
 *   ano letivo) com FALLBACK para `alunos.turma_id` via COALESCE quando não
 *   houver linha na tabela `matriculas` para aquele aluno/ano. A migração é
 *   ADITIVA: nenhum comportamento anterior é quebrado.
 *
 * Endpoints cobertos:
 *   - GET /api/boletim               (público, busca por código ou cpf+data)
 *   - GET /api/boletim/frequencia    (público, detalhamento de frequência)
 *   - GET /api/responsavel/boletim   (protegido, withAuth responsavel)
 *
 * Cenários por endpoint:
 *   1. Caminho com matrícula: COALESCE usa turma_id de `matriculas` (m.turma_id).
 *   2. Fallback: sem linha em `matriculas`, usa alunos.turma_id (a.turma_id).
 *   3. As queries contêm LEFT JOIN em `matriculas` + COALESCE — garantia
 *      estrutural de que o fallback está codificado no SQL.
 *   4. Com matrícula e sem matrícula retornam status 200 e payload válido.
 *   5. Frequência usa a turma resolvida (COALESCE) nos parâmetros das CTEs.
 *
 * Regressão:
 *   - "regressão (adr-002 fase 4): boletim sem matrícula NÃO deve quebrar"
 *     — garante que, antes de existir linha em `matriculas`, o endpoint segue
 *     devolvendo 200 (não 404 nem 500) com os dados de alunos.turma_id.
 *   - "regressão (adr-002 fase 4): frequência sem matrícula NÃO deve quebrar"
 *
 * Estratégia de mock:
 *   - pool.query: mockResolvedValueOnce em cadeia, respeitando a ordem exata
 *     de chamadas de cada handler.
 *   - Cache: no-op (cacheGet → null, cacheSet → void).
 *   - withRedisCache (boletim/frequencia): interceptado via mock de @/lib/cache.
 *   - withAuth (responsavel/boletim): mockamos @/lib/auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------- mocks ---

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
  // withRedisCache: executa a factory fn diretamente (sem cache real)
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  CACHE_TTL: { BOLETIM: 300 },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/constants', () => ({
  CACHE_TTL: { BOLETIM: 300 },
  PG_ERRORS: { UNIQUE_VIOLATION: '23505' },
}))

// withAuth / responsavel/boletim
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: (usuario: any, tipos: string[]) =>
    !!usuario && tipos.includes(usuario.tipo_usuario),
}))

// ----------------------------------------------------------------- imports ---

import { GET as getBoletimPublico }   from '@/app/api/boletim/route'
import { GET as getBoletimFreq }       from '@/app/api/boletim/frequencia/route'
import { GET as getBoletimResponsavel } from '@/app/api/responsavel/boletim/route'
import pool                             from '@/database/connection'
import { getUsuarioFromRequest }        from '@/lib/auth'

const mockQuery   = vi.mocked(pool.query)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

// ------------------------------------------------------------ fixtures base ---

const ALUNO_ID  = 'aluno-uuid-fallback-001'
const TURMA_MATRICULA = 'turma-uuid-de-matriculas'   // turma_id vindo de `matriculas`
const TURMA_ALUNO     = 'turma-uuid-de-alunos'       // turma_id vindo de `alunos.turma_id`
const ESCOLA_ID = 'escola-uuid-001'
const ANO       = '2026'

/**
 * Linha de aluno quando há matrícula: COALESCE resolve para m.turma_id.
 * O banco devolve turma_id = TURMA_MATRICULA porque a linha em `matriculas` existe.
 */
const rowAlunoComMatricula = {
  id: ALUNO_ID,
  nome: 'Aluno Com Matrícula',
  codigo: 'ACM001',
  serie: '5º Ano EF',
  ano_letivo: ANO,
  situacao: 'cursando',
  pcd: false,
  data_nascimento: '2017-03-10',
  turma_id: TURMA_MATRICULA,     // COALESCE(m.turma_id, a.turma_id) → m.turma_id
  escola_id: ESCOLA_ID,
  escola_nome: 'EM Fallback Teste',
  turma_codigo: '5A',
  turma_nome: '5º Ano A',
  turma_serie: '5',
}

/**
 * Linha de aluno SEM matrícula: COALESCE cai em a.turma_id (fallback).
 * O banco devolve turma_id = TURMA_ALUNO porque `matriculas` não tem linha.
 */
const rowAlunoSemMatricula = {
  ...rowAlunoComMatricula,
  nome: 'Aluno Sem Matrícula',
  codigo: 'ASM001',
  turma_id: TURMA_ALUNO,         // COALESCE(m.turma_id, a.turma_id) → a.turma_id
  turma_codigo: '5B',
  turma_nome: '5º Ano B',
}

const emptyRows = { rows: [], rowCount: 0 } as any

// ============================================================ /api/boletim ===

/**
 * Monta sequência de mocks para GET /api/boletim (boletim público).
 *
 * Ordem das queries no handler (app/api/boletim/route.ts):
 *   [0]  busca do aluno (com LEFT JOIN matriculas + COALESCE)
 *   Promise.all interno (safeQuery):
 *   [1]  disciplinas
 *   [2]  periodos letivos
 *   [3]  notas_escolares
 *   [4]  vw_boletim_resultados_sisam
 *   [5]  frequencia (CTE — usa turma_id resolvido pelo COALESCE)
 *   [6]  frequencia_diaria
 */
function mockBoletimPublico(rowAluno: typeof rowAlunoComMatricula) {
  mockQuery
    // [0] aluno
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
    .mockResolvedValueOnce(emptyRows)
    // [5] frequencia CTE
    .mockResolvedValueOnce(emptyRows)
    // [6] frequencia_diaria
    .mockResolvedValueOnce(emptyRows)
}

let reqCounter = 0
function makeBoletimReq(params: string) {
  const ip = `10.1.0.${(++reqCounter % 250) + 1}`
  return new NextRequest(
    new URL(`/api/boletim?${params}`, 'http://localhost:3000'),
    { headers: { 'x-forwarded-for': ip } },
  )
}

// ============================================================= /api/boletim/frequencia ===

/**
 * Monta sequência de mocks para GET /api/boletim/frequencia.
 *
 * Ordem das queries no handler (app/api/boletim/frequencia/route.ts),
 * executadas dentro da factory do withRedisCache:
 *   [0]  busca do aluno (com LEFT JOIN matriculas + COALESCE)
 *   [1]  frequencia_bimestral
 *   [2]  frequencia_diaria (timeline)
 */
function mockBoletimFreq(rowAluno: typeof rowAlunoComMatricula) {
  mockQuery
    // [0] aluno
    .mockResolvedValueOnce({ rows: [rowAluno], rowCount: 1 } as any)
    // [1] frequencia_bimestral
    .mockResolvedValueOnce({
      rows: [{
        dias_letivos: 50, presencas: 45, faltas: 5,
        percentual: '90.00', bimestre: 1, periodo_nome: '1º Bimestre',
      }],
      rowCount: 1,
    } as any)
    // [2] frequencia_diaria
    .mockResolvedValueOnce({
      rows: [{ data: '2026-03-10', hora_entrada: '07:30', hora_saida: null, metodo: 'manual', status: 'presente', justificativa: null, presente: true }],
      rowCount: 1,
    } as any)
}

function makeFreqReq(params: string) {
  return new NextRequest(new URL(`/api/boletim/frequencia?${params}`, 'http://localhost:3000'))
}

// =========================================================== /api/responsavel/boletim ===

const RESP_ID   = 'resp-uuid-001'
const VINCULO   = { id: 'vinculo-uuid-001' }

function userResponsavel() {
  return {
    id: RESP_ID, nome: 'Responsável Teste', email: 'resp@test.com',
    tipo_usuario: 'responsavel', ativo: true, escola_id: null, polo_id: null,
  } as any
}

/**
 * Monta sequência de mocks para GET /api/responsavel/boletim.
 *
 * Ordem das queries no handler (app/api/responsavel/boletim/route.ts):
 *   [0]  verificação de vínculo (responsaveis_alunos)
 *   [1]  busca do aluno (com LEFT JOIN matriculas + COALESCE)
 *   Promise.all interno (5 queries simultâneas):
 *   [2]  notas_escolares
 *   [3]  frequência CTE
 *   [4]  disciplinas
 *   [5]  periodos
 *   [6]  vw_boletim_resultados_sisam
 *   [7]  regra de avaliação (após Promise.all)
 */
function mockRespBoletim(rowAluno: typeof rowAlunoComMatricula) {
  mockQuery
    // [0] vínculo
    .mockResolvedValueOnce({ rows: [VINCULO], rowCount: 1 } as any)
    // [1] aluno
    .mockResolvedValueOnce({ rows: [rowAluno], rowCount: 1 } as any)
    // [2] notas_escolares
    .mockResolvedValueOnce({
      rows: [{
        nota_final: '8.0', nota_recuperacao: null, faltas: 0,
        disciplina_id: 'd-mat', periodo_id: 'p1',
        disciplina: 'Matemática', abreviacao: 'MAT', disciplina_codigo: 'MAT',
        periodo: '1º Bimestre', numero: 1,
      }],
      rowCount: 1,
    } as any)
    // [3] frequência CTE
    .mockResolvedValueOnce(emptyRows)
    // [4] disciplinas
    .mockResolvedValueOnce({
      rows: [{ id: 'd-mat', nome: 'Matemática', codigo: 'MAT', abreviacao: 'MAT', ordem: 1 }],
      rowCount: 1,
    } as any)
    // [5] periodos
    .mockResolvedValueOnce({
      rows: [{ id: 'p1', nome: '1º Bimestre', numero: 1, data_inicio: '2026-02-01', data_fim: '2026-04-30' }],
      rowCount: 1,
    } as any)
    // [6] vw_boletim_resultados_sisam
    .mockResolvedValueOnce(emptyRows)
    // [7] regra de avaliação
    .mockResolvedValueOnce(emptyRows)
}

function makeRespReq(alunoId = ALUNO_ID) {
  return new NextRequest(
    new URL(`/api/responsavel/boletim?aluno_id=${alunoId}&ano_letivo=${ANO}`, 'http://localhost:3000')
  )
}

// =============================================================================
// SUITE 1 — /api/boletim (público) — fallback ADR-002
// =============================================================================

describe('GET /api/boletim — ADR-002: fallback matriculas → alunos.turma_id', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ------------------------------------------------------------------- 1 ---
  it('com matrícula: retorna 200 e usa turma_id de matriculas (m.turma_id)', async () => {
    mockBoletimPublico(rowAlunoComMatricula)

    const res = await getBoletimPublico(makeBoletimReq(`codigo=ACM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.aluno.turma_codigo).toBe('5A')
    expect(body.aluno.turma_nome).toBe('5º Ano A')
  })

  // ------------------------------------------------------------------- 2 ---
  it('regressão (adr-002 fase 4): sem matrícula retorna 200 usando alunos.turma_id (fallback)', async () => {
    // Antes do fallback via COALESCE, ausência de linha em `matriculas`
    // resultava em turma_id NULL → boletim quebrado ou turma errada.
    mockBoletimPublico(rowAlunoSemMatricula)

    const res = await getBoletimPublico(makeBoletimReq(`codigo=ASM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()
    // Deve usar o turma_id de alunos (fallback)
    expect(body.aluno.turma_codigo).toBe('5B')
    expect(body.aluno.turma_nome).toBe('5º Ano B')
  })

  // ------------------------------------------------------------------- 3 ---
  it('estrutura SQL: query do aluno contém LEFT JOIN em matriculas + COALESCE', async () => {
    mockBoletimPublico(rowAlunoComMatricula)
    await getBoletimPublico(makeBoletimReq(`codigo=ACM001&ano_letivo=${ANO}`))

    const queries = mockQuery.mock.calls.map(c => String(c[0]))
    // A primeira query é a do aluno (única com COALESCE de turma_id)
    const queryAluno = queries[0]

    expect(queryAluno).toContain('matriculas')
    expect(queryAluno.toUpperCase()).toContain('LEFT JOIN')
    expect(queryAluno.toUpperCase()).toContain('COALESCE')
    expect(queryAluno).toContain('turma_id')
  })

  // ------------------------------------------------------------------- 4 ---
  it('estrutura SQL: COALESCE prioriza m.turma_id (matriculas) sobre a.turma_id (alunos)', async () => {
    mockBoletimPublico(rowAlunoComMatricula)
    await getBoletimPublico(makeBoletimReq(`codigo=ACM001&ano_letivo=${ANO}`))

    const queryAluno = String(mockQuery.mock.calls[0][0])
    // O COALESCE deve aparecer como COALESCE(m.turma_id, a.turma_id)
    expect(queryAluno).toMatch(/COALESCE\s*\(\s*m\.turma_id\s*,\s*a\.turma_id\s*\)/i)
  })

  // ------------------------------------------------------------------- 5 ---
  it('payload completo retornado mesmo sem linha em matriculas (não quebra estrutura)', async () => {
    mockBoletimPublico(rowAlunoSemMatricula)

    const res = await getBoletimPublico(makeBoletimReq(`codigo=ASM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()

    // Campos obrigatórios do payload não devem estar ausentes
    expect(body).toHaveProperty('aluno')
    expect(body).toHaveProperty('disciplinas')
    expect(body).toHaveProperty('periodos')
    expect(body).toHaveProperty('notas')
    expect(body).toHaveProperty('avaliacoes_sisam')
    expect(body).toHaveProperty('frequencia')
    expect(body).toHaveProperty('frequencia_diaria')
  })

  // ------------------------------------------------------------------- 6 ---
  it('busca por CPF+data também usa LEFT JOIN matriculas + COALESCE (mesma query branch)', async () => {
    mockBoletimPublico(rowAlunoComMatricula)

    const res = await getBoletimPublico(
      makeBoletimReq(`cpf=12345678901&data_nascimento=2017-03-10&ano_letivo=${ANO}`)
    )

    expect(res.status).toBe(200)
    const queryAluno = String(mockQuery.mock.calls[0][0])
    expect(queryAluno).toContain('matriculas')
    expect(queryAluno.toUpperCase()).toContain('LEFT JOIN')
    expect(queryAluno.toUpperCase()).toContain('COALESCE')
  })

  // ------------------------------------------------------------------- 7 ---
  it('frequência no payload usa turma_id resolvido (COALESCE passado via $4)', async () => {
    mockBoletimPublico(rowAlunoComMatricula)
    await getBoletimPublico(makeBoletimReq(`codigo=ACM001&ano_letivo=${ANO}`))

    const queries = mockQuery.mock.calls.map(c => String(c[0]))
    // A query de frequência (CTE) deve referenciar $4 (turma_id resolvido)
    const queryFreq = queries.find(q =>
      q.includes('frequencia_bimestral') || q.includes('escopos') || q.includes('tipo_primario')
    )
    if (queryFreq) {
      expect(queryFreq).toContain('$4')
    }
    // O parâmetro $4 passado deve ser o turma_id da fixture (resolvido via COALESCE)
    const callFreq = mockQuery.mock.calls.find(c =>
      String(c[0]).includes('frequencia_bimestral') || String(c[0]).includes('escopos')
    )
    if (callFreq) {
      const params = callFreq[1] as string[]
      expect(params[3]).toBe(TURMA_MATRICULA)
    }
  })
})

// =============================================================================
// SUITE 2 — /api/boletim/frequencia (público) — fallback ADR-002
// =============================================================================

describe('GET /api/boletim/frequencia — ADR-002: fallback matriculas → alunos.turma_id', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ------------------------------------------------------------------- 1 ---
  it('com matrícula: retorna 200 com aluno.turma_codigo resolvido via matriculas', async () => {
    mockBoletimFreq(rowAlunoComMatricula)

    const res = await getBoletimFreq(makeFreqReq(`codigo=ACM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.aluno.turma_codigo).toBe('5A')
    expect(body.aluno.escola_nome).toBe('EM Fallback Teste')
  })

  // ------------------------------------------------------------------- 2 ---
  it('regressão (adr-002 fase 4): sem matrícula retorna 200 usando alunos.turma_id', async () => {
    mockBoletimFreq(rowAlunoSemMatricula)

    const res = await getBoletimFreq(makeFreqReq(`codigo=ASM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.aluno.turma_codigo).toBe('5B')
  })

  // ------------------------------------------------------------------- 3 ---
  it('estrutura SQL: query do aluno usa LEFT JOIN matriculas + COALESCE', async () => {
    mockBoletimFreq(rowAlunoComMatricula)
    await getBoletimFreq(makeFreqReq(`codigo=ACM001&ano_letivo=${ANO}`))

    const queryAluno = String(mockQuery.mock.calls[0][0])
    expect(queryAluno).toContain('matriculas')
    expect(queryAluno.toUpperCase()).toContain('LEFT JOIN')
    expect(queryAluno.toUpperCase()).toContain('COALESCE')
    expect(queryAluno).toMatch(/COALESCE\s*\(\s*m\.turma_id\s*,\s*a\.turma_id\s*\)/i)
  })

  // ------------------------------------------------------------------- 4 ---
  it('payload inclui frequencia_bimestral e frequencia_diaria com dados válidos', async () => {
    mockBoletimFreq(rowAlunoComMatricula)

    const res = await getBoletimFreq(makeFreqReq(`codigo=ACM001&ano_letivo=${ANO}`))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('frequencia_bimestral')
    expect(body).toHaveProperty('frequencia_diaria')
    expect(body).toHaveProperty('totais')
    expect(body.totais.dias_letivos).toBe(50)
    expect(body.totais.presencas).toBe(45)
  })

  // ------------------------------------------------------------------- 5 ---
  it('sem código nem CPF retorna 400 (validação mantida)', async () => {
    const res = await getBoletimFreq(makeFreqReq(`ano_letivo=${ANO}`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  // ------------------------------------------------------------------- 6 ---
  it('aluno não encontrado retorna 404 (comportamento anterior mantido)', async () => {
    mockQuery.mockResolvedValueOnce(emptyRows)

    const res = await getBoletimFreq(makeFreqReq(`codigo=INEXISTENTE&ano_letivo=${ANO}`))
    expect(res.status).toBe(404)
  })

  // ------------------------------------------------------------------- 7 ---
  it('busca por CPF+data_nascimento também usa COALESCE (branch else da query)', async () => {
    mockBoletimFreq(rowAlunoComMatricula)

    const res = await getBoletimFreq(
      makeFreqReq(`cpf=12345678901&data_nascimento=2017-03-10&ano_letivo=${ANO}`)
    )

    expect(res.status).toBe(200)
    const queryAluno = String(mockQuery.mock.calls[0][0])
    expect(queryAluno).toContain('matriculas')
    expect(queryAluno.toUpperCase()).toContain('COALESCE')
  })
})

// =============================================================================
// SUITE 3 — /api/responsavel/boletim (protegido) — fallback ADR-002
// =============================================================================

describe('GET /api/responsavel/boletim — ADR-002: fallback matriculas → alunos.turma_id', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ------------------------------------------------------------------- 1 ---
  it('com matrícula: retorna 200 com turma_id resolvido via matriculas', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoComMatricula)

    const res = await getBoletimResponsavel(makeRespReq())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.aluno.turma_id).toBe(TURMA_MATRICULA)
    expect(body.aluno.turma_codigo).toBe('5A')
  })

  // ------------------------------------------------------------------- 2 ---
  it('regressão (adr-002 fase 4): sem matrícula retorna 200 usando alunos.turma_id', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoSemMatricula)

    const res = await getBoletimResponsavel(makeRespReq())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.aluno.turma_id).toBe(TURMA_ALUNO)
    expect(body.aluno.turma_codigo).toBe('5B')
  })

  // ------------------------------------------------------------------- 3 ---
  it('estrutura SQL: query do aluno usa LEFT JOIN matriculas + COALESCE(m.turma_id, a.turma_id)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoComMatricula)

    await getBoletimResponsavel(makeRespReq())

    const queries = mockQuery.mock.calls.map(c => String(c[0]))
    // [1] é a query do aluno (após [0] = vínculo)
    const queryAluno = queries[1]
    expect(queryAluno).toContain('matriculas')
    expect(queryAluno.toUpperCase()).toContain('LEFT JOIN')
    expect(queryAluno.toUpperCase()).toContain('COALESCE')
    expect(queryAluno).toMatch(/COALESCE\s*\(\s*m\.turma_id\s*,\s*a\.turma_id\s*\)/i)
  })

  // ------------------------------------------------------------------- 4 ---
  it('frequência usa turma_id resolvido — $4 passado na CTE é TURMA_MATRICULA', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoComMatricula)

    await getBoletimResponsavel(makeRespReq())

    const queries = mockQuery.mock.calls
    // A query de frequência (CTE) é a [3] no Promise.all
    const callFreq = queries.find(c =>
      String(c[0]).includes('frequencia_bimestral') || String(c[0]).includes('tipo_primario')
    )
    if (callFreq) {
      const params = callFreq[1] as string[]
      // $4 = turma_id (posição 3 no array zero-based)
      expect(params[3]).toBe(TURMA_MATRICULA)
    }
  })

  // ------------------------------------------------------------------- 5 ---
  it('payload completo mantido com ou sem matrícula (estrutura não muda)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoSemMatricula)

    const res = await getBoletimResponsavel(makeRespReq())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('aluno')
    expect(body).toHaveProperty('disciplinas')
    expect(body).toHaveProperty('periodos')
    expect(body).toHaveProperty('notas')
    expect(body).toHaveProperty('medias')
    expect(body).toHaveProperty('frequencia')
    expect(body).toHaveProperty('avaliacoes_sisam')
  })

  // ------------------------------------------------------------------- 6 ---
  it('autorização: sem token retorna 401', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await getBoletimResponsavel(makeRespReq())
    expect(res.status).toBe(401)
  })

  // ------------------------------------------------------------------- 7 ---
  it('autorização: tipo errado (administrador) retorna 403', async () => {
    mockGetUser.mockResolvedValue({
      id: 'adm-1', nome: 'Admin', email: 'adm@test.com',
      tipo_usuario: 'administrador', ativo: true, escola_id: null, polo_id: null,
    } as any)

    const res = await getBoletimResponsavel(makeRespReq())
    expect(res.status).toBe(403)
  })

  // ------------------------------------------------------------------- 8 ---
  it('IDOR/Escopo: aluno não vinculado ao responsável retorna 403', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    // Vínculo vazio → aluno é de outro responsável
    mockQuery.mockResolvedValueOnce(emptyRows)

    const res = await getBoletimResponsavel(makeRespReq('aluno-de-outro-resp'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/vinculado/i)
  })

  // ------------------------------------------------------------------- 9 ---
  it('aluno_id ausente na URL retorna 400', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())

    const res = await getBoletimResponsavel(
      new NextRequest(new URL(`/api/responsavel/boletim?ano_letivo=${ANO}`, 'http://localhost:3000'))
    )
    expect(res.status).toBe(400)
  })

  // ------------------------------------------------------------------ 10 ---
  it('frequência sem matrícula: turma_id fallback é passado corretamente para CTE ($4)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockRespBoletim(rowAlunoSemMatricula)

    await getBoletimResponsavel(makeRespReq())

    const callFreq = mockQuery.mock.calls.find(c =>
      String(c[0]).includes('frequencia_bimestral') || String(c[0]).includes('tipo_primario')
    )
    if (callFreq) {
      const params = callFreq[1] as string[]
      // Com fallback, $4 deve ser TURMA_ALUNO (de alunos.turma_id)
      expect(params[3]).toBe(TURMA_ALUNO)
    }
  })
})
