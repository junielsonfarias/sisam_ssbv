/**
 * /api/admin/calendario-eventos
 *
 * GET: lista eventos do calendário escolar (feriados, recessos, reposições, etc)
 *      com filtros (ano_letivo_id, escola_id, tipo, mes) + estatísticas.
 * POST: cria novo evento. Auditoria CALENDARIO_EVENTO_CRIAR.
 * PATCH ?id=: edita evento (diff inteligente). Auditoria CALENDARIO_EVENTO_EDITAR.
 * DELETE ?id=: remove evento. Auditoria CALENDARIO_EVENTO_EXCLUIR.
 *
 * Tabela: calendario_eventos (12 tipos — ver migration add-calendario-escolar-eventos.sql)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = [
  'letivo', 'feriado_nacional', 'feriado_estadual', 'feriado_municipal',
  'feriado_religioso', 'recesso', 'planejamento', 'conselho_classe',
  'reuniao_pais', 'evento_pedagogico', 'paralisacao', 'reposicao',
] as const

const criarSchema = z.object({
  ano_letivo_id: z.string().uuid(),
  escola_id: z.string().uuid().nullable().optional(),
  tipo: z.enum(TIPOS_VALIDOS),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  titulo: z.string().min(2).max(255),
  descricao: z.string().max(2000).nullable().optional(),
  conta_dia_letivo: z.boolean().default(false),
  carga_horaria: z.number().min(0).max(24).default(0),
})

const editarSchema = z.object({
  tipo: z.enum(TIPOS_VALIDOS).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  titulo: z.string().min(2).max(255).optional(),
  descricao: z.string().max(2000).nullable().optional(),
  conta_dia_letivo: z.boolean().optional(),
  carga_horaria: z.number().min(0).max(24).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)

  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  const anoId = searchParams.get('ano_letivo_id')
  if (anoId) { params.push(anoId); conds.push(`e.ano_letivo_id = $${i++}`) }

  const ano = searchParams.get('ano')
  if (ano) { params.push(parseInt(ano, 10)); conds.push(`EXTRACT(YEAR FROM e.data) = $${i++}`) }

  const escola = searchParams.get('escola_id')
  if (escola === 'geral') {
    conds.push(`e.escola_id IS NULL`)
  } else if (escola) {
    params.push(escola); conds.push(`(e.escola_id = $${i++} OR e.escola_id IS NULL)`)
  }

  const tipo = searchParams.get('tipo')
  if (tipo && (TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
    params.push(tipo); conds.push(`e.tipo = $${i++}`)
  }

  const mes = searchParams.get('mes')
  if (mes) {
    params.push(parseInt(mes, 10))
    conds.push(`EXTRACT(MONTH FROM e.data) = $${i++}`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const r = await pool.query(
    `SELECT e.id, e.ano_letivo_id, e.escola_id, e.tipo, e.data, e.titulo,
            e.descricao, e.conta_dia_letivo, e.carga_horaria, e.criado_em,
            a.nome AS ano_letivo_nome,
            esc.nome AS escola_nome
       FROM calendario_eventos e
       LEFT JOIN anos_letivos a ON a.id = e.ano_letivo_id
       LEFT JOIN escolas esc ON esc.id = e.escola_id
       ${where}
      ORDER BY e.data ASC
      LIMIT 1000`,
    params
  )

  // Estatísticas (filtradas pelo mesmo where, exceto o LIMIT)
  const statsR = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE tipo LIKE 'feriado_%') AS feriados,
       COUNT(*) FILTER (WHERE tipo = 'recesso') AS recessos,
       COUNT(*) FILTER (WHERE tipo = 'reposicao') AS reposicoes,
       COUNT(*) FILTER (WHERE tipo = 'planejamento') AS planejamentos,
       COUNT(*) FILTER (WHERE tipo IN ('conselho_classe', 'reuniao_pais', 'evento_pedagogico')) AS pedagogicos,
       COUNT(*) FILTER (WHERE conta_dia_letivo = TRUE) AS dias_letivos_extras,
       COUNT(*) FILTER (WHERE escola_id IS NULL) AS gerais,
       COUNT(*) FILTER (WHERE escola_id IS NOT NULL) AS especificos
     FROM calendario_eventos e
     ${where}`,
    params
  )

  return NextResponse.json({
    eventos: r.rows,
    estatisticas: {
      total: parseInt(statsR.rows[0]?.total || '0', 10),
      feriados: parseInt(statsR.rows[0]?.feriados || '0', 10),
      recessos: parseInt(statsR.rows[0]?.recessos || '0', 10),
      reposicoes: parseInt(statsR.rows[0]?.reposicoes || '0', 10),
      planejamentos: parseInt(statsR.rows[0]?.planejamentos || '0', 10),
      pedagogicos: parseInt(statsR.rows[0]?.pedagogicos || '0', 10),
      dias_letivos_extras: parseInt(statsR.rows[0]?.dias_letivos_extras || '0', 10),
      gerais: parseInt(statsR.rows[0]?.gerais || '0', 10),
      especificos: parseInt(statsR.rows[0]?.especificos || '0', 10),
    },
  })
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = criarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  try {
    const r = await pool.query(
      `INSERT INTO calendario_eventos
         (ano_letivo_id, escola_id, tipo, data, titulo, descricao, conta_dia_letivo, carga_horaria)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, ano_letivo_id, escola_id, tipo, data, titulo, descricao,
                 conta_dia_letivo, carga_horaria, criado_em`,
      [
        d.ano_letivo_id, d.escola_id || null, d.tipo, d.data, d.titulo,
        d.descricao || null, d.conta_dia_letivo, d.carga_horaria,
      ]
    )

    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: 'CALENDARIO_EVENTO_CRIAR',
      entidade: 'calendario_eventos',
      entidadeId: r.rows[0].id,
      detalhes: {
        tipo: d.tipo,
        data: d.data,
        escola_id: d.escola_id || null,
        conta_dia_letivo: d.conta_dia_letivo,
      },
    })

    return NextResponse.json(r.rows[0], { status: 201 })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe evento para esta data (ano + escola + data deve ser único)' },
        { status: 409 }
      )
    }
    if (code === '23503') {
      return NextResponse.json({ mensagem: 'Ano letivo ou escola inválida' }, { status: 400 })
    }
    throw e
  }
})

export const PATCH = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = editarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  const anterior = await pool.query(
    `SELECT tipo, data, titulo, descricao, conta_dia_letivo, carga_horaria
       FROM calendario_eventos WHERE id = $1`,
    [id]
  )
  if (anterior.rowCount === 0) {
    return NextResponse.json({ mensagem: 'Evento não encontrado' }, { status: 404 })
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  const diff: Record<string, { de: unknown; para: unknown }> = {}

  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue
    sets.push(`${k} = $${i++}`)
    vals.push(v)
    const valorAnterior = (anterior.rows[0] as Record<string, unknown>)[k]
    const a = valorAnterior instanceof Date ? valorAnterior.toISOString().slice(0, 10) : valorAnterior
    if (a !== v) diff[k] = { de: a ?? null, para: v }
  }

  if (sets.length === 0) {
    return NextResponse.json({ mensagem: 'Nada a atualizar' }, { status: 400 })
  }

  vals.push(id)
  try {
    const r = await pool.query(
      `UPDATE calendario_eventos SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, ano_letivo_id, escola_id, tipo, data, titulo, descricao, conta_dia_letivo, carga_horaria`,
      vals
    )

    if (Object.keys(diff).length > 0) {
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'CALENDARIO_EVENTO_EDITAR',
        entidade: 'calendario_eventos',
        entidadeId: id,
        detalhes: { diff },
      })
    }

    return NextResponse.json(r.rows[0])
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe evento nessa data para mesma escola/ano' },
        { status: 409 }
      )
    }
    throw e
  }
})

export const DELETE = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })

  const r = await pool.query(
    `DELETE FROM calendario_eventos WHERE id = $1 RETURNING tipo, data`,
    [id]
  )
  if (r.rowCount === 0) {
    return NextResponse.json({ mensagem: 'Evento não encontrado' }, { status: 404 })
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'CALENDARIO_EVENTO_EXCLUIR',
    entidade: 'calendario_eventos',
    entidadeId: id,
    detalhes: {
      tipo: r.rows[0].tipo,
      data: r.rows[0].data instanceof Date ? r.rows[0].data.toISOString().slice(0, 10) : r.rows[0].data,
    },
  })

  return NextResponse.json({ mensagem: 'Evento removido' })
})
