/**
 * /api/admin/documentos
 *
 * GET: lista documentos emitidos com filtros (escola, aluno, tipo, status, busca)
 * PATCH ?id=: cancela documento (status='cancelado' + motivo)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { cancelarDocumento } from '@/lib/services/documentos.service'

export const dynamic = 'force-dynamic'

const cancelarSchema = z.object({
  motivo: z.string().min(5).max(2000),
})

const TIPOS = [
  'historico_escolar', 'guia_transferencia',
  'declaracao_matricula', 'declaracao_frequencia', 'declaracao_conclusao', 'declaracao_transferencia',
  'boletim_escolar', 'certificado_eja',
] as const

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)

  // Filtros opcionais
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  const escola = searchParams.get('escola')
  if (escola) { params.push(escola); conds.push(`d.escola_id = $${i++}`) }

  const aluno = searchParams.get('aluno')
  if (aluno) { params.push(aluno); conds.push(`d.aluno_id = $${i++}`) }

  const tipo = searchParams.get('tipo')
  if (tipo && (TIPOS as readonly string[]).includes(tipo)) {
    params.push(tipo); conds.push(`d.tipo = $${i++}`)
  }

  const status = searchParams.get('status')
  if (status) { params.push(status); conds.push(`d.status = $${i++}`) }

  const codigo = searchParams.get('codigo')
  if (codigo && codigo.trim().length >= 3) {
    params.push(codigo.trim().toUpperCase())
    conds.push(`d.codigo_validacao ILIKE '%' || $${i++} || '%'`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(parseInt(searchParams.get('limite') || '50', 10), 200)
  params.push(limite)

  const r = await pool.query(
    `SELECT d.id, d.codigo_validacao, d.tipo, d.status, d.emitido_em,
            d.escola_nome_snapshot, d.vezes_validado, d.ultima_validacao,
            d.cancelado_em, d.motivo_cancelamento,
            a.nome AS aluno_nome, a.matricula AS aluno_matricula,
            u.nome AS emitido_por_nome
       FROM documentos_emitidos d
       LEFT JOIN alunos a ON a.id = d.aluno_id
       LEFT JOIN usuarios u ON u.id = d.emitido_por
       ${where}
      ORDER BY d.emitido_em DESC
      LIMIT $${i}`,
    params
  )

  // Estatísticas paralelas
  const statsR = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'ativo') AS ativos,
       COUNT(*) FILTER (WHERE status = 'cancelado') AS cancelados,
       SUM(vezes_validado) AS total_validacoes
     FROM documentos_emitidos`
  )

  return NextResponse.json({
    documentos: r.rows,
    estatisticas: {
      total: parseInt(statsR.rows[0]?.total || '0', 10),
      ativos: parseInt(statsR.rows[0]?.ativos || '0', 10),
      cancelados: parseInt(statsR.rows[0]?.cancelados || '0', 10),
      total_validacoes: parseInt(statsR.rows[0]?.total_validacoes || '0', 10),
    },
  })
})

export const PATCH = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = cancelarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  const ok = await cancelarDocumento({
    id,
    canceladoPor: usuario.id,
    motivo: parsed.data.motivo,
  })
  if (!ok) {
    return NextResponse.json({ mensagem: 'Documento não encontrado ou já cancelado' }, { status: 404 })
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'DOCUMENTO_CANCELAR',
    entidade: 'documentos_emitidos',
    entidadeId: id,
    detalhes: { motivo: parsed.data.motivo },
  })

  return NextResponse.json({ mensagem: 'Documento cancelado' })
})
