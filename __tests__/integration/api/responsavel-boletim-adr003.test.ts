/**
 * Testes de integração — GET /api/responsavel/boletim (boletim protegido)
 *
 * ADR-003 (A2 — seção complementar SISAM no boletim do responsável):
 *   - A rota agora inclui `avaliacoes_sisam` (antes AUSENTE), lida de
 *     `vw_boletim_resultados_sisam` em paralelo com as demais queries.
 *   - A autorização é via `withAuth(['responsavel'])` + validação de vínculo:
 *     o aluno deve pertencer ao responsável logado (tabela responsaveis_alunos).
 *   - IDOR: responsável não pode acessar boletim de aluno de outro responsável.
 *   - PG devolve `numeric` como string — o handler converte (mesma regressão §8).
 *
 * Cobre:
 *   1. Caminho feliz: payload inclui `avaliacoes_sisam` com campos convertidos.
 *   2. Regressão ADR-003: ausente antes do commit e4d8feb; agora presente.
 *   3. Autorização: sem token → 401.
 *   4. Autorização: tipo errado (administrador) → 403.
 *   5. IDOR/Escopo: responsável sem vínculo com o aluno → 403.
 *   6. Aluno não encontrado → 404.
 *   7. Campos numeric (string PG) convertidos para number.
 *   8. Aluno sem resultado SISAM: `avaliacoes_sisam` é array vazio.
 *   9. Nota escolar não tem avaliacao_id (separação de responsabilidades).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks ---

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// withAuth depende de @/lib/auth → mockamos os primitivos que ele invoca
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: (usuario: any, tipos: string[]) =>
    !!usuario && tipos.includes(usuario.tipo_usuario),
}))

// ----------------------------------------------------------------- imports ---

import { GET } from '@/app/api/responsavel/boletim/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'

const mockPool = vi.mocked(pool)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

// --------------------------------------------------------------- fixtures ---

const RESPONSAVEL_ID = 'resp-uuid-001'
const ALUNO_ID      = 'aluno-uuid-001'
const ESCOLA_ID     = 'escola-uuid-001'
const TURMA_ID      = 'turma-uuid-001'
const ANO           = '2026'

function userResponsavel() {
  return {
    id: RESPONSAVEL_ID,
    nome: 'Ana Souza',
    email: 'ana@example.com',
    tipo_usuario: 'responsavel',
    ativo: true,
    escola_id: null,
    polo_id: null,
  } as any
}

function userAdmin() {
  return {
    id: 'admin-uuid',
    nome: 'Administo',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
  } as any
}

const rowVinculo = { id: 'vinculo-uuid-001' }

const rowAluno = {
  id: ALUNO_ID,
  nome: 'Pedro Henrique',
  codigo: 'ALU002',
  serie: '5º Ano EF',
  ano_letivo: ANO,
  situacao: 'cursando',
  data_nascimento: '2017-05-15',
  pcd: false,
  turma_id: TURMA_ID,
  escola_id: ESCOLA_ID,
  escola_nome: 'EM Integrada',
  turma_codigo: '5B',
  turma_nome: '5º Ano B',
}

/** Linha retornada por vw_boletim_resultados_sisam (numeric como string, padrão PG). */
function rowSisamView(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    avaliacao_nome:     'Avaliação Municipal 2026',
    avaliacao_tipo:     'diagnostica',
    presenca:           true,
    nota_lp:            '6.50',
    nota_mat:           '7.00',
    nota_ch:            null,
    nota_cn:            null,
    nota_producao:      '5.50',
    media_aluno:        '6.33',
    nivel_aprendizagem: 'basico',
    total_acertos_lp:   '10',
    total_acertos_mat:  '13',
    total_acertos_ch:   null,
    total_acertos_cn:   null,
    ...overrides,
  }
}

const emptyRows = { rows: [], rowCount: 0 } as any

/**
 * Sequência de mocks para o caminho feliz.
 * Ordem no handler (Promise.all em responsavel/boletim/route.ts):
 *   [0] verificação de vínculo (responsaveis_alunos)
 *   [1] busca do aluno
 *   [2] notas_escolares  ─┐
 *   [3] frequência CTE   ─┤ Promise.all interno
 *   [4] disciplinas       │
 *   [5] periodos          │
 *   [6] sisam (view)    ──┘
 *   [7] regra de avaliação (query síncrona após o Promise.all)
 */
function setupMocks(sisamRows: unknown[] = [rowSisamView()]) {
  mockPool.query
    // [0] vínculo
    .mockResolvedValueOnce({ rows: [rowVinculo], rowCount: 1 } as any)
    // [1] aluno
    .mockResolvedValueOnce({ rows: [rowAluno], rowCount: 1 } as any)
    // Promise.all (5 queries simultâneas)
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
    .mockResolvedValueOnce({ rows: sisamRows, rowCount: sisamRows.length } as any)
    // [7] regra de avaliação (após Promise.all)
    .mockResolvedValueOnce(emptyRows)
}

function makeReq(alunoId = ALUNO_ID, anoLetivo = ANO) {
  return new NextRequest(
    new URL(`/api/responsavel/boletim?aluno_id=${alunoId}&ano_letivo=${anoLetivo}`, 'http://localhost:3000')
  )
}

// --------------------------------------------------------------- testes ---

describe('GET /api/responsavel/boletim — ADR-003: seção complementar SISAM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----------------------------------------------------------------- 1 ---
  it('caminho feliz: payload inclui avaliacoes_sisam com os campos do ADR-003', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body).toHaveProperty('avaliacoes_sisam')
    expect(Array.isArray(body.avaliacoes_sisam)).toBe(true)
    expect(body.avaliacoes_sisam).toHaveLength(1)

    const sisam = body.avaliacoes_sisam[0]
    expect(sisam.avaliacao).toBe('Avaliação Municipal 2026')
    expect(sisam.tipo).toBe('diagnostica')
    expect(sisam.presenca).toBe(true)
    expect(sisam.nivel).toBe('basico')
  })

  // ----------------------------------------------------------------- 2 ---
  it('regressão ADR-003 (commit e4d8feb): avaliacoes_sisam estava ausente antes do fix', async () => {
    // Antes do commit e4d8feb, o campo "avaliacoes_sisam" não existia na
    // resposta do /api/responsavel/boletim. Este teste garante que não volta.
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    // Deve existir e ser um array (mesmo que vazio)
    expect(Object.prototype.hasOwnProperty.call(body, 'avaliacoes_sisam')).toBe(true)
    expect(Array.isArray(body.avaliacoes_sisam)).toBe(true)
  })

  // ----------------------------------------------------------------- 3 ---
  it('sem token: retorna 401 (withAuth protege a rota)', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET(makeReq())
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  // ----------------------------------------------------------------- 4 ---
  it('tipo de usuário errado (administrador): retorna 403', async () => {
    mockGetUser.mockResolvedValue(userAdmin())

    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  // ----------------------------------------------------------------- 5 ---
  it('IDOR/Escopo: aluno não vinculado ao responsável retorna 403', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    // Vínculo vazio → aluno pertence a outro responsável
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const res = await GET(makeReq('aluno-de-outro-resp'))
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.mensagem).toMatch(/vinculado/i)
  })

  // ----------------------------------------------------------------- 6 ---
  it('aluno_id ausente na URL retorna 400', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())

    const res = await GET(
      new NextRequest(new URL(`/api/responsavel/boletim?ano_letivo=${ANO}`, 'http://localhost:3000'))
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/obrigatorio/i)
  })

  // ----------------------------------------------------------------- 7 ---
  it('aluno não encontrado após vínculo válido retorna 404', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    mockPool.query
      .mockResolvedValueOnce({ rows: [rowVinculo], rowCount: 1 } as any) // vínculo ok
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // aluno não existe

    const res = await GET(makeReq('aluno-inexistente'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toMatch(/encontrado/i)
  })

  // ----------------------------------------------------------------- 8 ---
  it('regressão §8: campos numeric PG (string) convertidos para number no payload', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    const sisam = body.avaliacoes_sisam[0]

    expect(typeof sisam.nota_lp).toBe('number')
    expect(typeof sisam.nota_mat).toBe('number')
    expect(typeof sisam.nota_producao).toBe('number')
    expect(typeof sisam.media).toBe('number')
    expect(typeof sisam.acertos_lp).toBe('number')
    expect(typeof sisam.acertos_mat).toBe('number')

    expect(sisam.nota_lp).toBeCloseTo(6.5)
    expect(sisam.nota_mat).toBeCloseTo(7.0)
    expect(sisam.media).toBeCloseTo(6.33)
    expect(sisam.acertos_lp).toBe(10)
    expect(sisam.acertos_mat).toBe(13)
  })

  // ----------------------------------------------------------------- 9 ---
  it('campos nullable (nota_ch, nota_cn) chegam como null (não NaN)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    const sisam = body.avaliacoes_sisam[0]

    expect(sisam.nota_ch).toBeNull()
    expect(sisam.nota_cn).toBeNull()
    expect(sisam.acertos_ch).toBe(0)
    expect(sisam.acertos_cn).toBe(0)
  })

  // ---------------------------------------------------------------- 10 ---
  it('aluno sem resultado SISAM: avaliacoes_sisam é array vazio (não ausente)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks([])  // view retorna 0 linhas

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('avaliacoes_sisam')
    expect(body.avaliacoes_sisam).toHaveLength(0)
  })

  // ---------------------------------------------------------------- 11 ---
  it('query SISAM aponta para vw_boletim_resultados_sisam (não JOIN inline)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    await GET(makeReq())

    const queries = mockPool.query.mock.calls.map((c) => String(c[0]))
    const querySisam = queries.find((q) => q.includes('vw_boletim_resultados_sisam'))
    expect(querySisam).toBeDefined()

    // A view encapsula o JOIN — não deve haver JOIN inline
    const queryJoinInline = queries.find(
      (q) => q.includes('resultados_consolidados') && q.includes('INNER JOIN') && q.includes('avaliacoes')
    )
    expect(queryJoinInline).toBeUndefined()
  })

  // ---------------------------------------------------------------- 12 ---
  it('notas_escolares NÃO referencia avaliacao_id (isolamento ADR-003)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    await GET(makeReq())

    const queries = mockPool.query.mock.calls.map((c) => String(c[0]))
    const queryNotas = queries.find((q) => q.includes('notas_escolares'))
    expect(queryNotas).toBeDefined()
    expect(queryNotas).not.toContain('avaliacao_id')
  })

  // ---------------------------------------------------------------- 13 ---
  it('payload inclui notas e frequencia além de avaliacoes_sisam (estrutura completa)', async () => {
    mockGetUser.mockResolvedValue(userResponsavel())
    setupMocks()

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    // Campos pré-ADR-003 que devem continuar presentes
    expect(body).toHaveProperty('aluno')
    expect(body).toHaveProperty('notas')
    expect(body).toHaveProperty('frequencia')
    expect(body).toHaveProperty('media_aprovacao')
    // Campo novo do ADR-003
    expect(body).toHaveProperty('avaliacoes_sisam')
  })
})
