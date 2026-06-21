/**
 * Testes unitários — lgpd.service
 *
 * Cobre:
 *  - coletarDadosTitular: usuario simples, responsavel com filhos, sem usuario
 *  - agendarExclusao: agendamento com/sem motivo/IP
 *  - cancelarExclusao: cancela quando existe, retorna false quando não encontra
 *  - listarSolicitacoesAdmin: sem filtros, com status, com tipo, com busca
 *  - estatisticasLgpd: retorno do agregado
 *  - listarMinhasSolicitacoes: lista por usuarioId
 *  - registrarSolicitacaoExportacao: exportar e portabilidade
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

import pool from '@/database/connection'
import {
  coletarDadosTitular,
  agendarExclusao,
  cancelarExclusao,
  listarSolicitacoesAdmin,
  estatisticasLgpd,
  listarMinhasSolicitacoes,
  registrarSolicitacaoExportacao,
} from '@/lib/services/lgpd.service'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// coletarDadosTitular
// ============================================================================

describe('coletarDadosTitular', () => {
  it('retorna meta + usuario + logsAcesso para usuario nao-responsavel', async () => {
    const fakeUser = {
      id: 'u-1',
      nome: 'João Silva',
      email: 'joao@edu.br',
      tipo_usuario: 'professor',
      polo_id: null,
      escola_id: 'esc-1',
      criado_em: '2025-01-01',
    }

    // Sequência de queries: usuario, logs_acesso
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 } as any)  // usuario
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // logs_acesso

    const result = await coletarDadosTitular('u-1')

    expect(result.meta.titularId).toBe('u-1')
    expect(result.meta.formato).toBe('completo')
    expect(result.meta.versao).toBe('1.0')
    expect(result.usuario).toMatchObject({ id: 'u-1', nome: 'João Silva' })
    expect(result.filhos).toBeUndefined()
    expect(result.logsAcesso).toEqual([])
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('coleta filhos e consentimentos quando titular e responsavel', async () => {
    const fakeUser = {
      id: 'u-resp',
      nome: 'Maria Responsavel',
      email: 'maria@edu.br',
      tipo_usuario: 'responsavel',
      polo_id: null,
      escola_id: null,
      criado_em: '2025-01-01',
    }
    const fakeFilhos = [
      { aluno_id: 'aluno-1', nome: 'Filho 1', cpf: null, data_nascimento: null, serie: '5', turma: 'T5A', escola_nome: 'Escola A' },
    ]
    const fakeConsent = [
      { aluno_id: 'aluno-1', consentido: true, data_consentimento: '2025-03-01', data_revogacao: null, responsavel_nome: 'Maria Responsavel' },
    ]

    mockQuery
      .mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 } as any)   // usuario
      .mockResolvedValueOnce({ rows: fakeFilhos, rowCount: 1 } as any)   // filhos
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)            // logs_acesso
      .mockResolvedValueOnce({ rows: fakeConsent, rowCount: 1 } as any)  // consentimentos_faciais

    const result = await coletarDadosTitular('u-resp')

    expect(result.filhos).toHaveLength(1)
    expect(result.filhos![0].aluno_id).toBe('aluno-1')
    expect(result.consentimentosFaciais).toHaveLength(1)
    expect(result.consentimentosFaciais![0].consentido).toBe(true)
  })

  it('nao coleta consentimentos quando responsavel nao tem filhos', async () => {
    const fakeUser = {
      id: 'u-resp',
      nome: 'Sem Filhos',
      email: 'sf@edu.br',
      tipo_usuario: 'responsavel',
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [fakeUser], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // filhos vazio
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // logs

    const result = await coletarDadosTitular('u-resp')

    expect(result.filhos).toEqual([])
    expect(result.consentimentosFaciais).toBeUndefined()
  })

  it('retorna formato portabilidade preservando a versao 1.0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'u-x', tipo_usuario: 'tecnico' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await coletarDadosTitular('u-x', 'portabilidade')

    expect(result.meta.formato).toBe('portabilidade')
    expect(result.meta.versao).toBe('1.0')
  })

  it('retorna dados mesmo sem usuario no banco (usuario undefined)', async () => {
    // Pool retorna rows vazio para usuario — titular nao encontrado
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await coletarDadosTitular('u-nao-existe')

    expect(result.usuario).toBeUndefined()
    expect(result.logsAcesso).toEqual([])
  })
})

// ============================================================================
// agendarExclusao
// ============================================================================

describe('agendarExclusao', () => {
  it('insere na tabela e registra auditoria, retornando id e prevista_para', async () => {
    const fakeResult = { id: 'sol-1', prevista_para: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }
    mockQuery.mockResolvedValueOnce({ rows: [fakeResult], rowCount: 1 } as any)

    const result = await agendarExclusao({
      usuarioId: 'u-1',
      motivo: 'nao quero mais',
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    })

    expect(result.id).toBe('sol-1')
    expect(result.prevista_para).toBeInstanceOf(Date)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO lgpd_solicitacoes')
    // Parametros: $1=usuarioId, $2=motivo, $3=previstaPara, $4=ip, $5=userAgent
    expect(params[0]).toBe('u-1')
    expect(params[1]).toBe('nao quero mais')  // motivo em $2
    expect(params[2]).toBeInstanceOf(Date)     // previstaPara em $3
    expect(params[3]).toBe('1.2.3.4')          // ip em $4
    expect(params[4]).toBe('Mozilla/5.0')      // userAgent em $5
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'LGPD_AGENDAR_EXCLUSAO' })
    )
  })

  it('usa null para motivo/ip/userAgent quando nao fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sol-2', prevista_para: new Date() }], rowCount: 1 } as any)

    await agendarExclusao({ usuarioId: 'u-2' })

    const params = mockQuery.mock.calls[0][1]
    // Parametros: $1=usuarioId, $2=motivo, $3=previstaPara, $4=ip, $5=userAgent
    expect(params[1]).toBeNull()          // motivo
    expect(params[2]).toBeInstanceOf(Date)  // previstaPara
    expect(params[3]).toBeNull()          // ip
    expect(params[4]).toBeNull()          // userAgent
  })
})

// ============================================================================
// cancelarExclusao
// ============================================================================

describe('cancelarExclusao', () => {
  it('retorna true e registra auditoria quando solicitacao e cancelada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sol-1' }], rowCount: 1 } as any)

    const result = await cancelarExclusao({ usuarioId: 'u-1', solicitacaoId: 'sol-1' })

    expect(result).toBe(true)
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'LGPD_CANCELAR_EXCLUSAO', entidadeId: 'sol-1' })
    )
  })

  it('retorna false quando nao encontra solicitacao pendente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await cancelarExclusao({ usuarioId: 'u-1', solicitacaoId: 'sol-nao-existe' })

    expect(result).toBe(false)
    expect(registrarAuditoria).not.toHaveBeenCalled()
  })

  it('nao cancela solicitacao de outro usuario (verifica WHERE usuario_id)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await cancelarExclusao({ usuarioId: 'u-outro', solicitacaoId: 'sol-1' })

    expect(result).toBe(false)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('usuario_id = $2')
  })
})

// ============================================================================
// listarSolicitacoesAdmin
// ============================================================================

describe('listarSolicitacoesAdmin', () => {
  it('retorna todas as solicitacoes sem filtros', async () => {
    const fakeRows = [{ id: 'sol-1', status: 'pendente' }]
    mockQuery.mockResolvedValueOnce({ rows: fakeRows, rowCount: 1 } as any)

    const result = await listarSolicitacoesAdmin()

    expect(result).toEqual(fakeRows)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('FROM lgpd_solicitacoes')
    // Sem WHERE condicional — so limite e offset
    expect(params).toHaveLength(2)
  })

  it('filtra por status e tipo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarSolicitacoesAdmin({ status: 'pendente', tipo: 'exclusao' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('s.status = $')
    expect(sql).toContain('s.tipo = $')
    expect(params[0]).toBe('pendente')
    expect(params[1]).toBe('exclusao')
  })

  it('filtra por busca (minimo 3 chars)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarSolicitacoesAdmin({ busca: 'Maria' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE')
  })

  it('ignora busca com 2 chars ou menos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarSolicitacoesAdmin({ busca: 'Ma' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
    // Apenas limite e offset
    expect(params).toHaveLength(2)
  })

  it('limita a 500 mesmo quando limite requisitado excede', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarSolicitacoesAdmin({ limite: 9999 })

    const params = mockQuery.mock.calls[0][1]
    // Penultimo param e o limite
    expect(params[params.length - 2]).toBe(500)
  })
})

// ============================================================================
// estatisticasLgpd
// ============================================================================

describe('estatisticasLgpd', () => {
  it('retorna contadores agregados do banco', async () => {
    const fakeStats = {
      pendentes: '3',
      vencendo: '1',
      atrasadas: '0',
      concluidas_mes: '5',
      total_exclusao: '8',
      total_exportacao: '2',
      total_portabilidade: '1',
    }
    mockQuery.mockResolvedValueOnce({ rows: [fakeStats], rowCount: 1 } as any)

    const result = await estatisticasLgpd()

    expect(result.pendentes).toBe('3')
    expect(result.vencendo).toBe('1')
    expect(result.total_exclusao).toBe('8')
  })

  it('retorna objeto vazio quando banco nao tem dados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await estatisticasLgpd()

    expect(result).toEqual({})
  })
})

// ============================================================================
// listarMinhasSolicitacoes
// ============================================================================

describe('listarMinhasSolicitacoes', () => {
  it('retorna solicitacoes do usuario correto', async () => {
    const fakeSols = [
      { id: 's1', tipo: 'exclusao', status: 'pendente' },
      { id: 's2', tipo: 'exportar', status: 'concluida' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeSols, rowCount: 2 } as any)

    const result = await listarMinhasSolicitacoes('u-1')

    expect(result).toHaveLength(2)
    expect(result[0].tipo).toBe('exclusao')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE usuario_id = $1')
    expect(params[0]).toBe('u-1')
  })

  it('retorna lista vazia quando usuario nao tem solicitacoes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await listarMinhasSolicitacoes('u-sem-sols')

    expect(result).toEqual([])
  })
})

// ============================================================================
// registrarSolicitacaoExportacao
// ============================================================================

describe('registrarSolicitacaoExportacao', () => {
  it('registra exportar com status concluida imediato', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sol-exp-1' }], rowCount: 1 } as any)

    const id = await registrarSolicitacaoExportacao({
      usuarioId: 'u-1',
      tipo: 'exportar',
      ip: '192.168.1.1',
    })

    expect(id).toBe('sol-exp-1')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO lgpd_solicitacoes')
    // Parametros: $1=usuarioId, $2=tipo, $3=ip, $4=userAgent
    expect(params[0]).toBe('u-1')
    expect(params[1]).toBe('exportar')
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'LGPD_EXPORTAR' })
    )
  })

  it('registra portabilidade com acao LGPD_PORTABILIDADE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sol-port-1' }], rowCount: 1 } as any)

    await registrarSolicitacaoExportacao({
      usuarioId: 'u-2',
      tipo: 'portabilidade',
    })

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'LGPD_PORTABILIDADE' })
    )
  })
})
