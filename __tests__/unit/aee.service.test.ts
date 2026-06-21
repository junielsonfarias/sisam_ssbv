/**
 * Testes unitários/integração — lib/services/aee.service.ts
 *
 * Cobre:
 *   TIPOS_DEFICIENCIA — integridade
 *   cadastrarOuAtualizarAlunoAee — caminho feliz, defaults booleanos
 *   buscarAlunoAee — encontrado, não encontrado
 *   listarAlunosAee — sem filtros, com escolaId, com turmaId
 *   salvarPlano — caminho feliz, defaults
 *   buscarPlano — encontrado, não encontrado
 *   registrarAtendimento — defaults (duracao 50min, presente=true)
 *   listarAtendimentos — sem ano letivo, com ano letivo
 *   listarSalasRecursos — sem escola, com escola
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  TIPOS_DEFICIENCIA,
  cadastrarOuAtualizarAlunoAee,
  buscarAlunoAee,
  listarAlunosAee,
  salvarPlano,
  buscarPlano,
  registrarAtendimento,
  listarAtendimentos,
  listarSalasRecursos,
} from '@/lib/services/aee.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// TIPOS_DEFICIENCIA — integridade
// ============================================================================

describe('TIPOS_DEFICIENCIA', () => {
  it('inclui TEA', () => {
    const values = TIPOS_DEFICIENCIA.map((t) => t.value)
    expect(values).toContain('tea')
  })

  it('inclui altas_habilidades', () => {
    const values = TIPOS_DEFICIENCIA.map((t) => t.value)
    expect(values).toContain('altas_habilidades')
  })

  it('todos os itens têm value e label não-vazios', () => {
    for (const t of TIPOS_DEFICIENCIA) {
      expect(t.value).toBeTruthy()
      expect(t.label).toBeTruthy()
    }
  })

  it('contém pelo menos 8 tipos de deficiência/transtorno', () => {
    expect(TIPOS_DEFICIENCIA.length).toBeGreaterThanOrEqual(8)
  })
})

// ============================================================================
// cadastrarOuAtualizarAlunoAee
// ============================================================================

describe('cadastrarOuAtualizarAlunoAee', () => {
  it('retorna id do registro criado/atualizado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-001' }] })

    const id = await cadastrarOuAtualizarAlunoAee({
      aluno_id: 'aluno-1',
      tipos_deficiencia: ['fisica', 'auditiva'],
    })

    expect(id).toBe('aee-001')
  })

  it('usa laudo_medico=false por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-002' }] })

    await cadastrarOuAtualizarAlunoAee({
      aluno_id: 'aluno-2',
      tipos_deficiencia: ['tea'],
    })

    const [, params] = mockQuery.mock.calls[0]
    // laudo_medico é o 4º parâmetro ($4)
    expect(params[3]).toBe(false)
  })

  it('usa necessita_cuidador=false e necessita_interprete=false por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-003' }] })

    await cadastrarOuAtualizarAlunoAee({
      aluno_id: 'a3',
      tipos_deficiencia: ['intelectual'],
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[8]).toBe(false)  // necessita_cuidador
    expect(params[9]).toBe(false)  // necessita_interprete
  })

  it('cid_codigos padrão é array vazio quando omitido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-004' }] })

    await cadastrarOuAtualizarAlunoAee({
      aluno_id: 'a4',
      tipos_deficiencia: ['visual'],
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[2]).toEqual([]) // cid_codigos
  })

  it('recursos_especiais padrão é array vazio quando omitido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-005' }] })

    await cadastrarOuAtualizarAlunoAee({
      aluno_id: 'a5',
      tipos_deficiencia: ['multipla'],
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[10]).toEqual([]) // recursos_especiais
  })

  it('usa ON CONFLICT para fazer UPSERT por aluno_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'aee-006' }] })

    await cadastrarOuAtualizarAlunoAee({ aluno_id: 'a6', tipos_deficiencia: ['fisica'] })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ON CONFLICT (aluno_id)')
    expect(sql).toContain('DO UPDATE SET')
  })
})

// ============================================================================
// buscarAlunoAee
// ============================================================================

describe('buscarAlunoAee', () => {
  it('retorna os dados do aluno quando encontrado', async () => {
    const alunoMock = { id: 'aee-1', aluno_id: 'a1', tipos_deficiencia: ['tea'], escola_nome: 'Escola A' }
    mockQuery.mockResolvedValueOnce({ rows: [alunoMock] })

    const result = await buscarAlunoAee('a1')

    expect(result).toEqual(alunoMock)
  })

  it('retorna null quando aluno não tem registro AEE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await buscarAlunoAee('aluno-sem-aee')

    expect(result).toBeNull()
  })

  it('passa aluno_id como parâmetro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarAlunoAee('meu-aluno-id')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('meu-aluno-id')
  })
})

// ============================================================================
// listarAlunosAee
// ============================================================================

describe('listarAlunosAee', () => {
  it('sem filtros: retorna todos os alunos AEE', async () => {
    const rows = [{ aluno_id: 'a1', aluno_nome: 'Ana' }, { aluno_id: 'a2', aluno_nome: 'João' }]
    mockQuery.mockResolvedValueOnce({ rows })

    const result = await listarAlunosAee()

    expect(result).toHaveLength(2)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM alunos_aee ae'),
      []
    )
  })

  it('filtra por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAlunosAee({ escolaId: 'escola-x' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-x')
    expect(sql).toContain('a.escola_id = $1')
  })

  it('filtra por turmaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAlunosAee({ turmaId: 'turma-y' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('turma-y')
    expect(sql).toContain('a.turma_id = $1')
  })

  it('combina escolaId e turmaId quando ambos fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAlunosAee({ escolaId: 'e1', turmaId: 't1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('e1')
    expect(params[1]).toBe('t1')
    expect(sql).toContain('a.escola_id = $1')
    expect(sql).toContain('a.turma_id = $2')
  })
})

// ============================================================================
// salvarPlano
// ============================================================================

describe('salvarPlano', () => {
  const planoBase = {
    aluno_id: 'a1',
    ano_letivo: '2026',
    objetivos: 'Ampliar comunicação',
    estrategias: 'CAA, atividades lúdicas',
    data_inicio: '2026-02-10',
  }

  it('retorna o id do plano salvo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'plano-001' }] })

    const id = await salvarPlano(planoBase)

    expect(id).toBe('plano-001')
  })

  it('usa status="ativo" por padrão quando não fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1' }] })

    await salvarPlano(planoBase)

    const [, params] = mockQuery.mock.calls[0]
    // status é o 9º parâmetro ($9)
    expect(params[8]).toBe('ativo')
  })

  it('areas_foco padrão é array vazio quando omitido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p2' }] })

    await salvarPlano(planoBase)

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toEqual([]) // areas_foco
  })

  it('usa ON CONFLICT por (aluno_id, ano_letivo) — UPSERT', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p3' }] })

    await salvarPlano(planoBase)

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ON CONFLICT (aluno_id, ano_letivo)')
  })
})

// ============================================================================
// buscarPlano
// ============================================================================

describe('buscarPlano', () => {
  it('retorna o plano quando encontrado', async () => {
    const plano = { id: 'p1', aluno_id: 'a1', ano_letivo: '2026', status: 'ativo' }
    mockQuery.mockResolvedValueOnce({ rows: [plano] })

    const result = await buscarPlano('a1', '2026')

    expect(result).toEqual(plano)
  })

  it('retorna null quando não há plano para o aluno/ano', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await buscarPlano('aluno-sem-plano', '2026')

    expect(result).toBeNull()
  })

  it('passa aluno_id e ano_letivo como parâmetros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await buscarPlano('a1', '2025')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('a1')
    expect(params[1]).toBe('2025')
  })
})

// ============================================================================
// registrarAtendimento
// ============================================================================

describe('registrarAtendimento', () => {
  it('retorna o id do atendimento registrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'atend-001' }] })

    const id = await registrarAtendimento({
      plano_id: 'p1',
      aluno_id: 'a1',
      professor_id: 'prof-1',
      data_atendimento: '2026-06-10',
    })

    expect(id).toBe('atend-001')
  })

  it('usa duracao_minutos=50 por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'at1' }] })

    await registrarAtendimento({
      plano_id: 'p1',
      aluno_id: 'a1',
      professor_id: 'prof-1',
      data_atendimento: '2026-06-10',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[4]).toBe(50) // duracao_minutos
  })

  it('usa presente=true por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'at2' }] })

    await registrarAtendimento({
      plano_id: 'p1',
      aluno_id: 'a1',
      professor_id: 'prof-1',
      data_atendimento: '2026-06-11',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toBe(true) // presente
  })

  it('registra falta quando presente=false', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'at3' }] })

    await registrarAtendimento({
      plano_id: 'p1',
      aluno_id: 'a1',
      professor_id: 'prof-1',
      data_atendimento: '2026-06-12',
      presente: false,
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toBe(false)
  })
})

// ============================================================================
// listarAtendimentos
// ============================================================================

describe('listarAtendimentos', () => {
  it('sem anoLetivo: busca todos os atendimentos do aluno', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAtendimentos('aluno-1')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(1)
    expect(params[0]).toBe('aluno-1')
    expect(sql).not.toContain('BETWEEN')
  })

  it('com anoLetivo: adiciona filtro por data (BETWEEN)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAtendimentos('aluno-1', '2026')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(3)
    expect(params[1]).toBe('2026-01-01')
    expect(params[2]).toBe('2026-12-31')
    expect(sql).toContain('BETWEEN')
  })

  it('ordena por data_atendimento DESC (mais recente primeiro)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarAtendimentos('a1')

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('data_atendimento DESC')
  })
})

// ============================================================================
// listarSalasRecursos
// ============================================================================

describe('listarSalasRecursos', () => {
  it('sem escolaId: retorna todas as salas ativas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarSalasRecursos()

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(0)
    expect(sql).toContain('ativa = TRUE')
  })

  it('com escolaId: adiciona filtro por escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarSalasRecursos('escola-abc')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-abc')
    expect(sql).toContain('escola_id = $1')
  })

  it('ordena por nome da escola e depois pelo nome da sala', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarSalasRecursos()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('e.nome, sr.nome')
  })
})
