import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const registrarSchema = z.object({
  token: z.string().min(10).max(500),
  plataforma: z.enum(['web', 'android', 'ios']).default('web'),
  navegador: z.string().max(50).optional(),
})

/**
 * POST /api/push/registrar
 * Registra token FCM do dispositivo do usuario logado
 */
export const POST = withAuth(async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = registrarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Token invalido' }, { status: 400 })
    }

    const { token, plataforma, navegador } = parsed.data

    // Upsert: se token ja existe, atualiza usuario e ultimo uso
    await pool.query(
      `INSERT INTO dispositivos_push (usuario_id, token, plataforma, navegador, ultimo_uso)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (token) DO UPDATE SET
         usuario_id = $1,
         plataforma = $3,
         navegador = $4,
         ultimo_uso = NOW(),
         ativo = true,
         atualizado_em = NOW()`,
      [usuario.id, token, plataforma, navegador || null]
    )

    return NextResponse.json({ sucesso: true })
  } catch (error: unknown) {
    console.error('Erro ao registrar token push:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
