import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'

/**
 * Indica se o ano letivo da rede está FINALIZADO (`anos_letivos.status`).
 * Quando finalizado, o lançamento/alteração de notas é bloqueado — o resultado
 * consolidado não pode mais ser alterado. Usado pelos endpoints de notas
 * (admin e professor) para retornar 403.
 */
export async function anoLetivoFinalizado(anoLetivo: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT status FROM anos_letivos WHERE ano = $1 LIMIT 1`,
    [anoLetivo]
  )
  return r.rows[0]?.status === 'finalizado'
}

// ============================================================================
// Cache em memória para dados que não mudam durante lançamento de notas
// (turma, config) — evita queries repetitivas de 70 professores simultâneos
// ============================================================================
const turmaCache = new Map<string, { data: { escola_id: string; ano_letivo: string; serie?: string; [key: string]: unknown } | null; expiresAt: number }>()
const configCache = new Map<string, { data: ConfigNotas; expiresAt: number }>()
const CACHE_TTL = 60_000 // 60 segundos

// ============================================================================
// Service de Notas — lógica compartilhada entre admin e professor
// ============================================================================

interface NotaInput {
  aluno_id: string
  nota?: number | null
  nota_recuperacao?: number | null
  faltas?: number
  observacao?: string | null
  conceito?: string | null
  parecer_descritivo?: string | null
}

interface ConfigNotas {
  nota_maxima: number
  media_aprovacao: number
  permite_recuperacao: boolean
  peso_avaliacao?: number
  peso_recuperacao?: number
}

// ============================================================================
// Trilha de alteração de notas (Fase 3.2)
// ============================================================================

interface NotaSnapshot {
  nota: number | null
  nota_recuperacao: number | null
  nota_final: number | null
}

interface LinhaAuditoriaNota {
  aluno_id: string
  acao: 'lancamento' | 'alteracao'
  nota_anterior: number | null
  nota_nova: number | null
  nota_recuperacao_anterior: number | null
  nota_recuperacao_nova: number | null
  nota_final_anterior: number | null
  nota_final_nova: number | null
}

function _num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

function _igual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return Math.abs(a - b) < 0.001
}

/**
 * Diferença "de-para" entre as notas anteriores e as novas, para auditoria.
 * Pura/testável. Retorna só as linhas que REALMENTE mudaram:
 *  - sem registro anterior + algum valor não-nulo → 'lancamento'
 *  - registro anterior com algum campo diferente   → 'alteracao'
 *  - sem alteração efetiva (UPSERT no-op)           → ignorado
 */
export function montarAuditoriaNotas(
  anteriores: Map<string, NotaSnapshot>,
  novas: Array<{ aluno_id: string; nota: number | null; nota_recuperacao: number | null; nota_final: number | null }>
): LinhaAuditoriaNota[] {
  const linhas: LinhaAuditoriaNota[] = []
  for (const nv of novas) {
    const nNota = _num(nv.nota)
    const nRec = _num(nv.nota_recuperacao)
    const nFin = _num(nv.nota_final)
    const ant = anteriores.get(nv.aluno_id)

    if (!ant) {
      if (nNota === null && nRec === null && nFin === null) continue
      linhas.push({
        aluno_id: nv.aluno_id, acao: 'lancamento',
        nota_anterior: null, nota_nova: nNota,
        nota_recuperacao_anterior: null, nota_recuperacao_nova: nRec,
        nota_final_anterior: null, nota_final_nova: nFin,
      })
    } else {
      const aNota = _num(ant.nota)
      const aRec = _num(ant.nota_recuperacao)
      const aFin = _num(ant.nota_final)
      if (_igual(aNota, nNota) && _igual(aRec, nRec) && _igual(aFin, nFin)) continue
      linhas.push({
        aluno_id: nv.aluno_id, acao: 'alteracao',
        nota_anterior: aNota, nota_nova: nNota,
        nota_recuperacao_anterior: aRec, nota_recuperacao_nova: nRec,
        nota_final_anterior: aFin, nota_final_nova: nFin,
      })
    }
  }
  return linhas
}

/**
 * Calcula nota_final com base em nota, recuperação e config.
 * Lógica centralizada — usada por admin e professor.
 *
 * Se pesos estão configurados (peso_avaliacao + peso_recuperacao = 1):
 *   nota_final = (nota * peso_avaliacao) + (recuperacao * peso_recuperacao)
 * Senão: usa regra "maior nota" (substituição simples)
 */
export function calcularNotaFinal(
  nota: number | null | undefined,
  notaRecuperacao: number | null | undefined,
  config: ConfigNotas
): number | null {
  if (nota === null || nota === undefined) return null

  const notaNum = typeof nota === 'number' ? nota : parseFloat(String(nota))
  if (isNaN(notaNum)) return null

  let notaFinal = Math.max(0, notaNum)

  if (notaRecuperacao !== null && notaRecuperacao !== undefined && config.permite_recuperacao) {
    const recNum = typeof notaRecuperacao === 'number' ? notaRecuperacao : parseFloat(String(notaRecuperacao))
    if (!isNaN(recNum)) {
      const pesoAv = config.peso_avaliacao
      const pesoRec = config.peso_recuperacao

      if (pesoAv && pesoRec && Math.abs((pesoAv + pesoRec) - 1) < 0.01) {
        // Usar fórmula com pesos: nota_final = (nota * peso) + (rec * peso)
        notaFinal = (notaNum * pesoAv) + (recNum * pesoRec)
      } else {
        // Sem pesos: usar maior nota (substituição simples)
        if (recNum > notaFinal) {
          notaFinal = recNum
        }
      }
    }
  }

  notaFinal = Math.max(0, Math.min(notaFinal, config.nota_maxima))
  notaFinal = Math.round(notaFinal * 100) / 100

  return isNaN(notaFinal) ? null : notaFinal
}

/**
 * Busca config de notas de uma escola/ano
 */
/**
 * Busca config de notas de uma escola/ano (com cache de 60s)
 */
export async function buscarConfigNotas(escolaId: string, anoLetivo: string): Promise<ConfigNotas> {
  const cacheKey = `${escolaId}:${anoLetivo}`
  const cached = configCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const result = await pool.query(
    'SELECT nota_maxima, media_aprovacao, permite_recuperacao, peso_avaliacao, peso_recuperacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
    [escolaId, anoLetivo]
  )
  let config: ConfigNotas
  if (result.rows.length > 0) {
    config = {
      nota_maxima: parseFloat(result.rows[0].nota_maxima) || 10,
      media_aprovacao: parseFloat(result.rows[0].media_aprovacao) || 6,
      permite_recuperacao: result.rows[0].permite_recuperacao ?? true,
      peso_avaliacao: result.rows[0].peso_avaliacao ? parseFloat(result.rows[0].peso_avaliacao) : undefined,
      peso_recuperacao: result.rows[0].peso_recuperacao ? parseFloat(result.rows[0].peso_recuperacao) : undefined,
    }
  } else {
    config = { nota_maxima: 10, media_aprovacao: 6, permite_recuperacao: true }
  }

  configCache.set(cacheKey, { data: config, expiresAt: Date.now() + CACHE_TTL })
  return config
}

/**
 * Invalida o cache em memória de config de notas (Map por `${escolaId}:${anoLetivo}`).
 * Deve ser chamada após qualquer mutação em `configuracao_notas_escola` — junto
 * com o `cacheDelPattern('config:*')` do Redis — para evitar que professores
 * lancem notas com config antiga dentro da janela de TTL (60s).
 *
 * - Com `escolaId` e `anoLetivo`: remove apenas a chave específica.
 * - Sem argumentos: limpa todo o cache (caso simples e seguro, ex.: DELETE
 *   por id, onde a chave não é derivável diretamente).
 *
 * Usado por: app/api/admin/configuracao-notas (POST/PUT/DELETE)
 */
export function invalidarCacheConfigNotas(escolaId?: string, anoLetivo?: string): void {
  if (escolaId && anoLetivo) {
    configCache.delete(`${escolaId}:${anoLetivo}`)
  } else {
    configCache.clear()
  }
}

/**
 * Busca notas de alunos para uma turma/disciplina/período
 */
export async function buscarNotas(turmaId: string, disciplinaId: string, periodoId: string) {
  const result = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo,
            n.id as nota_id, n.nota, n.nota_recuperacao, n.nota_final,
            n.faltas, n.observacao, n.conceito, n.parecer_descritivo,
            n.registrado_por
     FROM alunos a
     LEFT JOIN notas_escolares n ON n.aluno_id = a.id AND n.disciplina_id = $2 AND n.periodo_id = $3
     WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
     ORDER BY a.nome`,
    [turmaId, disciplinaId, periodoId]
  )
  return result.rows
}

/**
 * Busca turma com escola_id e ano_letivo (com cache de 60s)
 */
export async function buscarTurma(turmaId: string) {
  const cached = turmaCache.get(turmaId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const result = await pool.query(
    'SELECT id, escola_id, ano_letivo, serie FROM turmas WHERE id = $1',
    [turmaId]
  )
  const data = result.rows[0] || null
  if (data) turmaCache.set(turmaId, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}

/**
 * Grava a trilha de alteração de notas em lote (multi-row INSERT).
 * NÃO-FATAL: qualquer erro (inclusive tabela ainda inexistente) é engolido —
 * o lançamento de notas nunca pode ser bloqueado pela auditoria. Por isso é
 * chamado FORA da transação principal, após o COMMIT.
 */
async function registrarAuditoriaNotas(
  linhas: LinhaAuditoriaNota[],
  meta: { disciplinaId: string | null; periodoId: string; turmaId: string; escolaId: string; anoLetivo: string; registradoPor: string }
): Promise<void> {
  if (linhas.length === 0) return
  try {
    const COLS = 14
    const placeholders: string[] = []
    const values: (string | number | null)[] = []
    for (let i = 0; i < linhas.length; i++) {
      const o = i * COLS
      placeholders.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13},$${o + 14})`)
      const l = linhas[i]
      values.push(
        l.aluno_id, meta.disciplinaId, meta.periodoId, meta.turmaId, meta.escolaId, meta.anoLetivo,
        l.acao,
        l.nota_anterior, l.nota_nova,
        l.nota_recuperacao_anterior, l.nota_recuperacao_nova,
        l.nota_final_anterior, l.nota_final_nova,
        meta.registradoPor
      )
    }
    await pool.query(
      `INSERT INTO notas_escolares_auditoria
         (aluno_id, disciplina_id, periodo_id, turma_id, escola_id, ano_letivo,
          acao, nota_anterior, nota_nova, nota_recuperacao_anterior,
          nota_recuperacao_nova, nota_final_anterior, nota_final_nova, alterado_por)
       VALUES ${placeholders.join(', ')}`,
      values
    )
  } catch {
    // Auditoria nunca bloqueia o lançamento (tabela pode não existir ainda).
  }
}

/**
 * Lança notas em lote (UPSERT) para uma turma/disciplina/período.
 * Usa batch multi-row INSERT para reduzir ocupação de conexão
 * (1 query em vez de N individuais — crítico para 70+ professores simultâneos).
 */
export async function lancarNotas(params: {
  turmaId: string
  disciplinaId: string | null
  periodoId: string
  escolaId: string
  anoLetivo: string
  notas: NotaInput[]
  config: ConfigNotas
  registradoPor: string
  tipoAvaliacaoId?: string | null
}): Promise<{ processados: number; erros: Array<{ aluno_id: string; mensagem: string }> }> {
  const { turmaId, disciplinaId, periodoId, escolaId, anoLetivo, notas, config, registradoPor, tipoAvaliacaoId } = params

  // 1. Validar e preparar todas as notas ANTES da transação (sem usar conexão)
  const erros: Array<{ aluno_id: string; mensagem: string }> = []
  const validas: Array<{
    aluno_id: string; nota: number | null; nota_recuperacao: number | null;
    nota_final: number | null; faltas: number; observacao: string | null;
    conceito: string | null; parecer_descritivo: string | null;
  }> = []

  for (const item of notas) {
    if (item.nota !== null && item.nota !== undefined && item.nota > config.nota_maxima) {
      erros.push({ aluno_id: item.aluno_id, mensagem: `Nota ${item.nota} excede o máximo (${config.nota_maxima})` })
      continue
    }
    if (item.nota_recuperacao !== null && item.nota_recuperacao !== undefined && item.nota_recuperacao > config.nota_maxima) {
      erros.push({ aluno_id: item.aluno_id, mensagem: `Nota recuperação ${item.nota_recuperacao} excede o máximo (${config.nota_maxima})` })
      continue
    }
    if (item.faltas !== undefined && item.faltas < 0) {
      erros.push({ aluno_id: item.aluno_id, mensagem: 'Faltas não podem ser negativas' })
      continue
    }

    validas.push({
      aluno_id: item.aluno_id,
      nota: item.nota ?? null,
      nota_recuperacao: item.nota_recuperacao ?? null,
      nota_final: calcularNotaFinal(item.nota, item.nota_recuperacao, config),
      faltas: item.faltas ?? 0,
      observacao: item.observacao ?? null,
      conceito: item.conceito ?? null,
      parecer_descritivo: item.parecer_descritivo ?? null,
    })
  }

  if (validas.length === 0) {
    return { processados: 0, erros }
  }

  // 1b. Snapshot das notas ANTERIORES (para a trilha de alteração — Fase 3.2).
  // Uma única query batched; IS NOT DISTINCT FROM trata disciplina_id nula.
  // Não-fatal: se falhar, segue sem auditoria (não bloqueia o lançamento).
  const anteriores = new Map<string, NotaSnapshot>()
  try {
    const alunoIds = validas.map(v => v.aluno_id)
    const prev = await pool.query(
      `SELECT aluno_id, nota, nota_recuperacao, nota_final
         FROM notas_escolares
        WHERE periodo_id = $1 AND aluno_id = ANY($2)
          AND disciplina_id IS NOT DISTINCT FROM $3`,
      [periodoId, alunoIds, disciplinaId]
    )
    for (const row of prev.rows) {
      anteriores.set(row.aluno_id, {
        nota: row.nota, nota_recuperacao: row.nota_recuperacao, nota_final: row.nota_final,
      })
    }
  } catch { /* segue sem snapshot */ }

  // 2. Batch INSERT em 1 query (reduz ocupação de conexão de ~265ms para ~15ms)
  const processados = await withTransaction(async (client) => {
    // Construir multi-row VALUES: ($1,$2,...,$15), ($16,$17,...,$30), ...
    const COLS_PER_ROW = 15
    const placeholders: string[] = []
    const values: (string | number | boolean | null)[] = []

    for (let i = 0; i < validas.length; i++) {
      const offset = i * COLS_PER_ROW
      placeholders.push(
        `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10},$${offset + 11},$${offset + 12},$${offset + 13},$${offset + 14},$${offset + 15})`
      )
      const v = validas[i]
      values.push(
        v.aluno_id, disciplinaId, periodoId, escolaId, anoLetivo, turmaId,
        v.nota, v.nota_recuperacao, v.nota_final,
        v.faltas, v.observacao,
        v.conceito, v.parecer_descritivo,
        tipoAvaliacaoId || null, registradoPor
      )
    }

    const result = await client.query(
      `INSERT INTO notas_escolares
         (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id,
          nota, nota_recuperacao, nota_final, faltas, observacao,
          conceito, parecer_descritivo, tipo_avaliacao_id, registrado_por)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (aluno_id, disciplina_id, periodo_id)
       DO UPDATE SET
         nota = EXCLUDED.nota,
         nota_recuperacao = EXCLUDED.nota_recuperacao,
         nota_final = EXCLUDED.nota_final,
         faltas = EXCLUDED.faltas,
         observacao = EXCLUDED.observacao,
         conceito = EXCLUDED.conceito,
         parecer_descritivo = EXCLUDED.parecer_descritivo,
         tipo_avaliacao_id = EXCLUDED.tipo_avaliacao_id,
         registrado_por = EXCLUDED.registrado_por`,
      values
    )

    return result.rowCount || 0
  })

  // 3. Trilha de alteração (após o COMMIT, não-fatal — Fase 3.2)
  const linhasAuditoria = montarAuditoriaNotas(anteriores, validas)
  await registrarAuditoriaNotas(linhasAuditoria, {
    disciplinaId, periodoId, turmaId, escolaId, anoLetivo, registradoPor,
  })

  return { processados, erros }
}
