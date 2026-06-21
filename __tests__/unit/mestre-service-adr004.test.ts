/**
 * Testes unitários — mestre.service (ADR-004 / helpers canônicos)
 *
 * Cobre as funções puras e o resolver de série do mestre.service,
 * que é a fonte única da política de criação de dado mestre e do
 * lookup canônico de série (ADR-004).
 *
 * Não bate em banco nem em rede (resolverSerieId usa pool mockado).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------- mock pool ----
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'

import {
  podeCriarMestre,
  normalizarNomePolo,
  normalizarNomeEscola,
  chaveAluno,
  codigoPolo,
  codigoEscola,
  resolverSerieId,
  ORIGEM_GESTOR,
  ORIGEM_SISAM_ETL,
} from '@/lib/services/gestor/mestre.service'

const mockPool = vi.mocked(pool)

beforeEach(() => {
  vi.clearAllMocks()
})

// ====================================================== podeCriarMestre ====

describe('podeCriarMestre — política de criação de dado mestre', () => {
  it('gestor pode criar polo', () => {
    expect(podeCriarMestre(ORIGEM_GESTOR, 'polo')).toBe(true)
  })

  it('gestor pode criar escola', () => {
    expect(podeCriarMestre(ORIGEM_GESTOR, 'escola')).toBe(true)
  })

  it('gestor pode criar turma', () => {
    expect(podeCriarMestre(ORIGEM_GESTOR, 'turma')).toBe(true)
  })

  it('gestor pode criar aluno', () => {
    expect(podeCriarMestre(ORIGEM_GESTOR, 'aluno')).toBe(true)
  })

  it('ETL pode criar polo (auxiliar)', () => {
    expect(podeCriarMestre(ORIGEM_SISAM_ETL, 'polo')).toBe(true)
  })

  it('ETL NUNCA cria escola (gate de habilitacao — ADR-004)', () => {
    expect(podeCriarMestre(ORIGEM_SISAM_ETL, 'escola')).toBe(false)
  })

  it('ETL pode criar turma (modo transicao)', () => {
    expect(podeCriarMestre(ORIGEM_SISAM_ETL, 'turma')).toBe(true)
  })

  it('ETL pode criar aluno (modo transicao)', () => {
    expect(podeCriarMestre(ORIGEM_SISAM_ETL, 'aluno')).toBe(true)
  })
})

// ================================================= normalizarNomePolo ====

describe('normalizarNomePolo — chave de unicidade de polo', () => {
  it('converte para maiúsculas e remove espaços laterais', () => {
    expect(normalizarNomePolo('  polo norte  ')).toBe('POLO NORTE')
  })

  it('dois nomes distintos apenas por case produzem a mesma chave', () => {
    expect(normalizarNomePolo('Polo Norte')).toBe(normalizarNomePolo('polo norte'))
  })
})

// ================================================ normalizarNomeEscola ====

describe('normalizarNomeEscola — chave de unicidade de escola', () => {
  it('maiúsculas, sem pontos e espaços colapsados', () => {
    expect(normalizarNomeEscola('E.M. João  Silva')).toBe('EM JOÃO SILVA')
  })

  it('mesma escola com e sem ponto geram mesma chave', () => {
    expect(normalizarNomeEscola('E.M.E.F. Dom Pedro')).toBe(
      normalizarNomeEscola('EMEF Dom Pedro')
    )
  })

  it('espaços múltiplos colapsam para um único', () => {
    expect(normalizarNomeEscola('Escola   Municipal   Teste')).toBe('ESCOLA MUNICIPAL TESTE')
  })
})

// ======================================================== chaveAluno ====

describe('chaveAluno — chave de unicidade de aluno por turma+escola+ano', () => {
  it('produz formato NOME_NORM:escolaId:turmaId', () => {
    const chave = chaveAluno('  maria silva  ', 'esc-1', 'turma-1')
    expect(chave).toBe('MARIA SILVA:esc-1:turma-1')
  })

  it('turma nula produz sufixo :null', () => {
    const chave = chaveAluno('João', 'esc-1', null)
    expect(chave).toBe('JOÃO:esc-1:null')
  })

  it('mesmo aluno com case diferente gera a mesma chave', () => {
    expect(chaveAluno('Ana Paula', 'esc-2', 'turma-3')).toBe(
      chaveAluno('ana paula', 'esc-2', 'turma-3')
    )
  })
})

// ======================================================= codigoPolo ====

describe('codigoPolo — código canônico de polo', () => {
  it('maiúsculas e espaços substituídos por sublinhado', () => {
    expect(codigoPolo('Polo Sul')).toBe('POLO_SUL')
  })
})

// ====================================================== codigoEscola ====

describe('codigoEscola — código canônico de escola (máx 50 chars)', () => {
  it('produz código sem pontos, maiúsculas, espaços por sublinhado', () => {
    expect(codigoEscola('E.M. João Silva')).toBe('EM_JOÃO_SILVA')
  })

  it('trunca em 50 caracteres', () => {
    const nome = 'ESCOLA MUNICIPAL ESTADUAL FEDERAL MUITO LONGO COM NOME GIGANTESCO'
    expect(codigoEscola(nome).length).toBeLessThanOrEqual(50)
  })
})

// ================================================== resolverSerieId ====

describe('resolverSerieId — lookup canônico ADR-004 (unitário com pool mockado)', () => {
  const SERIE_UUID = 'uuid-serie-5ano'

  it('consulta series_escolares por nome case-insensitive e retorna o id', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_UUID }] } as any)
    const id = await resolverSerieId(pool as any, '5º Ano')
    expect(id).toBe(SERIE_UUID)
    const sql = String(mockPool.query.mock.calls[0][0])
    expect(sql).toContain('series_escolares')
    expect(sql).toContain('lower')
    expect(sql).toContain('upper')
  })

  it('consulta por codigo (short "5") e retorna o id', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_UUID }] } as any)
    const id = await resolverSerieId(pool as any, '5')
    expect(id).toBe(SERIE_UUID)
  })

  it('retorna null sem lançar quando série não está no catálogo', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const id = await resolverSerieId(pool as any, 'Serie Estranha XYZ')
    expect(id).toBeNull()
  })

  it('retorna null para string vazia sem consultar o banco', async () => {
    const id = await resolverSerieId(pool as any, '')
    expect(id).toBeNull()
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('retorna null para string só com espaços sem consultar o banco', async () => {
    const id = await resolverSerieId(pool as any, '   ')
    expect(id).toBeNull()
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('retorna null para undefined sem consultar o banco', async () => {
    const id = await resolverSerieId(pool as any, undefined)
    expect(id).toBeNull()
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('cache elimina segunda consulta para a mesma série', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_UUID }] } as any)
    const cache = new Map<string, string | null>()
    const a = await resolverSerieId(pool as any, '5º Ano', cache)
    const b = await resolverSerieId(pool as any, '5º Ano', cache)
    expect(a).toBe(SERIE_UUID)
    expect(b).toBe(SERIE_UUID)
    // só uma query ao banco
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('cache compartilhado reutiliza resultado null (série inexistente)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const cache = new Map<string, string | null>()
    const a = await resolverSerieId(pool as any, 'Fantasma', cache)
    const b = await resolverSerieId(pool as any, 'Fantasma', cache)
    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('séries diferentes no mesmo cache fazem consultas separadas', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-serie-4' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-serie-5' }] } as any)
    const cache = new Map<string, string | null>()
    const a = await resolverSerieId(pool as any, '4', cache)
    const b = await resolverSerieId(pool as any, '5', cache)
    expect(a).toBe('uuid-serie-4')
    expect(b).toBe('uuid-serie-5')
    expect(mockPool.query).toHaveBeenCalledTimes(2)
  })
})
