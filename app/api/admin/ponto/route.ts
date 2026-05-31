/**
 * /api/admin/ponto
 *
 * F5 — Ponto eletronico de servidores escolares.
 *
 * GET ?servidor_id= [&mes=&ano=]  -> lista registros do mes
 * POST                            -> registra/atualiza ponto do dia (upsert por UNIQUE)
 *
 * Acesso: administrador, tecnico, escola (a propria), polo (escolas do polo).
 */
import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const pontoSchema = z.object({
  servidor_id:            z.string().uuid(),
  escola_id:              z.string().uuid().nullable().optional(),
  data:                   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_entrada:           z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  hora_saida:             z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  hora_intervalo_inicio:  z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  hora_intervalo_fim:     z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  tipo:                   z.enum(['normal','falta','falta_justificada','ferias','licenca','feriado','home_office']).default('normal'),
  justificativa:          z.string().max(2000).nullable().optional(),
  origem_registro:        z.enum(['manual','web','app','biometria','facial','qr']).default('manual'),
})

export const GET = withAuthModulo(['administrador','tecnico','escola','polo'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const servidorId = searchParams.get('servidor_id')
  if (!servidorId) {
    return NextResponse.json({ mensagem: 'servidor_id obrigatorio' }, { status: 400 })
  }
  const mes = parseInt(searchParams.get('mes') || '0', 10)
  const ano = parseInt(searchParams.get('ano') || '0', 10)

  const params: any[] = [servidorId]
  let where = 'servidor_id = $1'
  if (mes >= 1 && mes <= 12 && ano >= 2020) {
    params.push(`${ano}-${String(mes).padStart(2, '0')}-01`)
    params.push(`${ano}-${String(mes).padStart(2, '0')}-31`)
    where += ` AND data BETWEEN $2::date AND $3::date`
  }

  const result = await pool.query(
    `SELECT id, servidor_id, escola_id, data, hora_entrada, hora_saida,
            hora_intervalo_inicio, hora_intervalo_fim, tipo, justificativa,
            origem_registro, validado_em, criado_em
       FROM ponto_registros
      WHERE ${where}
      ORDER BY data DESC
      LIMIT 500`,
    params
  )

  return NextResponse.json({ registros: result.rows })
})

export const POST = withAuthModulo(['administrador','tecnico','escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = pontoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data

  // Upsert por UNIQUE(servidor_id, data)
  const result = await pool.query(
    `INSERT INTO ponto_registros (
       servidor_id, escola_id, data, hora_entrada, hora_saida,
       hora_intervalo_inicio, hora_intervalo_fim, tipo, justificativa, origem_registro
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (servidor_id, data) DO UPDATE
        SET hora_entrada = EXCLUDED.hora_entrada,
            hora_saida = EXCLUDED.hora_saida,
            hora_intervalo_inicio = EXCLUDED.hora_intervalo_inicio,
            hora_intervalo_fim = EXCLUDED.hora_intervalo_fim,
            tipo = EXCLUDED.tipo,
            justificativa = EXCLUDED.justificativa,
            origem_registro = EXCLUDED.origem_registro,
            atualizado_em = NOW()
     RETURNING id, criado_em, atualizado_em`,
    [
      d.servidor_id, d.escola_id ?? null, d.data,
      d.hora_entrada ?? null, d.hora_saida ?? null,
      d.hora_intervalo_inicio ?? null, d.hora_intervalo_fim ?? null,
      d.tipo, d.justificativa ?? null, d.origem_registro,
    ]
  )

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'PONTO_REGISTRAR',
    entidade: 'ponto_registros',
    entidadeId: result.rows[0].id,
    detalhes: { servidor_id: d.servidor_id, data: d.data, tipo: d.tipo, origem: d.origem_registro },
  })

  return NextResponse.json(result.rows[0], { status: 200 })
})
