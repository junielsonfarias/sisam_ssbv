/**
 * Testes unitários — lib/api-utils.ts
 *
 * Cobre: ok, created, noContent, badRequest, unauthorized, forbidden,
 *        notFound, internalError, serviceUnavailable, okComFallback,
 *        okComCache, validarParametroObrigatorio, validarPeloMenosUm,
 *        buildAccessControl
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Precisamos mockar next/server antes de importar api-utils, pois api-utils
// importa NextResponse internamente.
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

import {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  serviceUnavailable,
  okComFallback,
  okComCache,
  validarParametroObrigatorio,
  validarPeloMenosUm,
  buildAccessControl,
  verificarAuth,
  createOfflineResponse,
} from '@/lib/api-utils'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { NextRequest } from 'next/server'
import type { Usuario } from '@/lib/types'

const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

// ============================================================================
// Helpers
// ============================================================================

function fakeUsuario(tipo: string, overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 'user-001',
    nome: 'Teste',
    email: 'teste@test.com',
    tipo_usuario: tipo as Usuario['tipo_usuario'],
    polo_id: null,
    escola_id: null,
    ativo: true,
    criado_em: new Date(),
    atualizado_em: new Date(),
    ...overrides,
  }
}

// ============================================================================
// Respostas de sucesso
// ============================================================================

describe('ok', () => {
  it('retorna status 200 com dados', async () => {
    const res = ok({ nome: 'Teste' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nome).toBe('Teste')
  })
})

describe('created', () => {
  it('retorna status 201 com dados', async () => {
    const res = created({ id: 'abc' })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('abc')
  })
})

describe('noContent', () => {
  it('retorna status 204 sem corpo', () => {
    const res = noContent()
    expect(res.status).toBe(204)
  })
})

// ============================================================================
// Respostas de erro
// ============================================================================

describe('badRequest', () => {
  it('retorna status 400 com mensagem', async () => {
    const res = badRequest('Campo inválido')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toBe('Campo inválido')
    expect(body.codigo).toBe('PARAMETRO_INVALIDO')
  })

  it('aceita código personalizado ERRO_VALIDACAO', async () => {
    const res = badRequest('Zod error', { codigo: 'ERRO_VALIDACAO' })
    const body = await res.json()
    expect(body.codigo).toBe('ERRO_VALIDACAO')
  })
})

describe('unauthorized', () => {
  it('retorna status 401', async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.mensagem).toBe('Não autenticado')
    expect(body.codigo).toBe('NAO_AUTORIZADO')
  })

  it('aceita mensagem personalizada', async () => {
    const res = unauthorized('Sessão expirada')
    const body = await res.json()
    expect(body.mensagem).toBe('Sessão expirada')
  })
})

describe('forbidden', () => {
  it('retorna status 403', async () => {
    const res = forbidden()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toBe('Não autorizado')
    expect(body.codigo).toBe('PROIBIDO')
  })

  it('aceita mensagem personalizada', async () => {
    const res = forbidden('Acesso negado por escopo')
    const body = await res.json()
    expect(body.mensagem).toBe('Acesso negado por escopo')
  })
})

describe('notFound', () => {
  it('retorna status 404', async () => {
    const res = notFound()
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toBe('Recurso não encontrado')
    expect(body.codigo).toBe('NAO_ENCONTRADO')
  })
})

describe('internalError', () => {
  it('retorna status 500', async () => {
    const res = internalError()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
    expect(body.codigo).toBe('ERRO_INTERNO')
  })

  it('inclui detalhes em modo desenvolvimento', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const res = internalError('Falhou', new Error('detalhe interno'))
    const body = await res.json()
    expect(body.detalhes).toBe('detalhe interno')
    process.env.NODE_ENV = origEnv
  })

  it('não vaza detalhes em modo produção', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const res = internalError('Falhou', new Error('segredo'))
    const body = await res.json()
    expect(body.detalhes).toBeUndefined()
    process.env.NODE_ENV = origEnv
  })
})

describe('serviceUnavailable', () => {
  it('retorna status 503', async () => {
    const res = serviceUnavailable()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.codigo).toBe('SERVICO_INDISPONIVEL')
  })
})

// ============================================================================
// okComFallback
// ============================================================================

describe('okComFallback', () => {
  it('retorna status 200 com dados padrão', async () => {
    const res = okComFallback({ total: 0, items: [] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(0)
  })

  it('inclui erro em modo desenvolvimento', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const res = okComFallback({ total: 0 }, new Error('falha parcial'))
    const body = await res.json()
    expect(body.erro).toBe('falha parcial')
    process.env.NODE_ENV = origEnv
  })

  it('não vaza erro em produção', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const res = okComFallback({ total: 0 }, new Error('segredo'))
    const body = await res.json()
    expect(body.erro).toBeUndefined()
    process.env.NODE_ENV = origEnv
  })
})

// ============================================================================
// okComCache
// ============================================================================

describe('okComCache', () => {
  it('retorna status 200 com campo _cache.origem', async () => {
    const res = okComCache({ items: [] }, 'banco')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body._cache.origem).toBe('banco')
    expect(body._cache.timestamp).toBeDefined()
  })
})

// ============================================================================
// validarParametroObrigatorio
// ============================================================================

describe('validarParametroObrigatorio', () => {
  it('retorna null para valor presente', () => {
    expect(validarParametroObrigatorio('abc', 'campo')).toBeNull()
  })

  it('retorna NextResponse 400 para null', async () => {
    const res = validarParametroObrigatorio(null, 'turma_id')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(400)
    const body = await res!.json()
    expect(body.mensagem).toContain('turma_id')
  })

  it('retorna NextResponse 400 para string vazia', async () => {
    const res = validarParametroObrigatorio('', 'escola_id')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(400)
  })

  it('retorna NextResponse 400 para string só com espaços', async () => {
    const res = validarParametroObrigatorio('   ', 'polo_id')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(400)
  })
})

// ============================================================================
// validarPeloMenosUm
// ============================================================================

describe('validarPeloMenosUm', () => {
  it('retorna null quando pelo menos um valor está presente', () => {
    expect(validarPeloMenosUm({ a: null, b: 'valor', c: null })).toBeNull()
  })

  it('retorna NextResponse 400 quando todos são null/vazio', async () => {
    const res = validarPeloMenosUm({ aluno_id: null, aluno_nome: '', aluno_codigo: undefined })
    expect(res).not.toBeNull()
    expect(res!.status).toBe(400)
    const body = await res!.json()
    expect(body.mensagem).toContain('aluno_id')
  })
})

// ============================================================================
// verificarAuth
// ============================================================================

describe('verificarAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/test')
    const result = await verificarAuth(req, ['administrador'])
    // Deve ser NextResponse com 401
    expect(result).toHaveProperty('status', 401)
  })

  it('retorna 403 quando usuario nao tem permissao', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario('escola') as any)
    mockVerificarPermissao.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/test')
    const result = await verificarAuth(req, ['administrador'])
    expect(result).toHaveProperty('status', 403)
  })

  it('retorna usuario quando autenticado e autorizado', async () => {
    const usuario = fakeUsuario('administrador')
    mockGetUsuario.mockResolvedValue(usuario as any)
    mockVerificarPermissao.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/test')
    const result = await verificarAuth(req, ['administrador'])
    // Deve ser AuthResult (com campo usuario), não NextResponse
    expect(result).toHaveProperty('usuario')
  })
})

// ============================================================================
// createOfflineResponse
// ============================================================================

describe('createOfflineResponse', () => {
  it('retorna 200 com dados, total e sincronizado_em', async () => {
    const dados = [{ id: '1', nome: 'Item' }]
    const res = createOfflineResponse(dados)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dados).toEqual(dados)
    expect(body.total).toBe(1)
    expect(body.sincronizado_em).toBeDefined()
  })

  it('total zero para array vazio', async () => {
    const res = createOfflineResponse([])
    const body = await res.json()
    expect(body.total).toBe(0)
    expect(body.dados).toEqual([])
  })
})

// ============================================================================
// buildAccessControl
// ============================================================================

describe('buildAccessControl', () => {
  it('administrador — sem condições', () => {
    const usuario = fakeUsuario('administrador')
    const result = buildAccessControl(usuario)
    expect(result.conditions).toHaveLength(0)
    expect(result.params).toHaveLength(0)
    expect(result.nextParamIndex).toBe(1)
  })

  it('polo com polo_id — adiciona condição de polo', () => {
    const usuario = fakeUsuario('polo', { polo_id: 'polo-1' })
    const result = buildAccessControl(usuario)
    expect(result.conditions).toHaveLength(1)
    expect(result.conditions[0]).toContain('polo_id')
    expect(result.params).toContain('polo-1')
    expect(result.nextParamIndex).toBe(2)
  })

  it('polo sem polo_id — sem condições (IDOR seguro)', () => {
    const usuario = fakeUsuario('polo', { polo_id: null })
    const result = buildAccessControl(usuario)
    expect(result.conditions).toHaveLength(0)
  })

  it('escola com escola_id — adiciona condição de escola', () => {
    const usuario = fakeUsuario('escola', { escola_id: 'escola-1' })
    const result = buildAccessControl(usuario)
    expect(result.conditions).toHaveLength(1)
    expect(result.params).toContain('escola-1')
  })

  it('respeita paramIndex inicial personalizado', () => {
    const usuario = fakeUsuario('polo', { polo_id: 'polo-2' })
    const result = buildAccessControl(usuario, 5)
    expect(result.conditions[0]).toContain('$5')
    expect(result.nextParamIndex).toBe(6)
  })

  it('respeita alias de escolas personalizado', () => {
    const usuario = fakeUsuario('polo', { polo_id: 'polo-3' })
    const result = buildAccessControl(usuario, 1, { escolaAlias: 'esc', poloIdField: 'polo' })
    expect(result.conditions[0]).toContain('esc.polo')
  })
})
