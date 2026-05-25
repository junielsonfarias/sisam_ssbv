import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/documentos.service', () => ({
  coletarDadosHistoricoEscolar: vi.fn(),
  emitirDocumento: vi.fn(),
  validarDocumento: vi.fn(),
  TIPO_DOC_LABEL: {
    historico_escolar: 'Histórico Escolar',
    guia_transferencia: 'Guia de Transferência',
  },
}))

vi.mock('@/lib/services/transferencia-documento.service', () => ({
  emitirGuiaTransferencia: vi.fn(),
}))

vi.mock('@/lib/services/declaracoes.service', () => ({
  gerarDeclaracaoMatricula: vi.fn(),
  gerarDeclaracaoFrequencia: vi.fn(),
  gerarDeclaracaoConclusao: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn(),
}))

import { getUsuarioFromRequest } from '@/lib/auth'
import * as doc from '@/lib/services/documentos.service'
import * as transf from '@/lib/services/transferencia-documento.service'
import * as decl from '@/lib/services/declaracoes.service'

const mockGetUser = vi.mocked(getUsuarioFromRequest)

const USER = {
  id: 'a-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true, escola_id: 'esc-1',
}

function req(method = 'POST', body?: any, url = '/api/admin/documentos/test') {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/admin/documentos/historico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('emite historico com codigo de validacao', async () => {
    vi.mocked(doc.coletarDadosHistoricoEscolar).mockResolvedValue({
      aluno: { id: 'al-1', nome: 'Joao' },
      escola_atual: { nome: 'EM Teste' },
    } as any)
    vi.mocked(doc.emitirDocumento).mockResolvedValue({
      id: 'doc-1',
      codigo_validacao: 'AAAA-BBBB-CCCC',
      hash_conteudo: 'abc123',
    } as any)

    const { POST } = await import('@/app/api/admin/documentos/historico/route')
    const res = await POST(req('POST', {
      alunoId: '00000000-0000-0000-0000-000000000001',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.codigo_validacao).toBe('AAAA-BBBB-CCCC')
    expect(body.url_validacao).toContain('/validar/')
  })

  it('rejeita sem alunoId', async () => {
    const { POST } = await import('@/app/api/admin/documentos/historico/route')
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(400)
  })
})

describe('/api/admin/documentos/declaracao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('declaração de matrícula', async () => {
    vi.mocked(decl.gerarDeclaracaoMatricula).mockResolvedValue({
      id: 'doc-1',
      codigo_validacao: 'XXXX-YYYY-ZZZZ',
      hash_conteudo: 'hash',
    } as any)

    const { POST } = await import('@/app/api/admin/documentos/declaracao/route')
    const res = await POST(req('POST', {
      tipo: 'matricula',
      alunoId: '00000000-0000-0000-0000-000000000001',
      anoLetivo: '2026',
    }))
    expect(res.status).toBe(201)
  })

  it('declaração de conclusão exige serieConcluida', async () => {
    const { POST } = await import('@/app/api/admin/documentos/declaracao/route')
    const res = await POST(req('POST', {
      tipo: 'conclusao',
      alunoId: '00000000-0000-0000-0000-000000000001',
      anoLetivo: '2026',
      // sem serieConcluida
    }))
    expect(res.status).toBe(400)
  })
})

describe('/api/publico/validar-documento/[codigo]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('codigo invalido retorna 400', async () => {
    const { GET } = await import('@/app/api/publico/validar-documento/[codigo]/route')
    const res = await GET(req('GET', undefined, '/api/publico/validar-documento/inv'), {
      params: { codigo: 'inv' },
    })
    expect(res.status).toBe(400)
  })

  it('codigo nao encontrado retorna 404', async () => {
    vi.mocked(doc.validarDocumento).mockResolvedValue(null)

    const { GET } = await import('@/app/api/publico/validar-documento/[codigo]/route')
    const res = await GET(
      req('GET', undefined, '/api/publico/validar-documento/AAAA-BBBB-CCCC'),
      { params: { codigo: 'AAAA-BBBB-CCCC' } } as any
    )
    expect(res.status).toBe(404)
  })

  it('documento valido retorna 200 com dados', async () => {
    vi.mocked(doc.validarDocumento).mockResolvedValue({
      id: 'doc-1',
      codigo_validacao: 'AAAA-BBBB-CCCC',
      tipo: 'historico_escolar',
      dados_snapshot: { aluno: { nome: 'Joao' }, escola_atual: { nome: 'EM Tal' } },
      escola_nome_snapshot: 'EM Tal',
      hash_conteudo: 'hash',
      status: 'ativo',
      vezes_validado: 1,
      emitido_em: new Date(),
    } as any)

    const { GET } = await import('@/app/api/publico/validar-documento/[codigo]/route')
    const res = await GET(
      req('GET', undefined, '/api/publico/validar-documento/AAAA-BBBB-CCCC'),
      { params: { codigo: 'AAAA-BBBB-CCCC' } } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valido).toBe(true)
    expect(body.aluno_nome).toBe('Joao')
  })
})
