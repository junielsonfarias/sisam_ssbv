import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hash-bcrypt'),
}))

vi.mock('@/lib/utils/gerar-senha', () => ({
  gerarSenhaForte: vi.fn().mockReturnValue('Senha-Provisoria-123!'),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import {
  normalizarCpf,
  listarResponsaveisDoAluno,
  adicionarResponsavelAoAluno,
  atualizarVinculoResponsavel,
  removerVinculoResponsavel,
} from '@/lib/services/responsaveis.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

/** Cria um client mock para transações cujo query é roteado por matcher. */
function fakeClient(handler: (sql: string, params?: unknown[]) => any) {
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
    return handler(sql, params)
  })
  return { query, release: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------------------------------------------------------- normalizarCpf

describe('normalizarCpf (modelo unificado)', () => {
  it('remove máscara e mantém 11 dígitos', () => {
    expect(normalizarCpf('123.456.789-09')).toBe('12345678909')
  })
  it('aceita 11 dígitos puros', () => {
    expect(normalizarCpf('12345678909')).toBe('12345678909')
  })
  it('retorna null para menos de 11 dígitos', () => {
    expect(normalizarCpf('123456')).toBeNull()
  })
  it('retorna null para mais de 11 dígitos', () => {
    expect(normalizarCpf('123456789012')).toBeNull()
  })
  it('retorna null para vazio/null/undefined', () => {
    expect(normalizarCpf('')).toBeNull()
    expect(normalizarCpf(null)).toBeNull()
    expect(normalizarCpf(undefined)).toBeNull()
  })
  it('ignora letras e símbolos, validando só os dígitos', () => {
    expect(normalizarCpf('abc123.456.789-09xyz')).toBe('12345678909')
  })
})

// ------------------------------------------------------------ listarResponsaveis

describe('listarResponsaveisDoAluno', () => {
  it('mapeia responsavel_id e usuario_id para u.id e preserva o contrato', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        vinculo_id: 'v1', usuario_id: 'u1', nome: 'Ana', cpf: '12345678909',
        telefone: '91999', email: 'ana@x.com', data_nascimento: '1990-05-10T00:00:00.000Z',
        parentesco: 'mae', principal: true, ativo: true,
      }],
      rowCount: 1,
    } as any)

    const lista = await listarResponsaveisDoAluno('al-1')

    // junta responsaveis_alunos + usuarios
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/responsaveis_alunos/)
    expect(sql).toMatch(/JOIN usuarios/)
    expect(sql).not.toMatch(/aluno_responsaveis/)

    expect(lista).toHaveLength(1)
    const r = lista[0]
    expect(r.vinculo_id).toBe('v1')
    expect(r.responsavel_id).toBe('u1')
    expect(r.usuario_id).toBe('u1')
    expect(r.nome).toBe('Ana')
    expect(r.parentesco).toBe('mae')
    expect(r.principal).toBe(true)
    expect(r.data_nascimento).toBe('1990-05-10')
  })
})

// --------------------------------------------------------- adicionarResponsavel

describe('adicionarResponsavelAoAluno', () => {
  it('cria conta nova de usuário quando não existe (por CPF/email) e vincula aprovado/admin', async () => {
    const calls: { sql: string; params?: unknown[] }[] = []
    const client = fakeClient((sql, params) => {
      calls.push({ sql, params })
      if (/SELECT id FROM usuarios WHERE cpf/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/SELECT id FROM usuarios WHERE email/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/INSERT INTO usuarios/i.test(sql)) return { rows: [{ id: 'novo-user' }], rowCount: 1 }
      if (/INSERT INTO responsaveis_alunos/i.test(sql)) return { rows: [{ id: 'vinc-1' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const r = await adicionarResponsavelAoAluno('al-1', {
      nome: 'João Silva', cpf: '111.444.777-35', email: 'joao@x.com',
      telefone: '9199', data_nascimento: '1985-01-01', parentesco: 'pai', principal: true,
    })

    expect(hashPassword).toHaveBeenCalledWith('Senha-Provisoria-123!')
    expect(r).toEqual({ responsavel_id: 'novo-user', vinculo_id: 'vinc-1' })

    // INSERT de usuarios usa tipo_usuario responsavel
    const insUser = calls.find(c => /INSERT INTO usuarios/i.test(c.sql))!
    expect(insUser.sql).toMatch(/'responsavel'/)

    // vínculo nasce aprovado + admin
    const insVinc = calls.find(c => /INSERT INTO responsaveis_alunos/i.test(c.sql))!
    expect(insVinc.sql).toMatch(/'aprovado'/)
    expect(insVinc.sql).toMatch(/'admin'/)

    // principal exclusivo (zera os outros)
    expect(calls.some(c => /SET principal = FALSE/i.test(c.sql))).toBe(true)

    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
  })

  it('reusa conta existente quando o CPF já tem usuário (não cria nova)', async () => {
    const calls: { sql: string; params?: unknown[] }[] = []
    const client = fakeClient((sql, params) => {
      calls.push({ sql, params })
      if (/SELECT id FROM usuarios WHERE cpf/i.test(sql)) return { rows: [{ id: 'user-existente' }], rowCount: 1 }
      if (/INSERT INTO responsaveis_alunos/i.test(sql)) return { rows: [{ id: 'vinc-2' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const r = await adicionarResponsavelAoAluno('al-1', {
      nome: 'Maria', cpf: '111.444.777-35', parentesco: 'mae',
    })

    expect(hashPassword).not.toHaveBeenCalled()
    expect(calls.some(c => /INSERT INTO usuarios/i.test(c.sql))).toBe(false)
    expect(calls.some(c => /UPDATE usuarios SET/i.test(c.sql))).toBe(true)
    expect(r.responsavel_id).toBe('user-existente')
    expect(r.vinculo_id).toBe('vinc-2')
  })

  it('reusa conta existente quando encontrada por email (sem CPF)', async () => {
    const client = fakeClient((sql) => {
      if (/SELECT id FROM usuarios WHERE email/i.test(sql)) return { rows: [{ id: 'user-email' }], rowCount: 1 }
      if (/INSERT INTO responsaveis_alunos/i.test(sql)) return { rows: [{ id: 'vinc-3' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const r = await adicionarResponsavelAoAluno('al-1', {
      nome: 'Pedro', email: 'pedro@x.com', parentesco: 'responsavel',
    })
    expect(r.responsavel_id).toBe('user-email')
  })

  it('faz ROLLBACK e propaga erro de unicidade (cpf/email duplicado)', async () => {
    const client = fakeClient((sql) => {
      if (/SELECT id FROM usuarios WHERE cpf/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/SELECT id FROM usuarios WHERE email/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/INSERT INTO usuarios/i.test(sql)) {
        const err: any = new Error('duplicate key'); err.code = '23505'; throw err
      }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    await expect(adicionarResponsavelAoAluno('al-1', {
      nome: 'Zé', email: 'ze@x.com',
    })).rejects.toMatchObject({ code: '23505' })

    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })
})

// -------------------------------------------------------- atualizarVinculo

describe('atualizarVinculoResponsavel', () => {
  it('retorna false quando o vínculo não existe', async () => {
    const client = fakeClient((sql) => {
      if (/SELECT id FROM responsaveis_alunos/i.test(sql)) return { rows: [], rowCount: 0 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const ok = await atualizarVinculoResponsavel('al-1', 'u1', { nome: 'Novo' })
    expect(ok).toBe(false)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('atualiza usuarios + tipo_vinculo e mantém principal exclusivo', async () => {
    const calls: string[] = []
    const client = fakeClient((sql) => {
      calls.push(sql)
      if (/SELECT id FROM responsaveis_alunos/i.test(sql)) return { rows: [{ id: 'v1' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const ok = await atualizarVinculoResponsavel('al-1', 'u1', {
      nome: 'Atualizado', parentesco: 'avos', principal: true,
    })
    expect(ok).toBe(true)
    expect(calls.some(s => /UPDATE usuarios SET/i.test(s))).toBe(true)
    expect(calls.some(s => /UPDATE responsaveis_alunos SET/i.test(s) && /tipo_vinculo/i.test(s))).toBe(true)
    expect(calls.some(s => /SET principal = FALSE/i.test(s))).toBe(true)
    expect(client.query).toHaveBeenCalledWith('COMMIT')
  })
})

// ---------------------------------------------------------- removerVinculo

describe('removerVinculoResponsavel', () => {
  it('deleta a linha do vínculo e NÃO toca em usuarios', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    const ok = await removerVinculoResponsavel('al-1', 'u1')
    expect(ok).toBe(true)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/DELETE FROM responsaveis_alunos/i)
    expect(sql).not.toMatch(/DELETE FROM usuarios/i)
  })

  it('retorna false quando nenhuma linha é removida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ok = await removerVinculoResponsavel('al-1', 'u1')
    expect(ok).toBe(false)
  })
})
