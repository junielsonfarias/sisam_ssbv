import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const gerarSchema = z.object({
  turma_id: z.string().uuid(),
  validade_minutos: z.number().min(5).max(120).default(30),
})

/**
 * POST /api/presenca-qr/gerar
 * Professor gera QR code temporário para a turma
 * Retorna um token único com validade configurável
 */
export const POST = withAuth(['professor', 'escola', 'administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = gerarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }

    const { turma_id, validade_minutos } = parsed.data

    // Verificar que a turma existe
    const turmaResult = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, e.nome AS escola_nome, e.id AS escola_id
       FROM turmas t
       INNER JOIN escolas e ON t.escola_id = e.id
       WHERE t.id = $1`,
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma nao encontrada' }, { status: 404 })
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex')
    const data = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const expiraEm = new Date(Date.now() + validade_minutos * 60 * 1000)

    // Salvar token no banco (invalidar tokens anteriores da mesma turma/dia)
    await pool.query(
      `UPDATE qr_presenca SET ativo = false
       WHERE turma_id = $1 AND data = $2`,
      [turma_id, data]
    )

    await pool.query(
      `INSERT INTO qr_presenca (turma_id, token, data, gerado_por, expira_em)
       VALUES ($1, $2, $3, $4, $5)`,
      [turma_id, token, data, usuario.id, expiraEm]
    )

    const turma = turmaResult.rows[0]

    // URL que o aluno vai escanear
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const url = `${baseUrl}/presenca?t=${token}`

    return NextResponse.json({
      token,
      url,
      turma: {
        id: turma.id,
        codigo: turma.codigo,
        nome: turma.nome,
        serie: turma.serie,
        escola_nome: turma.escola_nome,
      },
      data,
      expira_em: expiraEm.toISOString(),
      validade_minutos,
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar QR presenca:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
