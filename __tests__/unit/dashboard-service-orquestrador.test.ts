/**
 * Testes unitários — dashboard.service.ts (orquestrador getDashboardData)
 *
 * Mocka TODOS os submódulos de fetch para testar apenas:
 * - parseDbInt/parseDbNumber (conversão de string → número)
 * - Cálculo de taxa_presenca
 * - Classificação de série (anos iniciais vs finais → media_ch/cn/prod null)
 * - Montagem da resposta (estrutura completa)
 * - Paginação (totalPaginas = ceil)
 * - Taxas de acerto geral compostas
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardData } from '@/lib/services/dashboard.service'
import type { DashboardFiltros, PaginacaoAlunos } from '@/lib/services/dashboard/types'
import type { Usuario } from '@/lib/types'

// ============================================================================
// Mocks de submódulos
// ============================================================================

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('@/database/connection', () => ({ default: { query: vi.fn() } }))
vi.mock('@/lib/cache', () => ({ cacheDelPattern: vi.fn() }))

// Mock filters
vi.mock('@/lib/services/dashboard/filters', () => ({
  buildDashboardFilters: vi.fn(() => ({
    whereClause: '',
    whereClauseBase: '',
    params: [],
    paramsBase: [],
    filtrosParams: [],
    filtrosWhereClauseComPresenca: '',
    rpWhereClauseComPresenca: '',
    rpParams: [],
    rpWhereClauseSemSerie: '',
    rpParamsSemSerie: [],
    joinNivelAprendizagem: 'LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id',
    seriesWhereClause: '',
    turmasWhereClause: '',
    anosLetivosWhereClause: '',
  })),
}))

// Mocks das queries
const mockMetricas = vi.fn()
const mockNiveis = vi.fn()
const mockMediasSerie = vi.fn()
const mockMediasPolo = vi.fn()
const mockMediasEscola = vi.fn()
const mockMediasTurma = vi.fn()
const mockFaixasNota = vi.fn()
const mockPresenca = vi.fn()
const mockTopAlunos = vi.fn()
const mockAlunosDetalhados = vi.fn()
const mockFiltrosDisp = vi.fn()
const mockAnalise = vi.fn()
const mockResumos = vi.fn()

vi.mock('@/lib/services/dashboard/queries', () => ({
  fetchDashboardMetricas: (...args: unknown[]) => mockMetricas(...args),
  fetchDashboardNiveis: (...args: unknown[]) => mockNiveis(...args),
  fetchMediasPorSerie: (...args: unknown[]) => mockMediasSerie(...args),
  fetchMediasPorPolo: (...args: unknown[]) => mockMediasPolo(...args),
  fetchMediasPorEscola: (...args: unknown[]) => mockMediasEscola(...args),
  fetchMediasPorTurma: (...args: unknown[]) => mockMediasTurma(...args),
  fetchFaixasNota: (...args: unknown[]) => mockFaixasNota(...args),
  fetchPresenca: (...args: unknown[]) => mockPresenca(...args),
  fetchTopAlunos: (...args: unknown[]) => mockTopAlunos(...args),
  fetchAlunosDetalhados: (...args: unknown[]) => mockAlunosDetalhados(...args),
  fetchFiltrosDisponiveis: (...args: unknown[]) => mockFiltrosDisp(...args),
}))

vi.mock('@/lib/services/dashboard/analise', () => ({
  fetchAnaliseAcertosErros: (...args: unknown[]) => mockAnalise(...args),
  fetchResumosPorSerie: (...args: unknown[]) => mockResumos(...args),
}))

vi.mock('@/lib/api-helpers', () => ({
  getMediaGeralMixedRoundedSQL: vi.fn(() => 'MEDIA_SQL'),
}))

// ============================================================================
// Helpers de fixture
// ============================================================================

function makeUsuario(): Usuario {
  return {
    id: 'u1', nome: 'Admin', email: 'a@t.com',
    tipo_usuario: 'administrador',
    polo_id: null, escola_id: null,
    ativo: true, criado_em: new Date(), atualizado_em: new Date(),
  }
}

function filtrosVazios(): DashboardFiltros {
  return {
    poloId: null, escolaId: null, anoLetivo: null, avaliacaoId: null,
    serie: null, turmaId: null, presenca: null, tipoEnsino: null,
    nivelAprendizagem: null, faixaMedia: null, disciplina: null,
    taxaAcertoMin: null, taxaAcertoMax: null, questaoCodigo: null,
    areaConhecimento: null, tipoAnalise: null,
  }
}

function paginacaoPadrao(): PaginacaoAlunos {
  return { pagina: 1, limite: 20, offset: 0 }
}

function metricasRow(overrides: Record<string, string | null> = {}) {
  return {
    total_alunos: '100',
    total_escolas: '5',
    total_turmas: '12',
    total_polos: '3',
    total_presentes: '80',
    total_faltantes: '20',
    media_geral: '7.5',
    media_lp: '7.2',
    media_mat: '7.8',
    media_ch: '6.5',
    media_cn: '7.0',
    media_producao: '8.0',
    menor_media: '3.1',
    maior_media: '10.0',
    ...overrides,
  }
}

function analiseVazia() {
  return {
    taxaAcertoGeral: null,
    taxaAcertoPorDisciplina: [],
    questoesComMaisErros: [],
    escolasComMaisErros: [],
    turmasComMaisErros: [],
    questoesComMaisAcertos: [],
    escolasComMaisAcertos: [],
    turmasComMaisAcertos: [],
  }
}

function setupMocks({
  metricas = [metricasRow()],
  niveis = [],
  mediasSerie = [],
  mediasPolo = [],
  mediasEscola = [],
  mediasTurma = [],
  faixasNota = [],
  presenca = [],
  topAlunos = [],
  alunos = [] as unknown[],
  total = 0,
  filtros = { polos: [], escolas: [], series: [], turmas: [], anosLetivos: [], niveis: [], faixasMedia: [] },
  analise = analiseVazia(),
  resumos = { questoes: [], escolas: [], turmas: [], disciplinas: [] },
} = {}) {
  mockMetricas.mockResolvedValue(metricas)
  mockNiveis.mockResolvedValue(niveis)
  mockMediasSerie.mockResolvedValue(mediasSerie)
  mockMediasPolo.mockResolvedValue(mediasPolo)
  mockMediasEscola.mockResolvedValue(mediasEscola)
  mockMediasTurma.mockResolvedValue(mediasTurma)
  mockFaixasNota.mockResolvedValue(faixasNota)
  mockPresenca.mockResolvedValue(presenca)
  mockTopAlunos.mockResolvedValue(topAlunos)
  mockAlunosDetalhados.mockResolvedValue({ alunos, total })
  mockFiltrosDisp.mockResolvedValue(filtros)
  mockAnalise.mockResolvedValue(analise)
  mockResumos.mockResolvedValue(resumos)
}

// ============================================================================
// Testes
// ============================================================================

describe('getDashboardData — métricas básicas', () => {
  beforeEach(() => vi.resetAllMocks())

  it('converte strings do banco para números na resposta', async () => {
    setupMocks()
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.total_alunos).toBe(100)
    expect(r.metricas.total_escolas).toBe(5)
    expect(r.metricas.media_geral).toBe(7.5)
    expect(r.metricas.menor_media).toBe(3.1)
    expect(r.metricas.maior_media).toBe(10)
  })

  it('calcula taxa_presenca = presentes / total_alunos * 100', async () => {
    setupMocks({ metricas: [metricasRow({ total_alunos: '200', total_presentes: '150' })] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.taxa_presenca).toBe(75)
  })

  it('taxa_presenca = 0 quando total_alunos é zero', async () => {
    setupMocks({ metricas: [metricasRow({ total_alunos: '0', total_presentes: '0' })] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.taxa_presenca).toBe(0)
  })

  it('taxa_presenca arredondada (sem casas decimais)', async () => {
    // 73 / 100 = 73%
    setupMocks({ metricas: [metricasRow({ total_alunos: '100', total_presentes: '73' })] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.taxa_presenca).toBe(73)
  })

  it('métricas nulas no banco → zero na resposta', async () => {
    setupMocks({ metricas: [metricasRow({ media_geral: null, total_alunos: '0' })] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.media_geral).toBe(0)
  })

  it('sem linhas de métricas no banco → todos zeros', async () => {
    setupMocks({ metricas: [] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.total_alunos).toBe(0)
    expect(r.metricas.media_geral).toBe(0)
    expect(r.metricas.taxa_presenca).toBe(0)
  })
})

describe('getDashboardData — taxas de acerto (analise)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('inclui taxas de acerto quando analise retorna dados', async () => {
    setupMocks({
      analise: {
        ...analiseVazia(),
        taxaAcertoGeral: {
          total_respostas: 500,
          total_acertos: 300,
          total_erros: 200,
          taxa_acerto_geral: 60,
          taxa_erro_geral: 40,
        },
      },
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.total_respostas).toBe(500)
    expect(r.metricas.total_acertos).toBe(300)
    expect(r.metricas.taxa_acerto_geral).toBe(60)
    expect(r.metricas.taxa_erro_geral).toBe(40)
  })

  it('taxas zero quando analise.taxaAcertoGeral é null', async () => {
    setupMocks({ analise: { ...analiseVazia(), taxaAcertoGeral: null } })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.metricas.total_respostas).toBe(0)
    expect(r.metricas.taxa_acerto_geral).toBe(0)
  })
})

describe('getDashboardData — médias por série (classificação anos iniciais/finais)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('série 2º Ano (anos iniciais) → media_ch e media_cn null, media_prod preenchida', async () => {
    setupMocks({
      mediasSerie: [{
        serie: '2º Ano',
        total_alunos: '50',
        presentes: '40',
        media_geral: '7.0',
        media_lp: '7.2',
        media_mat: '6.8',
        media_ch: '5.0',    // deve ser null
        media_cn: '5.5',    // deve ser null
        media_prod: '8.0',  // deve aparecer
      }],
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.mediasPorSerie[0].media_ch).toBeNull()
    expect(r.mediasPorSerie[0].media_cn).toBeNull()
    expect(r.mediasPorSerie[0].media_prod).toBe(8.0)
  })

  it('série 9º Ano (anos finais) → media_prod null, media_ch e media_cn preenchidas', async () => {
    setupMocks({
      mediasSerie: [{
        serie: '9º Ano',
        total_alunos: '45',
        presentes: '42',
        media_geral: '6.5',
        media_lp: '6.2',
        media_mat: '6.8',
        media_ch: '6.0',
        media_cn: '7.0',
        media_prod: '9.0',  // deve ser null
      }],
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.mediasPorSerie[0].media_ch).toBe(6.0)
    expect(r.mediasPorSerie[0].media_cn).toBe(7.0)
    expect(r.mediasPorSerie[0].media_prod).toBeNull()
  })
})

describe('getDashboardData — médias por escola (filtro de disciplina no cliente)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('filtro de série anos finais → escola mostra ch/cn, não mostra prod', async () => {
    setupMocks({
      mediasEscola: [{
        escola_id: 'esc-1',
        escola: 'Escola Teste',
        polo: 'Polo A',
        total_turmas: '3',
        total_alunos: '80',
        media_geral: '7',
        media_lp: '7.2',
        media_mat: '6.8',
        media_ch: '6.0',
        media_cn: '6.5',
        media_prod: '9.0',
        presentes: '70',
        faltantes: '10',
      }],
    })
    // Com filtro de série 9º Ano (ano final)
    const r = await getDashboardData(
      makeUsuario(),
      { ...filtrosVazios(), serie: '9º Ano' },
      paginacaoPadrao()
    )
    expect(r.mediasPorEscola[0].media_ch).toBe(6.0)
    expect(r.mediasPorEscola[0].media_prod).toBeNull()
  })

  it('sem filtro de série → escola mostra TODOS (ch/cn E prod)', async () => {
    // Comportamento real: sem série filtrada, !filtros.serie = true
    // então TODOS os campos ficam com valor (media_ch, media_cn, media_prod)
    setupMocks({
      mediasEscola: [{
        escola_id: 'esc-1', escola: 'E1', polo: null,
        total_turmas: '2', total_alunos: '60',
        media_geral: '7', media_lp: '7', media_mat: '7',
        media_ch: '6', media_cn: '6.5', media_prod: '8',
        presentes: '55', faltantes: '5',
      }],
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    // Sem filtro de série → ambos aparecem (comportamento do orquestrador)
    expect(r.mediasPorEscola[0].media_ch).toBe(6)
    expect(r.mediasPorEscola[0].media_prod).toBe(8)
  })
})

describe('getDashboardData — paginação', () => {
  beforeEach(() => vi.resetAllMocks())

  it('calcula totalPaginas com ceil(total / limite)', async () => {
    setupMocks({ alunos: [], total: 55 })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), { pagina: 1, limite: 20, offset: 0 })
    expect(r.paginacaoAlunos.totalItens).toBe(55)
    expect(r.paginacaoAlunos.totalPaginas).toBe(3) // ceil(55/20)
    expect(r.paginacaoAlunos.itensPorPagina).toBe(20)
    expect(r.paginacaoAlunos.paginaAtual).toBe(1)
  })

  it('totalPaginas = 1 quando total <= limite', async () => {
    setupMocks({ alunos: [], total: 15 })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), { pagina: 1, limite: 20, offset: 0 })
    expect(r.paginacaoAlunos.totalPaginas).toBe(1)
  })

  it('totalPaginas = 0 quando total = 0', async () => {
    setupMocks({ alunos: [], total: 0 })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), { pagina: 1, limite: 20, offset: 0 })
    expect(r.paginacaoAlunos.totalPaginas).toBe(0)
  })
})

describe('getDashboardData — estrutura completa da resposta', () => {
  beforeEach(() => vi.resetAllMocks())

  it('retorna todos os campos principais da DashboardResponse', async () => {
    setupMocks()
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r).toHaveProperty('metricas')
    expect(r).toHaveProperty('niveis')
    expect(r).toHaveProperty('mediasPorSerie')
    expect(r).toHaveProperty('mediasPorPolo')
    expect(r).toHaveProperty('mediasPorEscola')
    expect(r).toHaveProperty('mediasPorTurma')
    expect(r).toHaveProperty('faixasNota')
    expect(r).toHaveProperty('presenca')
    expect(r).toHaveProperty('topAlunos')
    expect(r).toHaveProperty('alunosDetalhados')
    expect(r).toHaveProperty('paginacaoAlunos')
    expect(r).toHaveProperty('filtros')
    expect(r).toHaveProperty('analiseAcertosErros')
    expect(r).toHaveProperty('resumosPorSerie')
  })

  it('niveis converte quantidade de string para número', async () => {
    setupMocks({ niveis: [{ nivel: 'Avançado', quantidade: '42' }] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.niveis[0].quantidade).toBe(42)
    expect(r.niveis[0].nivel).toBe('Avançado')
  })

  it('faixasNota converte quantidade de string para número', async () => {
    setupMocks({ faixasNota: [{ faixa: '7-8', quantidade: '25' }] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.faixasNota[0].quantidade).toBe(25)
  })

  it('presenca converte quantidade de string para número', async () => {
    setupMocks({ presenca: [{ status: 'P', quantidade: '80' }, { status: 'F', quantidade: '20' }] })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.presenca[0].quantidade).toBe(80)
    expect(r.presenca[1].quantidade).toBe(20)
  })
})

describe('getDashboardData — médias por turma (classificação)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('turma série 5º Ano → media_prod preenchida, ch/cn null', async () => {
    setupMocks({
      mediasTurma: [{
        turma_id: 'trm-1', turma: 'A', escola: 'Esc',
        serie: '5º Ano', total_alunos: '30',
        media_geral: '7', media_lp: '7', media_mat: '7',
        media_ch: '5', media_cn: '5', media_prod: '9',
        presentes: '28', faltantes: '2',
      }],
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.mediasPorTurma[0].media_prod).toBe(9)
    expect(r.mediasPorTurma[0].media_ch).toBeNull()
    expect(r.mediasPorTurma[0].media_cn).toBeNull()
  })

  it('turma série 6º Ano → media_ch/cn preenchidas, prod null', async () => {
    setupMocks({
      mediasTurma: [{
        turma_id: 'trm-2', turma: 'B', escola: 'Esc',
        serie: '6º Ano', total_alunos: '28',
        media_geral: '6.5', media_lp: '6', media_mat: '7',
        media_ch: '6.5', media_cn: '6.8', media_prod: '8',
        presentes: '26', faltantes: '2',
      }],
    })
    const r = await getDashboardData(makeUsuario(), filtrosVazios(), paginacaoPadrao())
    expect(r.mediasPorTurma[0].media_ch).toBe(6.5)
    expect(r.mediasPorTurma[0].media_prod).toBeNull()
  })
})
