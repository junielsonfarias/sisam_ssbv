/**
 * Teste de REGRESSÃO — Lote 3.1: fórmula de média com DIVISOR FIXO
 *
 * Bug corrigido: `corrigirMediasInconsistentes` e `verificarMediasInconsistentes`
 * usavam divisor VARIÁVEL (NULLIF + contagem de notas > 0), divergindo do painel.
 * Após a correção, ambas delegam para `getMediaGeralSQL('rc')` (lib/sql/media-geral),
 * que usa / 3.0 (anos iniciais: LP + MAT + PROD) e / 4.0 (anos finais: LP + CH +
 * MAT + CN) — divisor FIXO, idêntico ao painel de dados.
 *
 * Este teste garante que a regressão nunca volte silenciosamente.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock ANTES de qualquer import que use o módulo ──────────────────────────
vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  },
}))

import { corrigirMediasInconsistentes } from '@/lib/divergencias/corretores'
import { verificarMediasInconsistentes } from '@/lib/divergencias/verificadores-dados'
import pool from '@/database/connection'

const mockedQuery = pool.query as ReturnType<typeof vi.fn>

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza quebras de linha e espaços múltiplos para comparação de SQL. */
function normalizarSQL(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

/** Captura o SQL da N-ésima chamada (0-based) ao pool.query. */
function sqlDaChamada(n = 0): string {
  const call = mockedQuery.mock.calls[n]
  if (!call) throw new Error(`pool.query não foi chamado ${n + 1} vez(es)`)
  return normalizarSQL(String(call[0]))
}

// ── Constantes de asserção ────────────────────────────────────────────────────

/**
 * Padrão SQL que EXISTIA no divisor variável (Lote 3.1 — versão errada).
 * Exemplo: THEN 1 ELSE 0 END aparecia em blocos como:
 *   CASE WHEN nota_lp IS NOT NULL AND ... > 0 THEN 1 ELSE 0 END + ...
 * Depois do fix esse padrão não deve aparecer nas queries de média.
 */
const PADRAO_DIVISOR_VARIAVEL = /THEN\s+1\s+ELSE\s+0\s+END/i

// ── Parâmetros fictícios comuns ───────────────────────────────────────────────

const PARAMS_CORRECAO = { tipo: 'medias_inconsistentes' as const }
const USUARIO_ID = 'user-qa-001'
const USUARIO_NOME = 'QA Regressão'

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Regressão Lote 3.1 — fórmula de média: divisor fixo em vez de variável', () => {

  beforeEach(() => {
    mockedQuery.mockReset()
    // Padrão: todas as queries retornam rows vazias (caminho não-corretivo)
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCO 1 — corrigirMediasInconsistentes (corretores.ts)
  // ──────────────────────────────────────────────────────────────────────────

  describe('corrigirMediasInconsistentes — SQL enviado ao banco', () => {

    it('usa divisor FIXO /3.0 para anos iniciais (2º, 3º, 5º)', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      expect(sql).toContain('/ 3.0')
    })

    it('usa divisor FIXO /4.0 para anos finais (demais séries)', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      expect(sql).toContain('/ 4.0')
    })

    it('NÃO contém o padrão de divisor variável (THEN 1 ELSE 0 END)', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      expect(sql).not.toMatch(PADRAO_DIVISOR_VARIAVEL)
    })

    it('NÃO usa NULLIF para contar notas > 0 como divisor dinâmico', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      // O SQL canônico pode usar NULLIF em outro contexto (ex: série_numero),
      // mas nunca NULLIF( ... THEN 1 ELSE 0 ... ) como divisor de média.
      // A asserção mais precisa é a ausência do padrão variável acima.
      // Adicionalmente: não pode haver NULLIF logo antes de "/ " calculando média.
      // Isso é coberto indiretamente pela asserção do padrão variável.
      expect(sql).not.toMatch(/NULLIF\s*\(\s*CASE\s+WHEN\s+\S+\s+>\s+0/i)
    })

    it('inclui CASE WHEN IN (2,3,5) para diferenciar séries', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      // getMediaGeralSQL gera CASE WHEN ... IN ('2','3','5') THEN ... ELSE ...
      expect(sql).toMatch(/IN\s*\('2'\s*,\s*'3'\s*,\s*'5'\)/i)
    })

    it('inclui nota_producao no cálculo de anos iniciais', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      expect(sql).toContain('nota_producao')
    })

    it('inclui nota_ch e nota_cn no cálculo de anos finais', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      const sql = sqlDaChamada(0)
      expect(sql).toContain('nota_ch')
      expect(sql).toContain('nota_cn')
    })

    it('retorna sucesso mesmo com zero linhas no banco (sem corrigidos)', async () => {
      const resultado = await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      expect(resultado.sucesso).toBe(true)
      expect(resultado.corrigidos).toBe(0)
      expect(resultado.erros).toBe(0)
    })

    it('pool.query é chamado pelo menos uma vez (SELECT inicial)', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)

      expect(mockedQuery).toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCO 2 — verificarMediasInconsistentes (verificadores-dados.ts)
  // ──────────────────────────────────────────────────────────────────────────

  describe('verificarMediasInconsistentes — SQL enviado ao banco', () => {

    it('usa divisor FIXO /3.0 para anos iniciais', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).toContain('/ 3.0')
    })

    it('usa divisor FIXO /4.0 para anos finais', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).toContain('/ 4.0')
    })

    it('NÃO contém o padrão de divisor variável (THEN 1 ELSE 0 END)', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).not.toMatch(PADRAO_DIVISOR_VARIAVEL)
    })

    it('NÃO usa NULLIF com CASE WHEN > 0 como divisor de média', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).not.toMatch(/NULLIF\s*\(\s*CASE\s+WHEN\s+\S+\s+>\s+0/i)
    })

    it('inclui CASE WHEN IN (2,3,5) para diferenciar séries', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).toMatch(/IN\s*\('2'\s*,\s*'3'\s*,\s*'5'\)/i)
    })

    it('inclui nota_producao no cálculo (anos iniciais)', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).toContain('nota_producao')
    })

    it('inclui nota_ch e nota_cn no cálculo (anos finais)', async () => {
      await verificarMediasInconsistentes()

      const sql = sqlDaChamada(0)
      expect(sql).toContain('nota_ch')
      expect(sql).toContain('nota_cn')
    })

    it('retorna null quando não há divergências (rows vazio)', async () => {
      const resultado = await verificarMediasInconsistentes()

      expect(resultado).toBeNull()
    })

    it('pool.query é chamado exatamente uma vez (sem rows, sem loop)', async () => {
      await verificarMediasInconsistentes()

      expect(mockedQuery).toHaveBeenCalledTimes(1)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCO 3 — Consistência entre os dois módulos
  // ──────────────────────────────────────────────────────────────────────────

  describe('consistência entre corretor e verificador', () => {

    it('ambos usam /3.0 — mesma constante de divisor para anos iniciais', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)
      const sqlCorretor = sqlDaChamada(0)

      mockedQuery.mockReset()
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await verificarMediasInconsistentes()
      const sqlVerificador = sqlDaChamada(0)

      expect(sqlCorretor).toContain('/ 3.0')
      expect(sqlVerificador).toContain('/ 3.0')
    })

    it('ambos usam /4.0 — mesma constante de divisor para anos finais', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)
      const sqlCorretor = sqlDaChamada(0)

      mockedQuery.mockReset()
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await verificarMediasInconsistentes()
      const sqlVerificador = sqlDaChamada(0)

      expect(sqlCorretor).toContain('/ 4.0')
      expect(sqlVerificador).toContain('/ 4.0')
    })

    it('nenhum dos dois contém o padrão variável legado', async () => {
      await corrigirMediasInconsistentes(PARAMS_CORRECAO, USUARIO_ID, USUARIO_NOME)
      const sqlCorretor = sqlDaChamada(0)

      mockedQuery.mockReset()
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await verificarMediasInconsistentes()
      const sqlVerificador = sqlDaChamada(0)

      expect(sqlCorretor).not.toMatch(PADRAO_DIVISOR_VARIAVEL)
      expect(sqlVerificador).not.toMatch(PADRAO_DIVISOR_VARIAVEL)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCO 4 — Sanidade: getMediaGeralSQL gera os divisores corretos
  // ──────────────────────────────────────────────────────────────────────────

  describe('getMediaGeralSQL (lib/sql/media-geral) — divisores canônicos', () => {

    it('gera /3.0 para o ramo de anos iniciais', async () => {
      const { getMediaGeralSQL } = await import('@/lib/sql/media-geral')
      const sql = getMediaGeralSQL('rc')
      expect(sql).toContain('/ 3.0')
    })

    it('gera /4.0 para o ramo de anos finais', async () => {
      const { getMediaGeralSQL } = await import('@/lib/sql/media-geral')
      const sql = getMediaGeralSQL('rc')
      expect(sql).toContain('/ 4.0')
    })

    it('NÃO gera o padrão de divisor variável', async () => {
      const { getMediaGeralSQL } = await import('@/lib/sql/media-geral')
      const sql = getMediaGeralSQL('rc')
      expect(sql).not.toMatch(PADRAO_DIVISOR_VARIAVEL)
    })

    it('diferencia alias — com alias "t" usa t.nota_lp', async () => {
      const { getMediaGeralSQL } = await import('@/lib/sql/media-geral')
      const sql = getMediaGeralSQL('t')
      expect(sql).toContain('t.nota_lp')
      expect(sql).not.toContain('rc.nota_lp')
    })
  })
})
