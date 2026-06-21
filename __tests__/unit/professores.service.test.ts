/**
 * Testes unitários — lib/services/professores/{crud,vinculos}
 *
 * Cobre: buscarProfessores, criarProfessor, atualizarProfessor,
 *        toggleAtivoProfessor, verificarPodeDeletar, deletarProfessor,
 *        buscarVinculos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hash-bcrypt-123'),
}))

vi.mock('@/lib/api-helpers', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api-helpers')>()
  return { ...original }
})

import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import {
  buscarProfessores,
  criarProfessor,
  atualizarProfessor,
  toggleAtivoProfessor,
  verificarPodeDeletar,
  deletarProfessor,
} from '@/lib/services/professores/crud'

import { buscarVinculos } from '@/lib/services/professores/vinculos'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// buscarProfessores
// =============================================================================

describe('buscarProfessores', () => {
  it('lista todos os professores sem filtros', async () => {
    const profs = [
      { id: 'p1', nome: 'Prof. Ana', email: 'ana@escola.br', ativo: true, total_turmas: 2, escolas: ['EMEF A'] },
    ]
    mockQuery.mockResolvedValueOnce({ rows: profs, rowCount: 1 } as any)

    const result = await buscarProfessores({})

    expect(result).toHaveLength(1)
    expect(result[0].nome).toBe('Prof. Ana')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/tipo_usuario = 'professor'/)
  })

  it('aplica filtro ativo=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarProfessores({ ativo: 'true' })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/u\.ativo = true/)
  })

  it('aplica filtro ativo=false', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarProfessores({ ativo: 'false' })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/u\.ativo = false/)
  })

  it('aplica filtro por escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarProfessores({ escolaId: 'escola-1' })
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('escola-1')
  })
})

// =============================================================================
// criarProfessor
// =============================================================================

describe('criarProfessor', () => {
  it('cria professor com senha hasheada e tipo_usuario=professor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // email não existe
      .mockResolvedValueOnce({
        rows: [{ id: 'p1', nome: 'Prof. João', email: 'joao@escola.br', tipo_usuario: 'professor', criado_em: '2026-01-01' }],
        rowCount: 1,
      } as any)

    const result = await criarProfessor({ nome: 'Prof. João', email: 'joao@escola.br', senha: 'senha123' })

    expect(result).toHaveProperty('professor')
    if ('professor' in result) {
      expect(result.professor.tipo_usuario).toBe('professor')
    }
    expect(hashPassword).toHaveBeenCalledWith('senha123')

    // INSERT deve inserir tipo 'professor'
    const insertSql = mockQuery.mock.calls[1][0] as string
    expect(insertSql).toMatch(/'professor'/)
    expect(insertSql).toMatch(/RETURNING/)
  })

  it('retorna erro 409 quando email já está cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existente' }], rowCount: 1 } as any)

    const result = await criarProfessor({ nome: 'Novo', email: 'existente@escola.br', senha: '123' })

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(409)
      expect(result.erro).toMatch(/já cadastrado/)
    }
    expect(hashPassword).not.toHaveBeenCalled()
  })
})

// =============================================================================
// atualizarProfessor
// =============================================================================

describe('atualizarProfessor', () => {
  it('atualiza nome, email, CPF e telefone', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // email não duplicado
      .mockResolvedValueOnce({
        rows: [{ id: 'p1', nome: 'Novo Nome', email: 'novo@escola.br', cpf: '12345678909', telefone: '91999', ativo: true }],
        rowCount: 1,
      } as any)

    const result = await atualizarProfessor({
      professor_id: 'p1', nome: 'Novo Nome', email: 'novo@escola.br',
      cpf: '123.456.789-09', telefone: '91999',
    })

    expect(result).toHaveProperty('professor')
    if ('professor' in result) {
      expect(result.professor.nome).toBe('Novo Nome')
    }
  })

  it('retorna erro 409 quando email novo já pertence a outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'outro' }], rowCount: 1 } as any)

    const result = await atualizarProfessor({ professor_id: 'p1', email: 'outro@escola.br' })

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(409)
    }
  })

  it('retorna erro 400 quando nenhum campo é enviado', async () => {
    const result = await atualizarProfessor({ professor_id: 'p1' })

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(400)
      expect(result.erro).toMatch(/Nenhum campo/)
    }
  })

  it('retorna erro 404 quando professor não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // UPDATE sem resultado

    const result = await atualizarProfessor({ professor_id: 'p-inexistente', nome: 'X' })

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(404)
    }
  })
})

// =============================================================================
// toggleAtivoProfessor
// =============================================================================

describe('toggleAtivoProfessor', () => {
  it('ativa professor (ativo=true)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'p1', nome: 'Prof. X', email: 'x@escola.br', ativo: true }], rowCount: 1,
    } as any)

    const result = await toggleAtivoProfessor('p1', true)

    expect(result).toHaveProperty('professor')
    if ('professor' in result) {
      expect(result.professor.ativo).toBe(true)
    }
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params[0]).toBe(true)
  })

  it('desativa professor (ativo=false)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'p1', nome: 'Prof. X', email: 'x@escola.br', ativo: false }], rowCount: 1,
    } as any)

    const result = await toggleAtivoProfessor('p1', false)

    if ('professor' in result) {
      expect(result.professor.ativo).toBe(false)
    }
  })

  it('retorna erro 404 quando professor não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await toggleAtivoProfessor('p-inexistente', true)

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(404)
    }
  })
})

// =============================================================================
// verificarPodeDeletar
// =============================================================================

describe('verificarPodeDeletar', () => {
  it('retorna pode=true quando professor não tem vínculos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)

    const result = await verificarPodeDeletar('p1')

    expect(result.pode).toBe(true)
    expect(result.motivo).toBeUndefined()
  })

  it('retorna pode=false com motivo quando professor tem vínculos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }], rowCount: 1 } as any)

    const result = await verificarPodeDeletar('p1')

    expect(result.pode).toBe(false)
    expect(result.motivo).toMatch(/vínculos/)
  })
})

// =============================================================================
// deletarProfessor
// =============================================================================

describe('deletarProfessor', () => {
  it('exclui professor inativo sem vínculos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any) // verificarPodeDeletar
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 } as any)  // DELETE

    const result = await deletarProfessor('p1')

    expect(result).toHaveProperty('sucesso')
    if ('sucesso' in result) {
      expect(result.sucesso).toBe(true)
    }

    const deleteSql = mockQuery.mock.calls[1][0] as string
    expect(deleteSql).toMatch(/DELETE FROM usuarios/)
    expect(deleteSql).toMatch(/ativo = false/) // só exclui inativo
  })

  it('retorna erro 400 quando professor tem vínculos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1 } as any)

    const result = await deletarProfessor('p1')

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(400)
    }
    // Não deve ter chegado ao DELETE
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('retorna erro 404 quando professor não existe ou está ativo', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // DELETE sem resultado

    const result = await deletarProfessor('p-ativo-ou-inexistente')

    expect(result).toHaveProperty('erro')
    if ('erro' in result) {
      expect(result.status).toBe(404)
    }
  })
})

// =============================================================================
// buscarVinculos (vinculos.ts)
// =============================================================================

describe('buscarVinculos', () => {
  it('lista vínculos ativos sem filtros', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'v1', professor_id: 'p1', professor_nome: 'Ana', turma_id: 't1',
        turma_nome: '1ºA', escola_id: 'e1', escola_nome: 'EMEF X',
      }],
      rowCount: 1,
    } as any)

    const result = await buscarVinculos({})

    expect(result).toHaveLength(1)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/pt\.ativo = true/)
  })

  it('aplica filtro por escolaId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarVinculos({ escolaId: 'escola-1' })
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('escola-1')
  })

  it('aplica filtro por professorId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarVinculos({ professorId: 'prof-2' })
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('prof-2')
  })

  it('aplica filtro por anoLetivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarVinculos({ anoLetivo: '2026' })
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('2026')
  })
})
