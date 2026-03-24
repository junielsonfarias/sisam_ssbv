import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'

// ============================================================================
// Cache em memória para dados que não mudam durante lançamento de notas
// (turma, config) — evita queries repetitivas de 70 professores simultâneos
// ============================================================================
const turmaCache = new Map<string, { data: any; expiresAt: number }>()
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
         registrado_por = EXCLUDED.registrado_por,
         turma_id = EXCLUDED.turma_id`,
      values
    )

    return result.rowCount || 0
  })

  return { processados, erros }
}
